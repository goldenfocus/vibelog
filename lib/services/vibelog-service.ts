import { extractBasicTags, extractContentMetadata } from '@/lib/content-extraction';
import { generatePublicSlug, generateUserSlug, generateVibelogSEO } from '@/lib/seo';
import { embedVibelog } from '@/lib/vibe-brain';

// Types
export interface SaveVibelogRequest {
  vibelogId?: string;
  title?: string;
  content: string;
  fullContent?: string;
  transcription?: string;
  coverImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  audioData?: {
    url: string;
    duration: number;
  };
  sessionId?: string;
  isTeaser?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface NormalizedVibelogData {
  user_id: string | null;
  session_id: string;
  title: string;
  slug: string | null;
  public_slug: string | null;
  teaser: string;
  content: string;
  transcription: string;
  transcript: string; // Original transcript for "Original" tab display
  cover_image_url: string | null;
  cover_image_alt: string | null;
  cover_image_width: number | null;
  cover_image_height: number | null;
  audio_url: string | null;
  audio_duration: number | null;
  language: string;
  word_count: number;
  read_time: number;
  tags: string[];
  seo_title: string;
  seo_description: string;
  is_public: boolean;
  is_published: boolean;
  published_at: string;
  view_count: number;
  share_count: number;
  like_count: number;
  primary_topic?: string;
  seo_keywords?: string[];
}

// Utility Functions
export function extractTitleFromContent(content: string): string {
  try {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        const title = trimmed.replace(/^#\s+/, '').trim();
        if (title && title.length > 0) {
          return title.substring(0, 200);
        }
      }
    }
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 10) {
      return firstSentence.substring(0, 100);
    }
    return `Vibelog ${new Date().toISOString().split('T')[0]}`;
  } catch {
    return `Vibelog ${Date.now()}`;
  }
}

export function calculateWordCount(text: string): number {
  try {
    return text.trim().split(/\s+/).length;
  } catch {
    return 0;
  }
}

export function calculateReadTime(wordCount: number): number {
  try {
    return Math.max(1, Math.ceil(wordCount / 200));
  } catch {
    return 1;
  }
}

export function generateSessionId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Core Service Functions
export async function normalizeVibelogData(
  requestBody: SaveVibelogRequest,
  userId: string | null
): Promise<{ data: NormalizedVibelogData; warnings: string[] }> {
  const warnings: string[] = [];
  const teaserContent = requestBody.content.trim();
  const fullContent = requestBody.fullContent?.trim() || teaserContent;
  let title = requestBody.title?.trim();

  if (!title) {
    title = extractTitleFromContent(fullContent);
    warnings.push('Title was auto-generated from content');
  }

  const transcription = requestBody.transcription?.trim() || '';
  const wordCount = calculateWordCount(fullContent);
  const readTime = calculateReadTime(wordCount);
  const sessionId = requestBody.sessionId || generateSessionId();
  const isAnonymous = !userId;

  const publicSlug = isAnonymous ? generatePublicSlug(title) : null;
  const userSlug = userId ? generateUserSlug(title, sessionId) : null;
  const seoMetadata = generateVibelogSEO(title, fullContent, teaserContent);

  const data: NormalizedVibelogData = {
    user_id: userId,
    session_id: sessionId,
    title: title,
    slug: userSlug,
    public_slug: publicSlug,
    teaser: teaserContent,
    content: fullContent,
    transcription: transcription,
    transcript: transcription, // Save to 'transcript' column for "Original" tab display
    cover_image_url: requestBody.coverImage?.url || null,
    cover_image_alt: requestBody.coverImage?.alt || null,
    cover_image_width: requestBody.coverImage?.width || null,
    cover_image_height: requestBody.coverImage?.height || null,
    audio_url: requestBody.audioData?.url || null,
    audio_duration: requestBody.audioData?.duration
      ? Math.round(requestBody.audioData.duration)
      : null,
    language: 'en',
    word_count: wordCount,
    read_time: readTime,
    tags: extractBasicTags(title, fullContent),
    seo_title: seoMetadata.title,
    seo_description: seoMetadata.description,
    is_public: true,
    is_published: true,
    published_at: new Date().toISOString(),
    view_count: 0,
    share_count: 0,
    like_count: 0,
  };

  return { data, warnings };
}

