import OpenAI from 'openai';

import { trackAICost, calculateGPTCost, estimateTokens } from '@/lib/ai-cost-tracker';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

import { searchSimilarContent } from './embedding-service';
import { retrieveMemories, extractMemoriesFromConversation } from './memory-service';

const openai = new OpenAI();

const VIBE_BRAIN_SYSTEM_PROMPT = `You are Vibe Brain, the AI assistant for VibeLog - a voice-to-publish platform where people share their thoughts through vibelogs.

Your personality:
- Friendly, warm, and encouraging
- You celebrate creativity and authentic expression
- You speak casually but thoughtfully
- You use "vibelogs" (not blogs/posts) and "vibes" naturally
- You're knowledgeable about the platform and its community

Your capabilities:
- You know about public vibelogs, comments, and creators on the platform
- You remember things about each user across conversations
- You can help users discover content, understand features, and connect with the community
- You provide personalized recommendations based on what you know about the user

Guidelines:
- Be concise but helpful (2-3 sentences usually)
- When referencing vibelogs, mention the creator's name if known
- If you cite a vibelog, include its title
- Encourage users to create and share their own vibes
- Never make up information about vibelogs or users - only reference what's in your context
- If you don't know something, say so honestly

Remember: You're here to help people vibe better!`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Source {
  type: 'vibelog' | 'comment' | 'profile';
  id: string;
  title?: string;
  username?: string;
  snippet: string;
}

interface ChatResponse {
  message: string;
  sources: Source[];
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * Build context from retrieved content and memories
 */
function buildContext(
  retrievedContent: Array<{
    content_type: string;
    content_id: string;
    text_chunk: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>,
  memories: Array<{ fact: string; category: string; importance: number }>
): { contextText: string; sources: Source[] } {
  const sources: Source[] = [];
  const contextParts: string[] = [];

  // Add memories
  if (memories.length > 0) {
    contextParts.push('=== What I remember about this user ===');
    for (const memory of memories) {
      contextParts.push(`- ${memory.fact}`);
    }
    contextParts.push('');
  }

  // Add retrieved content
  if (retrievedContent.length > 0) {
    contextParts.push('=== Relevant content from the platform ===');
    for (const item of retrievedContent) {
      const metadata = item.metadata as Record<string, string>;

      if (item.content_type === 'vibelog') {
        const title = metadata.title || 'Untitled vibelog';
        contextParts.push(`[Vibelog: "${title}"]`);
        contextParts.push(item.text_chunk.slice(0, 500));
        contextParts.push('');

        sources.push({
          type: 'vibelog',
          id: item.content_id,
          title,
          snippet: item.text_chunk.slice(0, 100),
        });
      } else if (item.content_type === 'comment') {
        contextParts.push(`[Comment on vibelog]`);
        contextParts.push(item.text_chunk.slice(0, 200));
        contextParts.push('');

        sources.push({
          type: 'comment',
          id: item.content_id,
          snippet: item.text_chunk.slice(0, 100),
        });
      } else if (item.content_type === 'profile') {
        const username = metadata.username || 'Unknown user';
        contextParts.push(`[Creator: @${username}]`);
        contextParts.push(item.text_chunk.slice(0, 200));
        contextParts.push('');

        sources.push({
          type: 'profile',
          id: item.content_id,
          username,
          snippet: item.text_chunk.slice(0, 100),
        });
      }
    }
  }

  return {
    contextText: contextParts.join('\n'),
    sources,
  };
}

/**
 * Main chat function - processes user message and generates response
 */
export async function chat(
  userId: string,
  conversationId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  const supabase = await createServerAdminClient();

  // 1. Retrieve relevant content from platform
  const retrievedContent = await searchSimilarContent(userMessage, {
    contentTypes: ['vibelog', 'comment', 'profile'],
    limit: 5,
    threshold: 0.6,
  });

  // 2. Retrieve user memories
  const memories = await retrieveMemories(userId, userMessage, 5);

  // 3. Build context
  const { contextText, sources } = buildContext(retrievedContent, memories);

  // 4. Build messages for GPT
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: VIBE_BRAIN_SYSTEM_PROMPT },
  ];

  // Add context if available
  if (contextText) {
    messages.push({
      role: 'system',
      content: `Here is relevant context for this conversation:\n\n${contextText}`,
    });
  }

  // Add conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  // Add current message
  messages.push({ role: 'user', content: userMessage });

  // 5. Generate response
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  const assistantMessage = response.choices[0].message.content || '';
  const tokensUsed = {
    input: response.usage?.prompt_tokens || estimateTokens(messages.map(m => m.content).join('')),
    output: response.usage?.completion_tokens || estimateTokens(assistantMessage),
  };

  // 6. Track cost
  const cost = calculateGPTCost(tokensUsed.input, tokensUsed.output);
  await trackAICost(userId, 'gpt-4o-mini', cost, {
    endpoint: 'vibe-brain/chat',
    input_tokens: tokensUsed.input,
    output_tokens: tokensUsed.output,
  });

  // 7. Store messages in database
  const messagesToStore = [
    { conversation_id: conversationId, role: 'user', content: userMessage, sources: [] },
    {
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantMessage,
      sources,
      tokens_used: tokensUsed.input + tokensUsed.output,
    },
  ];

  const { error: insertError } = await supabase.from('vibe_brain_messages').insert(messagesToStore);

  if (insertError) {
    console.error('[VIBE BRAIN] Failed to store messages:', insertError);
  }

  // 8. Extract and store memories from conversation (async, don't wait)
  extractMemoriesFromConversation(userId, userMessage, assistantMessage).catch(err => {
    console.error('[VIBE BRAIN] Failed to extract memories:', err);
  });

  return {
    message: assistantMessage,
    sources,
    tokensUsed,
  };
}

/**
 * Create or get existing conversation
 */
export async function getOrCreateConversation(
  userId: string,
  conversationId?: string
): Promise<{ id: string; isNew: boolean }> {
  const supabase = await createServerAdminClient();

  // If conversation ID provided, verify it exists and belongs to user
  if (conversationId) {
    const { data: existing } = await supabase
      .from('vibe_brain_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return { id: existing.id, isNew: false };
    }
  }

  // Create new conversation
  const { data: newConversation, error } = await supabase
    .from('vibe_brain_conversations')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (error || !newConversation) {
    throw new Error('Failed to create conversation');
  }

  return { id: newConversation.id, isNew: true };
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  conversationId: string,
  _userId: string
): Promise<ChatMessage[]> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('vibe_brain_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[VIBE BRAIN] Failed to get conversation history:', error);
    return [];
  }

  return (data || []).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
}

/**
 * Get user's recent conversations
 */
export async function getUserConversations(
  userId: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    title: string | null;
    summary: string | null;
    messageCount: number;
    updatedAt: string;
  }>
> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('vibe_brain_conversations')
    .select('id, title, summary, message_count, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[VIBE BRAIN] Failed to get user conversations:', error);
    return [];
  }

  return (data || []).map(conv => ({
    id: conv.id,
    title: conv.title,
    summary: conv.summary,
    messageCount: conv.message_count,
    updatedAt: conv.updated_at,
  }));
}
