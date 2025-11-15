import { NextRequest, NextResponse } from 'next/server';

import { generatePublicSlug, generateUserSlug, generateVibelogSEO } from '@/lib/seo';
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

// Removed: Now using centralized utilities from @/lib/seo

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

    const isAnonymous = !userId;

    // Generate appropriate slug based on auth status
    const publicSlug = isAnonymous ? generatePublicSlug(title) : null;
    const userSlug = userId ? generateUserSlug(title, sessionId) : null;

    // Generate SEO metadata using centralized utility
    const seoMetadata = generateVibelogSEO(title, fullContent, teaserContent);

    // Prepare data object with both teaser and full content
    vibelogData = {
      user_id: userId, // SECURITY: Only use server-verified userId (NULL for anonymous)
      session_id: sessionId, // Keep for backward compatibility
      title: title,
      slug: userSlug, // User-based slug (NULL for anonymous)
      public_slug: publicSlug, // Public slug for anonymous posts
      teaser: teaserContent, // Store AI-generated teaser for public preview
      content: fullContent, // Store full content
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
      seo_title: seoMetadata.title,
      seo_description: seoMetadata.description,
      // ALL vibelogs are immediately public and published (TikTok/Medium style feed)
      is_public: true,
      is_published: true,
      published_at: new Date().toISOString(),
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

      // Update slug with unique ID suffix for guaranteed uniqueness (for owned posts only)
      let finalSlug = publicSlug; // Use public slug for anonymous
      let publicUrl = publicSlug ? `/v/${publicSlug}` : null;

      if (userId) {
        finalSlug = generateUserSlug(title, vibelogId);
        await supabase.from('vibelogs').update({ slug: finalSlug }).eq('id', vibelogId);
        publicUrl = `/@${user?.user_metadata?.username || user?.email?.split('@')[0] || 'user'}/${finalSlug}`;
      }

      console.log('✅ [VIBELOG-SAVE] Direct insert successful:', vibelogId, 'Slug:', finalSlug);
      console.log('📍 [VIBELOG-SAVE] Public URL:', publicUrl);

      // === STEP 4: GENERATE TTS AUDIO IN BACKGROUND (if no audio provided) ===
      // Generate TTS audio automatically for instant playback
      // Use the /api/text-to-speech endpoint which handles voice cloning properly
      if (!vibelogData.audio_url && fullContent) {
        // Fire and forget - don't block the response
        (async () => {
          try {
            console.log('🎙️ [VIBELOG-SAVE] Generating TTS audio in background...');

            // Clean content for TTS (remove markdown)
            const cleanContent = fullContent
              .replace(/#{1,6}\s/g, '') // Remove headers
              .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
              .replace(/\*(.*?)\*/g, '$1') // Remove italic
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
              .replace(/`([^`]+)`/g, '$1') // Remove code
              .replace(/\n\s*\n/g, '\n') // Remove extra newlines
              .trim();

            // Truncate if too long (OpenAI TTS has 4096 char limit)
            const ttsText =
              cleanContent.length > 4000 ? cleanContent.substring(0, 4000) + '...' : cleanContent;

            if (!ttsText || ttsText.length < 10) {
              console.log('⚠️ [VIBELOG-SAVE] Content too short for TTS, skipping');
              return;
            }

            // Call the TTS API endpoint which handles voice cloning properly
            // This will use the user's cloned voice if available, otherwise default voice
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const ttsResponse = await fetch(`${baseUrl}/api/text-to-speech`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: ttsText,
                voice: 'shimmer', // Default fallback if no cloned voice
                vibelogId: vibelogId,
              }),
            });

            if (!ttsResponse.ok) {
              console.error('⚠️ [VIBELOG-SAVE] TTS generation failed:', await ttsResponse.text());
              return;
            }

            console.log('✅ [VIBELOG-SAVE] TTS audio generated successfully');
            // The TTS endpoint automatically saves the audio_url to the vibelog
          } catch (error) {
            // Don't fail the save if TTS generation fails
            console.error('⚠️ [VIBELOG-SAVE] TTS generation failed (non-critical):', error);
          }
        })();
      }

      return NextResponse.json({
        success: true,
        vibelogId: vibelogId,
        slug: finalSlug,
        publicUrl: publicUrl,
        isAnonymous: isAnonymous,
        message: isAnonymous
          ? 'Vibelog published to community! Sign in to save to your profile.'
          : 'Vibelog published to community successfully!',
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
          warnings: [
            ...warnings,
            'Stored in failures table - will be recovered manually',
            `DB Error: ${directInsertError.message || JSON.stringify(directInsertError)}`,
          ],
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
