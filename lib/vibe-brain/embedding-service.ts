import OpenAI from 'openai';

import { trackAICost } from '@/lib/ai-cost-tracker';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

const openai = new OpenAI();

// Cost: $0.02 per 1M tokens for text-embedding-3-small
const EMBEDDING_COST_PER_TOKEN = 0.00000002;

export type ContentType = 'vibelog' | 'comment' | 'profile' | 'documentation';

interface EmbeddingInput {
  contentType: ContentType;
  contentId: string;
  userId?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Generate embedding for a piece of text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // Max ~8k tokens, truncate to be safe
  });

  return response.data[0].embedding;
}

/**
 * Store embedding for content in the database
 */
export async function embedContent(input: EmbeddingInput): Promise<void> {
  const { contentType, contentId, userId, text, metadata } = input;

  if (!text || text.trim().length < 10) {
    console.log(`[VIBE BRAIN] Skipping embedding for ${contentType}/${contentId} - text too short`);
    return;
  }

  const supabase = await createServerAdminClient();

  // Generate embedding
  const embedding = await generateEmbedding(text);

  // Track cost (rough estimate: 1 token per 4 chars)
  const estimatedTokens = Math.ceil(text.length / 4);
  const cost = estimatedTokens * EMBEDDING_COST_PER_TOKEN;
  await trackAICost(userId || null, 'gpt-4o-mini', cost, {
    endpoint: 'vibe-brain/embedding',
    input_tokens: estimatedTokens,
  });

  // Upsert embedding (update if exists, insert if new)
  const { error } = await supabase.from('content_embeddings').upsert(
    {
      content_type: contentType,
      content_id: contentId,
      user_id: userId,
      embedding: `[${embedding.join(',')}]`,
      text_chunk: text.slice(0, 5000), // Store truncated text for reference
      metadata: metadata || {},
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'content_id,content_type',
      ignoreDuplicates: false,
    }
  );

  if (error) {
    console.error(`[VIBE BRAIN] Failed to store embedding for ${contentType}/${contentId}:`, error);
    throw error;
  }

  console.log(`[VIBE BRAIN] Embedded ${contentType}/${contentId} (${text.length} chars)`);
}

/**
 * Embed a vibelog (title + teaser + content)
 */
export async function embedVibelog(vibelog: {
  id: string;
  user_id: string;
  title?: string;
  teaser?: string;
  content?: string;
  transcript?: string;
}): Promise<void> {
  const textParts = [vibelog.title, vibelog.teaser, vibelog.content, vibelog.transcript].filter(
    Boolean
  );

  const text = textParts.join('\n\n');

  if (!text) {
    return;
  }

  await embedContent({
    contentType: 'vibelog',
    contentId: vibelog.id,
    userId: vibelog.user_id,
    text,
    metadata: {
      title: vibelog.title,
      has_transcript: !!vibelog.transcript,
    },
  });
}

/**
 * Embed a comment
 */
export async function embedComment(comment: {
  id: string;
  user_id: string;
  vibelog_id: string;
  content: string;
}): Promise<void> {
  await embedContent({
    contentType: 'comment',
    contentId: comment.id,
    userId: comment.user_id,
    text: comment.content,
    metadata: {
      vibelog_id: comment.vibelog_id,
    },
  });
}

/**
 * Embed a user profile
 */
export async function embedProfile(profile: {
  id: string;
  username?: string;
  display_name?: string;
  bio?: string;
}): Promise<void> {
  const text = [profile.display_name || profile.username, profile.bio].filter(Boolean).join('\n\n');

  if (!text || text.length < 10) {
    return;
  }

  await embedContent({
    contentType: 'profile',
    contentId: profile.id,
    userId: profile.id,
    text,
    metadata: {
      username: profile.username,
      display_name: profile.display_name,
    },
  });
}

/**
 * Search for similar content using vector similarity
 */
export async function searchSimilarContent(
  query: string,
  options: {
    contentTypes?: ContentType[];
    limit?: number;
    threshold?: number;
  } = {}
): Promise<
  Array<{
    content_type: ContentType;
    content_id: string;
    user_id: string;
    text_chunk: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>
> {
  const {
    contentTypes = ['vibelog', 'comment', 'profile', 'documentation'],
    limit = 10,
    threshold = 0.7,
  } = options;

  const supabase = await createServerAdminClient();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Search using pgvector cosine similarity
  // Note: We use 1 - cosine_distance for similarity (higher = more similar)
  const { data, error } = await supabase.rpc('search_content_embeddings', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    content_types: contentTypes,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error('[VIBE BRAIN] Search error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete embedding for content
 */
export async function deleteEmbedding(contentType: ContentType, contentId: string): Promise<void> {
  const supabase = await createServerAdminClient();

  const { error } = await supabase
    .from('content_embeddings')
    .delete()
    .eq('content_type', contentType)
    .eq('content_id', contentId);

  if (error) {
    console.error(
      `[VIBE BRAIN] Failed to delete embedding for ${contentType}/${contentId}:`,
      error
    );
  }
}

/**
 * Batch embed multiple vibelogs (for backfill)
 */
export async function batchEmbedVibelogs(
  vibelogs: Array<{
    id: string;
    user_id: string;
    title?: string;
    teaser?: string;
    content?: string;
    transcript?: string;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const vibelog of vibelogs) {
    try {
      await embedVibelog(vibelog);
      success++;
    } catch (err) {
      console.error(`[VIBE BRAIN] Failed to embed vibelog ${vibelog.id}:`, err);
      failed++;
    }

    // Rate limit: small delay between embeddings
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[VIBE BRAIN] Batch embed complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
