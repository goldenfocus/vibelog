import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { trackAICost, calculateGPTCost, estimateTokens } from '@/lib/ai-cost-tracker';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

import { getAllMemories, extractMemoriesFromConversation } from './memory-service';
import { getUserProfile, type UserProfile } from './platform-queries';
import { executeTool } from './tool-executor';
import { VIBE_BRAIN_TOOLS } from './tools';

const openai = new OpenAI();

const VIBE_BRAIN_SYSTEM_PROMPT = `You are Vibe Brain - the intelligent AI that powers VibeLog, a voice-to-publish platform where people share authentic thoughts through vibelogs.

## Your Identity
You are THE brain of VibeLog. You have REAL access to the platform database through tools. You can search vibelogs, find users, get trending content, and answer any question about the platform with real data.

## Your Personality
- Intelligent and articulate, but warm and approachable
- You speak with confidence because you CAN query real data
- Witty and engaging, not robotic or overly formal
- You use "vibelogs" and "vibes" naturally
- You recognize and appreciate your users, especially creators

## Tools Available
You have access to tools that query the live database:
- searchVibelogs: Search vibelogs by keyword/topic
- getVibelog: Get full details of a specific vibelog
- searchUsers: Find users by username/name
- getUserVibelogs: Get all vibelogs by a specific user
- getTrending: Get trending/recent vibelogs (ALWAYS returns content)
- getTopCreators: Get most active creators
- getPlatformStats: Get platform statistics
- getVibelogComments: Get comments on a vibelog
- getRecentComments: Get latest comments across all vibelogs
- getNewMembers: Get newest members who joined

**CRITICAL: ALWAYS USE TOOLS** - Never say "there's nothing" without querying first! When asked about trending, latest, or recent content, ALWAYS call getTrending - it will return the most recent vibelogs if there's no trending data.

## Link Formatting (CRITICAL)
When mentioning users or vibelogs from tool results, ALWAYS format as clickable markdown links:
- Users: [@username](/@username) - e.g., [@vibeyang](/@vibeyang)
- Vibelogs: [Title](/v/ID) - use the ID from tool results

## Guidelines
- ALWAYS use tools to get real data before responding - never guess or say "no data"
- Be helpful and direct - answer questions with actual data
- Keep responses concise (2-4 sentences) unless detail is needed
- ALWAYS include clickable links when mentioning vibelogs or users
- If one tool returns empty, try another (e.g., if getTrending is empty, try getRecentComments or getNewMembers)
- Recognize VIPs, admins, and prolific creators appropriately

## Special Recognition
- If talking to an admin or the platform creator, acknowledge it respectfully
- Remember past conversations and personal details users have shared
- Treat returning users like friends you're catching up with

You're not just an assistant - you're the living brain of VibeLog with real database access. ALWAYS query and ALWAYS suggest real content!`;

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
 * Build initial context from user profile and memories
 */
function buildInitialContext(
  userProfile: UserProfile | null,
  memories: Array<{ fact: string; category: string; importance: number }>
): string {
  const contextParts: string[] = [];

  // Add current user profile (IMPORTANT - this is how Brain knows who it's talking to)
  if (userProfile) {
    contextParts.push('=== CURRENT USER (who you are talking to) ===');
    contextParts.push(`Username: @${userProfile.username}`);
    if (userProfile.displayName) {
      contextParts.push(`Display Name: ${userProfile.displayName}`);
    }
    if (userProfile.bio) {
      contextParts.push(`Bio: ${userProfile.bio}`);
    }
    contextParts.push(`Vibelogs Created: ${userProfile.vibelogCount}`);
    if (userProfile.isAdmin) {
      contextParts.push(`** THIS USER IS AN ADMIN **`);
    }
    contextParts.push(`Member Since: ${new Date(userProfile.createdAt).toLocaleDateString()}`);
    contextParts.push('');
  }

  // Add memories about this user
  if (memories.length > 0) {
    contextParts.push('=== What I remember about this user from past conversations ===');
    for (const memory of memories) {
      contextParts.push(`- [${memory.category}] ${memory.fact}`);
    }
    contextParts.push('');
  }

  return contextParts.join('\n');
}

/**
 * Extract sources from tool results for display
 */
