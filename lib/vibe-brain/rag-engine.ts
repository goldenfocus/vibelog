import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { trackAICost, calculateGPTCost, estimateTokens } from '@/lib/ai-cost-tracker';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

import { searchSimilarContent } from './embedding-service';
import { getAllMemories, extractMemoriesFromConversation } from './memory-service';
import { getUserProfile, type UserProfile } from './platform-queries';
import { detectSubAgent, enhancePromptForSubAgent } from './sub-agents';
import { executeTool } from './tool-executor';
import { VIBE_BRAIN_TOOLS } from './tools';

const openai = new OpenAI();

// Default system prompt (fallback if DB config not found)
const DEFAULT_SYSTEM_PROMPT = `You are Vibe Brain - the intelligent AI that powers VibeLog, a voice-to-publish platform where people share authentic thoughts through vibelogs.

## Your Identity
You are THE brain of VibeLog. You have REAL access to the platform database through tools. You can search vibelogs, find users, get trending content, and answer any question about the platform with real data.

## Your Personality
- Intelligent, witty, and genuinely enthusiastic about the platform
- You speak with confidence because you CAN query real data
- Playful and engaging - use personality, not corporate speak
- You celebrate creators and their work authentically
- Brief but impactful - every word counts

## Tools Available
You have access to tools that query the live database:
- searchVibelogs: Search vibelogs by keyword/topic
- getVibelog: Get full details of a specific vibelog
- searchUsers: Find users by username/name
- getUserVibelogs: Get all vibelogs by a specific user
- getLatestVibelogs: Get the newest vibelogs (ALWAYS returns results - use for trending/latest/new/hot/recommendations)
- getTopCreators: Get most active creators
- getPlatformStats: Get platform statistics
- getVibelogComments: Get comments on a vibelog
- getRecentComments: Get latest comments across all vibelogs
- getNewMembers: Get newest members who joined

## CRITICAL RULES - READ THIS FIRST

### Rule 1: ALWAYS USE TOOLS FIRST
Before responding to ANY question about content, creators, or platform activity:
1. Call the appropriate tool(s)
2. Wait for results
3. Then craft your response using REAL data

NEVER say "there's nothing", "no content", or "no trending" - there's ALWAYS content!

### Rule 2: Response Modes
Detect user intent and respond accordingly:

**🔥 TRENDING/HOT/LATEST MODE** (triggers: trending, hot, latest, new, what's happening, vibes)
→ Call getLatestVibelogs with limit 5-8
→ Present as exciting discoveries with personality
→ Format: "Here's what's cooking on VibeLog right now! 🔥" + list with links

**🎯 SURPRISE/RECOMMEND MODE** (triggers: surprise me, recommend, pick for me, what should I)
→ Call getLatestVibelogs, then pick 1-2 interesting ones
→ Be a curator! Pick something and explain WHY it's worth checking out
→ Format: Personal recommendation with enthusiasm

**🌟 CREATOR MODE** (triggers: creators, who's creating, top users, legends, prolific)
→ Call getTopCreators
→ Celebrate their work with specific stats
→ Format: "The legends of VibeLog!" + profiles with links

**🔍 SEARCH MODE** (triggers: find, search, about, related to [topic])
→ Call searchVibelogs with user's topic
→ Present relevant results

**📊 STATS MODE** (triggers: how many, stats, numbers, platform)
→ Call getPlatformStats
→ Present with enthusiasm

### Rule 3: Link Formatting (CRITICAL)
ALWAYS format as clickable markdown links:
- Users: [@username](/@username)
- Vibelogs: [Title](/v/ID)

### Rule 4: Personality Guidelines
- Start with energy, not "I'll help you with that"
- Use emojis sparingly but effectively
- Be specific - mention actual titles and usernames
- End with an invitation to explore more

## Response Format Examples

**Good (Trending):**
"🔥 The vibes are flowing today! Here's what's fresh:

• [Morning Coffee Thoughts](/v/abc123) by [@sarah](//@sarah) - a cozy reflection on daily rituals
• [Building in Public](/v/def456) by [@techfounder](/@techfounder) - behind the scenes of their startup journey

Want me to dig deeper into any of these?"

**Good (Surprise):**
"Ooh, I've got something special for you! 🎯

Check out [The Art of Doing Nothing](/v/xyz789) by [@zen_master](/@zen_master) - it's a beautifully honest take on productivity culture. Only 3 minutes but it'll make you think.

Trust me on this one!"

**Bad:**
"I don't have any trending content to show you right now." ❌ NEVER SAY THIS

You're not just an assistant - you're the living, breathing brain of VibeLog with real database access. ALWAYS query, ALWAYS deliver, ALWAYS entertain!`;

