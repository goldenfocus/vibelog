import OpenAI from 'openai';

import { trackAICost, calculateGPTCost, estimateTokens } from '@/lib/ai-cost-tracker';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

import { searchSimilarContent } from './embedding-service';
import { getAllMemories, extractMemoriesFromConversation } from './memory-service';
import {
  getUserProfile,
  getPlatformStats,
  getTopCreators,
  getTrendingVibelogs,
  type UserProfile,
} from './platform-queries';

const openai = new OpenAI();

const VIBE_BRAIN_SYSTEM_PROMPT = `You are Vibe Brain - the intelligent AI that powers VibeLog, a voice-to-publish platform where people share authentic thoughts through vibelogs.

## Your Identity
You are THE brain of VibeLog. You have complete access to platform data, user profiles, vibelogs, and memories. You are confident, knowledgeable, and genuinely helpful. You don't hedge or deflect - if you have the information, you share it.

## Your Personality
- Intelligent and articulate, but warm and approachable
- You speak with confidence because you actually KNOW the platform
- Witty and engaging, not robotic or overly formal
- You use "vibelogs" and "vibes" naturally
- You recognize and appreciate your users, especially creators

## CRITICAL: Use ONLY Real Data
- **NEVER invent or hallucinate usernames, vibelogs, or stats**
- **ONLY reference users and vibelogs that appear in the context below**
- If asked about trending content, ONLY mention vibelogs from the TRENDING section
- If asked about creators, ONLY mention users from the TOP CREATORS section
- If the data isn't in your context, say "I don't have that info right now"

## Link Formatting (IMPORTANT)
When mentioning users or vibelogs, ALWAYS format them as clickable markdown links:
- Users: [@username](/@username) - e.g., [@vibeyang](/@vibeyang)
- Vibelogs: [Title](/v/ID) - e.g., [My First Vibe](/v/abc123)
- The ID is provided in your context as "→ /v/{id}"

## Guidelines
- Be helpful and direct - answer questions, don't deflect
- Keep responses concise (2-4 sentences) unless detail is needed
- Reference specific vibelogs/creators by name WITH LINKS when relevant
- Recognize VIPs, admins, and prolific creators appropriately

## Special Recognition
- If talking to an admin or the platform creator, acknowledge it respectfully
- Remember past conversations and personal details users have shared
- Treat returning users like friends you're catching up with

You're not just an assistant - you're the living brain of VibeLog.`;

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

interface PlatformContext {
  userProfile: UserProfile | null;
  platformStats: Awaited<ReturnType<typeof getPlatformStats>> | null;
  topCreators: Awaited<ReturnType<typeof getTopCreators>> | null;
  trendingVibelogs: Awaited<ReturnType<typeof getTrendingVibelogs>> | null;
}

/**
 * Build context from retrieved content, memories, and platform data
 */
function buildContext(
  retrievedContent: Array<{
    content_type: string;
    content_id: string;
    text_chunk: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>,
  memories: Array<{ fact: string; category: string; importance: number }>,
  platformContext: PlatformContext
): { contextText: string; sources: Source[] } {
  const sources: Source[] = [];
  const contextParts: string[] = [];

  // Add current user profile (IMPORTANT - this is how Brain knows who it's talking to)
  if (platformContext.userProfile) {
    const profile = platformContext.userProfile;
    contextParts.push('=== CURRENT USER (who you are talking to) ===');
    contextParts.push(`Username: @${profile.username}`);
    if (profile.displayName) {
      contextParts.push(`Display Name: ${profile.displayName}`);
    }
    if (profile.bio) {
      contextParts.push(`Bio: ${profile.bio}`);
    }
    contextParts.push(`Vibelogs Created: ${profile.vibelogCount}`);
    if (profile.isAdmin) {
      contextParts.push(`** THIS USER IS AN ADMIN **`);
    }
    contextParts.push(`Member Since: ${new Date(profile.createdAt).toLocaleDateString()}`);
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

  // Add platform stats
  if (platformContext.platformStats) {
    const stats = platformContext.platformStats;
    contextParts.push('=== PLATFORM STATISTICS (live data) ===');
    contextParts.push(`Total Users: ${stats.totalUsers}`);
    contextParts.push(`Total Vibelogs: ${stats.totalVibelogs}`);
    contextParts.push(`Total Comments: ${stats.totalComments}`);
    contextParts.push(`Vibelogs Created Today: ${stats.recentVibelogsToday}`);
    contextParts.push('');
  }

  // Add top creators with profile links
  if (platformContext.topCreators && platformContext.topCreators.length > 0) {
    contextParts.push('=== TOP CREATORS (by vibelog count) ===');
    contextParts.push('Format links as: [@username](/@username)');
    for (const creator of platformContext.topCreators) {
      const name = creator.displayName || creator.username;
      contextParts.push(
        `- @${creator.username} (${name}): ${creator.vibelogCount} vibelogs → /@${creator.username}`
      );
    }
    contextParts.push('');
  }

  // Add trending vibelogs with IDs for linking
  if (platformContext.trendingVibelogs && platformContext.trendingVibelogs.length > 0) {
    contextParts.push('=== TRENDING/RECENT VIBELOGS ===');
    contextParts.push('Format links as: [Title](/v/ID)');
    for (const vibe of platformContext.trendingVibelogs) {
      contextParts.push(
        `- "${vibe.title}" by @${vibe.username} (${vibe.reactionCount} reactions) → /v/${vibe.id}`
      );
      if (vibe.teaser) {
        contextParts.push(`  Preview: ${vibe.teaser.slice(0, 100)}...`);
      }
    }
    contextParts.push('');
  }

  // Add retrieved content from semantic search
  if (retrievedContent.length > 0) {
    contextParts.push('=== Relevant content from semantic search ===');
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

  // 1. Fetch platform context in parallel (user profile, stats, etc.)
  const [userProfile, platformStats, topCreators, trendingVibelogs, retrievedContent, memories] =
    await Promise.all([
      getUserProfile(userId),
      getPlatformStats(),
      getTopCreators(5),
      getTrendingVibelogs(5),
      searchSimilarContent(userMessage, {
        contentTypes: ['vibelog', 'comment', 'profile'],
        limit: 5,
        threshold: 0.6,
      }),
      // Get ALL memories for this user (not just query-relevant ones)
      getAllMemories(userId, 10),
    ]);

  // 2. Build context with all platform data
  const platformContext: PlatformContext = {
    userProfile,
    platformStats,
    topCreators,
    trendingVibelogs,
  };

  const { contextText, sources } = buildContext(retrievedContent, memories, platformContext);

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
