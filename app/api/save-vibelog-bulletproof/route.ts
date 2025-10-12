import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

interface SaveVibelogRequest {
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
  sessionId?: string; // SECURITY: Never accept userId from client
  isTeaser?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

// Utility functions for robust data processing
function extractTitleFromContent(content: string): string {
  try {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        const title = trimmed.replace(/^#\s+/, '').trim();
        if (title && title.length > 0) {
          return title.substring(0, 200); // Reasonable title length limit
        }
      }
    }
    // Fallback: use first meaningful sentence
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 10) {
      return firstSentence.substring(0, 100);
    }
    return `Vibelog ${new Date().toISOString().split('T')[0]}`;
  } catch {
    return `Vibelog ${Date.now()}`;
  }
}

function calculateWordCount(text: string): number {
  try {
    return text.trim().split(/\s+/).length;
  } catch {
    return 0;
  }
}

function calculateReadTime(wordCount: number): number {
  try {
    return Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
  } catch {
    return 1;
  }
}

function generateSessionId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSlug(title: string, vibelogId?: string): string {
  // Create URL-friendly slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 80); // Limit length

  // Add unique suffix if we have a vibelog ID (for uniqueness)
  const suffix = vibelogId ? `-${vibelogId.substring(0, 8)}` : '';
  return `${baseSlug}${suffix}`.substring(0, 100);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let requestBody: SaveVibelogRequest | null = null;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;
  let vibelogData: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

  try {
    // === STEP 1: PARSE REQUEST ===
    console.log('🚀 [VIBELOG-SAVE] Starting bulletproof save process...');

    try {
      requestBody = await request.json();
      console.log('📥 [VIBELOG-SAVE] Request parsed successfully');
    } catch (parseError) {
      console.error('❌ [VIBELOG-SAVE] Failed to parse request body:', parseError);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
          error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        },
        { status: 400 }
      );
    }

    // === STEP 2: VALIDATE AND NORMALIZE DATA ===
    if (!requestBody || !requestBody.content) {
      console.error('❌ [VIBELOG-SAVE] Missing required content field');
      return NextResponse.json(
        {
          success: false,
          message: 'Content is required',
        },
        { status: 400 }
      );
    }

    const warnings: string[] = [];

    // Extract and normalize all data with fallbacks
    const teaserContent = requestBody.content.trim(); // This is the teaser
    const fullContent = requestBody.fullContent?.trim() || teaserContent; // Fallback to teaser if no full content
    let title = requestBody.title?.trim();

    if (!title) {
      title = extractTitleFromContent(fullContent);
      warnings.push('Title was auto-generated from content');
    }

    const transcription = requestBody.transcription?.trim() || '';
    const wordCount = calculateWordCount(fullContent);
    const readTime = calculateReadTime(wordCount);
    const sessionId = requestBody.sessionId || generateSessionId();

    // SECURITY: Get user from session, NEVER trust client-supplied userId
    supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Generate slug from title (temporary slug without ID, will update after insert)
    const temporarySlug = generateSlug(title);

    // Prepare data object with both teaser and full content
    vibelogData = {
      user_id: userId, // SECURITY: Only use server-verified userId
      session_id: sessionId,
      title: title,
      slug: temporarySlug, // Will be updated with ID suffix after insert
      teaser: teaserContent, // Store AI-generated teaser for public preview
      content: fullContent, // Store full content for logged-in users
      transcription: transcription,
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
      tags: ['auto-generated'],
      is_public: false,
      is_published: false,
      view_count: 0,
      share_count: 0,
      like_count: 0,
    };

    console.log('✅ [VIBELOG-SAVE] Data normalized:', {
      title: vibelogData.title,
      teaserLength: vibelogData.teaser.length,
      contentLength: vibelogData.content.length,
      wordCount: vibelogData.word_count,
      hasTranscription: !!vibelogData.transcription,
      hasCoverImage: !!vibelogData.cover_image_url,
      hasAudio: !!vibelogData.audio_url,
      audioDuration: vibelogData.audio_duration,
      sessionId: vibelogData.session_id,
    });

    // === STEP 3: TRY DIRECT INSERT (Supabase client already initialized) ===
    console.log('💾 [VIBELOG-SAVE] Attempting direct insert...');
    try {
      const { data: directResult, error: directError } = await supabase
        .from('vibelogs')
        .insert([vibelogData])
        .select('id')
        .single();

      if (directError) {
        throw directError;
      }

      const vibelogId = directResult.id;

      // Update slug with unique ID suffix for guaranteed uniqueness
      const finalSlug = generateSlug(title, vibelogId);
      await supabase.from('vibelogs').update({ slug: finalSlug }).eq('id', vibelogId);

      console.log('✅ [VIBELOG-SAVE] Direct insert successful:', vibelogId, 'Slug:', finalSlug);
      return NextResponse.json({
        success: true,
        vibelogId: vibelogId,
        slug: finalSlug,
        message: 'Vibelog saved successfully',
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (directInsertError) {
      console.error('❌ [VIBELOG-SAVE] Direct insert failed:', directInsertError);

      // === FINAL FALLBACK: LOG TO FAILURES ===
      try {
        await supabase.from('vibelog_failures').insert([
          {
            attempted_data: vibelogData,
            error_message: `Direct insert failed: ${directInsertError.message || directInsertError}`,
            error_details: {
              direct_error: directInsertError,
              timestamp: new Date().toISOString(),
            },
          },
        ]);

        console.log('⚠️ [VIBELOG-SAVE] Logged to failures table for manual recovery');
        return NextResponse.json({
          success: true, // Still return success because we captured the data
          message: 'Vibelog captured for manual recovery',
          warnings: [...warnings, 'Stored in failures table - will be recovered manually'],
        });
      } catch (failureLogError) {
        console.error('💀 [VIBELOG-SAVE] CRITICAL: Even failure logging failed:', failureLogError);

        // Absolutely last resort - return the data to client for potential retry
        return NextResponse.json(
          {
            success: false,
            message: 'Complete storage failure - please retry',
            data: vibelogData, // Return data so client can potentially retry
            error: 'All storage mechanisms failed',
          },
          { status: 500 }
        );
      }
    }
  } catch (uncaughtError) {
    // === ABSOLUTE FINAL CATCH-ALL ===
    console.error('💥 [VIBELOG-SAVE] UNCAUGHT ERROR:', uncaughtError);

    // Try one last time to save to failures table
    if (supabase && requestBody) {
      try {
        await supabase.from('vibelog_failures').insert([
          {
            attempted_data: requestBody,
            error_message: `Uncaught error: ${uncaughtError}`,
            error_details: {
              error:
                uncaughtError instanceof Error
                  ? {
                      message: uncaughtError.message,
                      stack: uncaughtError.stack,
                    }
                  : uncaughtError,
              timestamp: new Date().toISOString(),
            },
          },
        ]);

        console.log('🆘 [VIBELOG-SAVE] Emergency save to failures table succeeded');
        return NextResponse.json({
          success: true,
          message: 'Emergency data capture successful - will be recovered',
          warnings: ['Uncaught error occurred but data was preserved'],
        });
      } catch (emergencyError) {
        console.error('☠️ [VIBELOG-SAVE] EMERGENCY SAVE FAILED:', emergencyError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Catastrophic failure occurred',
        error: uncaughtError instanceof Error ? uncaughtError.message : 'Unknown error',
        data: requestBody || null, // Return original data for potential client retry
      },
      { status: 500 }
    );
  }
}
