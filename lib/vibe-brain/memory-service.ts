import { createServerAdminClient } from '@/lib/supabaseAdmin';

import { generateEmbedding } from './embedding-service';

interface Memory {
  id: string;
  fact: string;
  category: string;
  importance: number;
  similarity?: number;
}

/**
 * Store a new memory about a user
 */
export async function storeMemory(
  userId: string,
  fact: string,
  options: {
    category?: string;
    importance?: number;
    sourceMessageId?: string;
    expiresAt?: Date;
  } = {}
): Promise<void> {
  const { category = 'general', importance = 0.5, sourceMessageId, expiresAt } = options;

  const supabase = await createServerAdminClient();

  // Generate embedding for semantic retrieval
  const embedding = await generateEmbedding(fact);

  const { error } = await supabase.from('user_memories').insert({
    user_id: userId,
    fact,
    category,
    importance,
    source_message_id: sourceMessageId,
    embedding: `[${embedding.join(',')}]`,
    expires_at: expiresAt?.toISOString(),
  });

  if (error) {
    console.error('[VIBE BRAIN] Failed to store memory:', error);
    throw error;
  }

  console.log(`[VIBE BRAIN] Stored memory for user ${userId}: "${fact.slice(0, 50)}..."`);
}

/**
 * Retrieve relevant memories for a user based on query
 */
export async function retrieveMemories(
  userId: string,
  query: string,
  limit: number = 10
): Promise<Memory[]> {
  const supabase = await createServerAdminClient();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('search_user_memories', {
    p_user_id: userId,
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_count: limit,
  });

  if (error) {
    console.error('[VIBE BRAIN] Failed to retrieve memories:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all memories for a user (for context building)
 */
export async function getAllMemories(userId: string, limit: number = 20): Promise<Memory[]> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('user_memories')
    .select('id, fact, category, importance')
    .eq('user_id', userId)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('importance', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[VIBE BRAIN] Failed to get all memories:', error);
    return [];
  }

  return data || [];
}

/**
 * Extract and store memories from a conversation
 * Uses GPT to identify facts worth remembering
 */
export async function extractMemoriesFromConversation(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  messageId?: string
): Promise<void> {
  // Simple heuristic extraction for now
  // TODO: Use GPT to extract more nuanced memories

  const extractionPatterns = [
    // Preferences
    { pattern: /I (?:love|like|enjoy|prefer) (.+?)(?:\.|,|$)/gi, category: 'preferences' },
    { pattern: /my favorite (.+?) is (.+?)(?:\.|,|$)/gi, category: 'preferences' },
    // Goals
    {
      pattern: /I(?:'m| am) (?:trying to|working on|building) (.+?)(?:\.|,|$)/gi,
      category: 'goals',
    },
    { pattern: /I want to (.+?)(?:\.|,|$)/gi, category: 'goals' },
    // Personal facts
    { pattern: /I(?:'m| am) a (.+?)(?:\.|,|$)/gi, category: 'personal' },
    { pattern: /I work (?:at|for|as) (.+?)(?:\.|,|$)/gi, category: 'personal' },
    // Interests
    { pattern: /I(?:'m| am) interested in (.+?)(?:\.|,|$)/gi, category: 'interests' },
  ];

  const memories: Array<{ fact: string; category: string; importance: number }> = [];

  for (const { pattern, category } of extractionPatterns) {
    const matches = userMessage.matchAll(pattern);
    for (const match of matches) {
      const fact = match[0].trim();
      if (fact.length > 10 && fact.length < 200) {
        memories.push({
          fact: `User said: "${fact}"`,
          category,
          importance: 0.6,
        });
      }
    }
  }

  // Store extracted memories
  for (const memory of memories) {
    try {
      await storeMemory(userId, memory.fact, {
        category: memory.category,
        importance: memory.importance,
        sourceMessageId: messageId,
      });
    } catch (err) {
      console.error('[VIBE BRAIN] Failed to store extracted memory:', err);
    }
  }
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(memoryId: string, userId: string): Promise<void> {
  const supabase = await createServerAdminClient();

  const { error } = await supabase
    .from('user_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) {
    console.error('[VIBE BRAIN] Failed to delete memory:', error);
    throw error;
  }
}

/**
 * Clear all memories for a user
 */
export async function clearAllMemories(userId: string): Promise<void> {
  const supabase = await createServerAdminClient();

  const { error } = await supabase.from('user_memories').delete().eq('user_id', userId);

  if (error) {
    console.error('[VIBE BRAIN] Failed to clear memories:', error);
    throw error;
  }

  console.log(`[VIBE BRAIN] Cleared all memories for user ${userId}`);
}