export async function updateVibelog(
  vibelogId: string,
  data: NormalizedVibelogData,
  userId: string,
  supabase: any
) {
  // Verify ownership
  const { data: existingVibelog, error: fetchError } = await supabase
    .from('vibelogs')
    .select('id, user_id, slug, public_slug')
    .eq('id', vibelogId)
    .single();

  if (fetchError || !existingVibelog) {
    throw new Error('Vibelog not found');
  }

  if (existingVibelog.user_id !== userId) {
    throw new Error('Permission denied');
  }

  // Build update data
  const updateData = {
    title: data.title,
    teaser: data.teaser,
    content: data.content,
    transcription: data.transcription,
    transcript: data.transcript, // Also update 'transcript' column for "Original" tab
    cover_image_url: data.cover_image_url || undefined,
    cover_image_alt: data.cover_image_alt || undefined,
    cover_image_width: data.cover_image_width || undefined,
    cover_image_height: data.cover_image_height || undefined,
    audio_url: data.audio_url || undefined,
    audio_duration: data.audio_duration || undefined,
    word_count: data.word_count,
    read_time: data.read_time,
    tags: data.tags,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    is_public: data.is_public,
    is_published: data.is_published,
    published_at: data.published_at,
  };

  // Remove undefined
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const { error: updateError } = await supabase
    .from('vibelogs')
    .update(updateData)
    .eq('id', vibelogId);

  if (updateError) {
    throw updateError;
  }

  // Handle slug updates
  let finalSlug = existingVibelog.slug || existingVibelog.public_slug;
  if (!finalSlug && userId) {
    finalSlug = generateUserSlug(data.title, vibelogId);
    await supabase.from('vibelogs').update({ slug: finalSlug }).eq('id', vibelogId);
  }

  return {
    vibelogId,
    slug: finalSlug,
    isAnonymous: false,
  };
}

export async function createVibelog(
  data: NormalizedVibelogData,
  userId: string | null,
  supabase: any
) {
  console.log('📝 [CREATE-VIBELOG] Inserting with user_id:', userId);

  const { data: directResult, error: directError } = await supabase
    .from('vibelogs')
    .insert([data])
    .select('id')
    .single();

  if (directError) {
    console.error('❌ [CREATE-VIBELOG] Insert failed:', {
      code: directError.code,
      message: directError.message,
      details: directError.details,
      hint: directError.hint,
    });
    throw new Error(`Database insert failed: ${directError.message}`);
  }

  const vibelogId = directResult.id;
  let finalSlug = data.public_slug;

  if (userId) {
    finalSlug = generateUserSlug(data.title, vibelogId);
    await supabase.from('vibelogs').update({ slug: finalSlug }).eq('id', vibelogId);
  }

  return {
    vibelogId,
    slug: finalSlug,
    isAnonymous: !userId,
  };
}

export async function handleAsyncTasks(
  vibelogId: string,
  data: NormalizedVibelogData,
  userId: string | null,
  supabase: any
) {
  // 1. Embed for Vibe Brain
  embedVibelog({
    id: vibelogId,
    user_id: userId || '',
    title: data.title,
    teaser: data.teaser,
    content: data.content,
    transcript: data.transcription,
  }).catch(err => {
    console.error('[VIBE BRAIN] Failed to embed vibelog:', err);
  });

  // 2. Extract Metadata
  extractContentMetadata(data.title, data.content, userId)
    .then(async metadata => {
      if (metadata && metadata.tags.length > 0) {
        try {
          await supabase
            .from('vibelogs')
            .update({
              tags: metadata.tags,
              primary_topic: metadata.primaryTopic,
              seo_keywords: metadata.seoKeywords,
            })
            .eq('id', vibelogId);
          console.log('📊 [CONTENT-EXTRACTION] Enriched vibelog with:', metadata.tags);
        } catch (updateErr) {
          console.error('[CONTENT-EXTRACTION] Failed to update metadata:', updateErr);
        }
      }
    })
    .catch(err => {
      console.error('[CONTENT-EXTRACTION] Failed to extract metadata:', err);
    });

  // 3. Auto-generate Cover Image - DISABLED
  // Cover generation is now handled exclusively by the client-side flow
  // to prevent duplicate image generation. The generate-cover API has
  // idempotency checks, but avoiding the call entirely is more efficient.
  // See: components/mic/useMicStateMachine.ts completeProcessing()
  //
  // If cover is needed server-side, the client will call /api/generate-cover
  // with the vibelogId after save completes.
  if (!data.cover_image_url) {
    console.log('ℹ️ [AUTO-COVER] Skipping server-side generation (handled by client):', vibelogId);
  }
}

export async function logVibelogFailure(data: any, error: any, supabase: any) {
  try {
    await supabase.from('vibelog_failures').insert([
      {
        attempted_data: data,
        error_message: `Failure: ${error.message || error}`,
        error_details: {
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          timestamp: new Date().toISOString(),
        },
      },
    ]);
    console.log('⚠️ [VIBELOG-SAVE] Logged to failures table');
  } catch (logError) {
    console.error('💀 [VIBELOG-SAVE] CRITICAL: Failure logging failed:', logError);
  }
}