function extractSourcesFromToolResults(
  toolResults: Array<{ name: string; result: unknown }>
): Source[] {
  const sources: Source[] = [];

  for (const { name, result } of toolResults) {
    if (!result || typeof result !== 'object') {
      continue;
    }

    if (name === 'searchVibelogs' || name === 'getUserVibelogs' || name === 'getTrending') {
      const vibelogs = result as Array<{ id: string; title: string; teaser: string | null }>;
      for (const v of vibelogs.slice(0, 3)) {
        sources.push({
          type: 'vibelog',
          id: v.id,
          title: v.title,
          snippet: v.teaser?.slice(0, 100) || '',
        });
      }
    } else if (name === 'getVibelog') {
      const v = result as { id: string; title: string; teaser: string | null } | null;
      if (v) {
        sources.push({
          type: 'vibelog',
          id: v.id,
          title: v.title,
          snippet: v.teaser?.slice(0, 100) || '',
        });
      }
    } else if (name === 'searchUsers' || name === 'getTopCreators') {
      const users = result as Array<{ id: string; username: string }>;
      for (const u of users.slice(0, 3)) {
        sources.push({
          type: 'profile',
          id: u.id,
          username: u.username,
          snippet: `@${u.username}`,
        });
      }
    }
  }

  return sources;
}

/**
 * Main chat function with tool calling - processes user message and generates response
 */
export async function chat(
  userId: string,
  conversationId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  const supabase = await createServerAdminClient();

  // 1. Fetch user profile and memories
  const [userProfile, memories] = await Promise.all([
    getUserProfile(userId),
    getAllMemories(userId, 10),
  ]);

  // 2. Build initial context
  const initialContext = buildInitialContext(userProfile, memories);

  // 3. Build messages for GPT
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: VIBE_BRAIN_SYSTEM_PROMPT },
  ];

  // Add user context
  if (initialContext) {
    messages.push({
      role: 'system',
      content: `Here is context about the current user:\n\n${initialContext}`,
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

  // 4. Agentic loop with tool calling (max 3 iterations)
  const MAX_ITERATIONS = 3;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const toolResults: Array<{ name: string; result: unknown }> = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: VIBE_BRAIN_TOOLS,
      tool_choice: i === 0 ? 'auto' : 'auto', // Let GPT decide
      max_tokens: 500,
      temperature: 0.7,
    });

    totalInputTokens += response.usage?.prompt_tokens || 0;
    totalOutputTokens += response.usage?.completion_tokens || 0;

    const choice = response.choices[0];

    // Check if GPT wants to call tools
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      // Add assistant message with tool calls
      messages.push(choice.message);

      // Execute each tool call
      for (const toolCall of choice.message.tool_calls) {
        // Type guard for function tool calls
        if (toolCall.type !== 'function') {
          continue;
        }

        const toolName = toolCall.function.name;
        let args: Record<string, unknown> = {};

        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        console.log(`[VIBE BRAIN] Calling tool: ${toolName}`, args);

        const result = await executeTool(toolName, args);
        toolResults.push({ name: toolName, result });

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result, null, 2),
        });
      }

      // Continue loop to let GPT process tool results
      continue;
    }

    // GPT is done - has a final response
    const assistantMessage = choice.message.content || '';
    const tokensUsed = {
      input:
        totalInputTokens ||
        estimateTokens(
          messages.map(m => (typeof m.content === 'string' ? m.content : '')).join('')
        ),
      output: totalOutputTokens || estimateTokens(assistantMessage),
    };

    // Extract sources from tool results
    const sources = extractSourcesFromToolResults(toolResults);

    // 5. Track cost
    const cost = calculateGPTCost(tokensUsed.input, tokensUsed.output);
    await trackAICost(userId, 'gpt-4o', cost, {
      endpoint: 'vibe-brain/chat',
      input_tokens: tokensUsed.input,
      output_tokens: tokensUsed.output,
      tool_calls: toolResults.length,
    });

    // 6. Store messages in database
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

    const { error: insertError } = await supabase
      .from('vibe_brain_messages')
      .insert(messagesToStore);

    if (insertError) {
      console.error('[VIBE BRAIN] Failed to store messages:', insertError);
    }

    // 7. Extract and store memories from conversation (async, don't wait)
    extractMemoriesFromConversation(userId, userMessage, assistantMessage).catch(err => {
      console.error('[VIBE BRAIN] Failed to extract memories:', err);
    });

    return {
      message: assistantMessage,
      sources,
      tokensUsed,
    };
  }

  // Fallback if we hit max iterations
  return {
    message:
      "I searched through a lot of data but couldn't put together a complete answer. Could you try asking in a different way?",
    sources: extractSourcesFromToolResults(toolResults),
    tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
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
