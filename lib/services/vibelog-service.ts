import { extractBasicTags, extractContentMetadata } from '@/lib/content-extraction';
import { generatePublicSlug, generateUserSlug } from '@/lib/seo';
import { createServerAdminClient } from '@/lib/supabaseAdmin';
import { getTargetLanguages, type SupportedLanguage, translateVibelog } from '@/lib/translation';
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
  isPublished?: boolean; // Whether to publish the vibelog (default: true)
  isPublic?: boolean; // Whether the vibelog is public (default: true)
  originalLanguage?: string; // ISO 639-1 code from Whisper detection
  channelId?: string; // Channel to post to (uses default channel if not specified)
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
  transcript: string; // Original transcript for "Original" tab display
  cover_image_url: string | null;
  // NOTE: cover_image_alt, cover_image_width, cover_image_height removed - columns don't exist in DB
  audio_url: string | null;
  audio_duration: number | null;
  original_language: string; // ISO 639-1 code of spoken language
  word_count: number;
  read_time: number;
  tags: string[];
  // NOTE: seo_title, seo_description removed - columns don't exist in vibelogs table
  is_public: boolean;
  is_published: boolean;
  published_at: string;
  view_count: number;
  share_count: number;
  like_count: number;
  primary_topic?: string;
  seo_keywords?: string[];
  channel_id?: string | null; // Channel this vibelog belongs to
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
  // NOTE: seoMetadata removed - seo_title/seo_description columns don't exist in vibelogs table

  const data: NormalizedVibelogData = {
    user_id: userId,
    session_id: sessionId,
    title: title,
    slug: userSlug,
    public_slug: publicSlug,
    teaser: teaserContent,
    content: fullContent,
    transcript: transcription, // Save to 'transcript' column for "Original" tab display
    cover_image_url: requestBody.coverImage?.url || null,
    // NOTE: cover_image_alt, width, height removed - columns don't exist in vibelogs table
    audio_url: requestBody.audioData?.url || null,
    audio_duration: requestBody.audioData?.duration
      ? Math.round(requestBody.audioData.duration)
      : null,
    original_language: requestBody.originalLanguage || 'en',
    word_count: wordCount,
    read_time: readTime,
    tags: extractBasicTags(title, fullContent),
    // NOTE: seo_title, seo_description removed - columns don't exist in vibelogs table
    is_public: requestBody.isPublic !== false, // Default to true unless explicitly set to false
    is_published: requestBody.isPublished !== false, // Default to true unless explicitly set to false
    published_at: new Date().toISOString(),
    view_count: 0,
    share_count: 0,
    like_count: 0,
    channel_id: requestBody.channelId || null, // Will be set to default channel if null
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
    .select('id, user_id, slug, public_slug, title')
    .eq('id', vibelogId)
    .single();

  if (fetchError || !existingVibelog) {
    throw new Error('Vibelog not found');
  }

  if (existingVibelog.user_id !== userId) {
    throw new Error('Permission denied');
  }

  // Build update data - only include columns that exist in the vibelogs table
  const updateData = {
    title: data.title,
    teaser: data.teaser,
    content: data.content,
    transcript: data.transcript, // Original transcript for "Original" tab
    cover_image_url: data.cover_image_url || undefined,
    // NOTE: cover_image_alt, width, height removed - columns don't exist in vibelogs table
    audio_url: data.audio_url || undefined,
    audio_duration: data.audio_duration || undefined,
    original_language: data.original_language, // ISO 639-1 code for translation system
    word_count: data.word_count,
    read_time: data.read_time,
    tags: data.tags,
    // NOTE: seo_title, seo_description removed - columns don't exist in vibelogs table
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
  const oldTitle = existingVibelog.title || '';
  const isPlaceholderTitle =
    oldTitle.toLowerCase().includes('video vibelog') &&
    (oldTitle.includes('processing') || /video vibelog \d+-\w+/i.test(oldTitle));
  const titleChanged = data.title && data.title !== oldTitle;

  // Regenerate slug if:
  // 1. No slug exists, OR
  // 2. Title changed from a placeholder title (video vibelog processing)
  if (userId && (!finalSlug || (isPlaceholderTitle && titleChanged))) {
    console.log('🔄 [UPDATE-VIBELOG] Regenerating slug:', {
      oldTitle,
      newTitle: data.title,
      isPlaceholderTitle,
      hadSlug: !!finalSlug,
    });
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

  let retries = 0;
  const maxRetries = 3;
  let insertData = { ...data };

  while (retries < maxRetries) {
    const { data: directResult, error: directError } = await supabase
      .from('vibelogs')
      .insert([insertData])
      .select('id')
      .single();

    // Success!
    if (!directError) {
      const vibelogId = directResult.id;
      let finalSlug = insertData.public_slug;

      if (userId) {
        finalSlug = generateUserSlug(insertData.title, vibelogId);
        await supabase.from('vibelogs').update({ slug: finalSlug }).eq('id', vibelogId);
      }

      return {
        vibelogId,
        slug: finalSlug,
        isAnonymous: !userId,
      };
    }

    // Check if it's a duplicate slug error
    if (directError.code === '23505' && directError.message?.includes('public_slug')) {
      retries++;
      console.warn(
        `⚠️ [CREATE-VIBELOG] Slug collision detected (attempt ${retries}/${maxRetries})`
      );

      // Generate a new slug with additional randomness
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const timestamp = Date.now();
      insertData = {
        ...insertData,
        public_slug: insertData.public_slug
          ? `${insertData.public_slug}-${randomSuffix}`
          : `vibelog-${timestamp}-${randomSuffix}`,
        slug: insertData.slug
          ? `${insertData.slug}-${randomSuffix}`
          : `vibelog-${timestamp}-${randomSuffix}`,
      };

      continue; // Retry with new slug
    }

    // Different error - throw it
    console.error('❌ [CREATE-VIBELOG] Insert failed:', {
      code: directError.code,
      message: directError.message,
      details: directError.details,
      hint: directError.hint,
    });
    throw new Error(`Database insert failed: ${directError.message}`);
  }

  // Max retries exceeded
  throw new Error('Failed to create vibelog: slug collision persisted after retries');
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
    transcript: data.transcript,
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

  // 4. Auto-translate to all supported languages (fire-and-forget)
  // Skip translation for unpublished vibelogs (e.g., video vibelogs during processing)
  // This prevents translating placeholder content like "Video vibelog ... (processing...)"
  if (!data.is_published) {
    console.log('ℹ️ [TRANSLATION] Skipping - vibelog not published yet:', vibelogId);
    return;
  }

  // Check if translations already exist (to prevent overwriting)
  const { data: existing } = await supabase
    .from('vibelogs')
    .select('translations, available_languages')
    .eq('id', vibelogId)
    .single();

  if (existing?.translations && Object.keys(existing.translations).length > 0) {
    console.log('ℹ️ [TRANSLATION] Skipping - translations already exist for:', vibelogId);
    return; // Don't overwrite existing translations
  }

  const sourceLanguage = (data.original_language || 'en') as SupportedLanguage;
  const targetLanguages = getTargetLanguages(sourceLanguage);

  if (targetLanguages.length > 0) {
    console.log(
      `🌍 [TRANSLATION] Starting batch translation from ${sourceLanguage} to:`,
      targetLanguages
    );

    translateVibelog(
      {
        vibelogId,
        title: data.title,
        teaser: data.teaser,
        content: data.content,
        // seo_title and seo_description are optional - will be derived from title/teaser during translation
        sourceLanguage,
        targetLanguages,
      },
      userId
    )
      .then(async result => {
        if (result.translations && Object.keys(result.translations).length > 0) {
          const availableLanguages = [sourceLanguage, ...Object.keys(result.translations)];
          try {
            // Use admin client to bypass RLS for background translation updates
            const adminClient = await createServerAdminClient();
            await adminClient
              .from('vibelogs')
              .update({
                translations: result.translations,
                available_languages: availableLanguages,
              })
              .eq('id', vibelogId);
            console.log(
              `✅ [TRANSLATION] Saved translations for ${vibelogId}:`,
              Object.keys(result.translations)
            );
          } catch (updateErr) {
            console.error('[TRANSLATION] Failed to save translations:', updateErr);
          }
        }
      })
      .catch(err => {
        console.error('[TRANSLATION] Failed to translate vibelog:', err);
      });
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