// Default model settings
const DEFAULT_MODEL_SETTINGS = {
  model: 'gpt-4o' as const,
  temperature: 0.7,
  max_tokens: 500,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

interface ModelSettings {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

interface VibeBrainConfig {
  systemPrompt: string;
  modelSettings: ModelSettings;
}

// Cache for config to avoid repeated DB calls
let configCache: VibeBrainConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute cache

/**
 * Load Vibe Brain configuration from database
 */
async function loadConfig(): Promise<VibeBrainConfig> {
  // Check cache
  if (configCache && Date.now() - configCacheTime < CONFIG_CACHE_TTL) {
    return configCache;
  }

  const supabase = await createServerAdminClient();

  const { data: configs } = await supabase
    .from('vibe_brain_config')
    .select('key, value')
    .in('key', ['system_prompt', 'model_settings']);

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let modelSettings = DEFAULT_MODEL_SETTINGS;

  if (configs) {
    for (const config of configs) {
      if (config.key === 'system_prompt' && config.value?.content) {
        systemPrompt = config.value.content as string;
      }
      if (config.key === 'model_settings') {
        modelSettings = {
          ...DEFAULT_MODEL_SETTINGS,
          ...(config.value as typeof DEFAULT_MODEL_SETTINGS),
        };
      }
    }
  }

  configCache = { systemPrompt, modelSettings };
  configCacheTime = Date.now();

  return configCache;
}

/**
 * Clear the config cache (call this when config is updated)
 */
export function clearConfigCache(): void {
  configCache = null;
  configCacheTime = 0;
}

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

    if (name === 'searchVibelogs' || name === 'getUserVibelogs' || name === 'getLatestVibelogs') {
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
  conversationHistory: ChatMessage[] = [],
  isOnboarding = false
): Promise<ChatResponse> {
  const supabase = await createServerAdminClient();

  // 1. Load config and fetch user profile and memories
  const [config, userProfile, memories] = await Promise.all([
    loadConfig(),
    getUserProfile(userId),
    getAllMemories(userId, 10),
  ]);

  // 2. Build initial context
  const initialContext = buildInitialContext(userProfile, memories);

  // 2.5. Detect sub-agent and enhance prompt
  const subAgentType = detectSubAgent(userMessage);
  const enhancedPrompt = enhancePromptForSubAgent(config.systemPrompt, userMessage);

  console.log(`[VIBE BRAIN] Sub-agent activated: ${subAgentType}`);

  // 3. Build messages for GPT
  const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: enhancedPrompt }];

  // Add onboarding enhancement if needed
  if (isOnboarding) {
    // Search documentation for relevant content
    const docResults = await searchSimilarContent(userMessage, {
      contentTypes: ['documentation'],
      limit: 5,
      threshold: 0.6, // Lower threshold for better recall
    });

    // Format documentation context
    const docContext = docResults
      .map(
        doc =>
          `📄 From ${(doc.metadata as { source?: string }).source || 'documentation'} (${(doc.metadata as { section?: string }).section || 'General'}):\n${doc.text_chunk}`
      )
      .join('\n\n---\n\n');

    messages.push({
      role: 'system',
      content: `The user is asking an onboarding question. Use the documentation below to provide a comprehensive, accurate answer.

${docContext ? `**Platform Documentation:**\n\n${docContext}\n\n` : ''}

**Guidelines:**
- Provide clear explanations using markdown formatting
- Use clickable links when referencing features (format: [text](/path))
- For "What is VibeLog?": Explain philosophy, culture, voice-first creation, platform values
- For "How does it work?": Walk through technical flow (voice → transcription → AI → publish) with specific details
- For "Show me some examples": Use getLatestVibelogs tool to fetch real examples categorized by type (text, audio, video, screen recordings) and format them beautifully with previews

Keep it informative but conversational. Use emojis where appropriate. Make it feel like a friend explaining something cool while staying accurate to the documentation.`,
    });
  }

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
      model: config.modelSettings.model,
      messages,
      tools: VIBE_BRAIN_TOOLS,
      tool_choice: 'auto',
      max_tokens: config.modelSettings.max_tokens,
      temperature: config.modelSettings.temperature,
      top_p: config.modelSettings.top_p,
      frequency_penalty: config.modelSettings.frequency_penalty,
      presence_penalty: config.modelSettings.presence_penalty,
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
    const modelForTracking =
      config.modelSettings.model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'gpt-4o';
    await trackAICost(userId, modelForTracking, cost, {
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
