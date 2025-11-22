import { NextRequest, NextResponse } from 'next/server';

import { checkAndBlockBots } from '@/lib/botid-check';
import {
  createVibelog,
  handleAsyncTasks,
  logVibelogFailure,
  normalizeVibelogData,
  SaveVibelogRequest,
  updateVibelog,
} from '@/lib/services/vibelog-service';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let requestBody: SaveVibelogRequest | null = null;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;
  let vibelogData: any = null;

  try {
    // === STEP 0: BOT PROTECTION ===
    const botCheck = await checkAndBlockBots();
    if (botCheck) {
      return botCheck;
    }

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

    supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { data: normalizedData, warnings } = await normalizeVibelogData(requestBody, userId);
    vibelogData = normalizedData;

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

    // === STEP 3: UPDATE OR INSERT ===
    if (requestBody.vibelogId) {
      console.log('💾 [VIBELOG-SAVE] Updating existing vibelog:', requestBody.vibelogId);
      try {
        const result = await updateVibelog(requestBody.vibelogId, vibelogData, userId!, supabase);

        // Async tasks
        handleAsyncTasks(requestBody.vibelogId, vibelogData, userId, supabase);

        let publicUrl = null;
        if (result.slug) {
          publicUrl = result.isAnonymous
            ? `/v/${result.slug}`
            : `/@${user?.user_metadata?.username || 'user'}/${result.slug}`;
        }

        return NextResponse.json({
          success: true,
          vibelogId: result.vibelogId,
          slug: result.slug,
          publicUrl: publicUrl,
          isAnonymous: result.isAnonymous,
          message: 'Vibelog updated successfully!',
          warnings: warnings.length > 0 ? warnings : undefined,
        });
      } catch (updateError: unknown) {
        console.error('❌ [VIBELOG-SAVE] Update failed:', updateError);
        const message = updateError instanceof Error ? updateError.message : 'Unknown error';
        const status =
          message === 'Vibelog not found' ? 404 : message === 'Permission denied' ? 403 : 500;

        return NextResponse.json(
          {
            success: false,
            message:
              message === 'Permission denied' || message === 'Vibelog not found'
                ? message
                : 'Failed to update vibelog',
            error: message,
          },
          { status }
        );
      }
    }

    // === STEP 3B: TRY DIRECT INSERT (new vibelog) ===
    console.log('💾 [VIBELOG-SAVE] Attempting direct insert...');
    try {
      const result = await createVibelog(vibelogData, userId, supabase);

      // Async tasks
      handleAsyncTasks(result.vibelogId, vibelogData, userId, supabase);

      const publicUrl = result.slug
        ? result.isAnonymous
          ? `/v/${result.slug}`
          : `/@${user?.user_metadata?.username || user?.email?.split('@')[0] || 'user'}/${result.slug}`
        : null;

      console.log(
        '✅ [VIBELOG-SAVE] Direct insert successful:',
        result.vibelogId,
        'Slug:',
        result.slug
      );

      return NextResponse.json({
        success: true,
        vibelogId: result.vibelogId,
        slug: result.slug,
        publicUrl: publicUrl,
        isAnonymous: result.isAnonymous,
        message: result.isAnonymous
          ? 'Vibelog published to community! Sign in to save to your profile.'
          : 'Vibelog published to community successfully!',
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (directInsertError) {
      console.error('❌ [VIBELOG-SAVE] Direct insert failed:', directInsertError);

      // Fallback: Log to failures
      await logVibelogFailure(vibelogData, directInsertError, supabase);

      return NextResponse.json({
        success: true, // Still return success because we captured the data
        message: 'Vibelog captured for manual recovery',
        warnings: [
          ...warnings,
          'Stored in failures table - will be recovered manually',
          `DB Error: ${directInsertError instanceof Error ? directInsertError.message : JSON.stringify(directInsertError)}`,
        ],
      });
    }
  } catch (uncaughtError) {
    console.error('💥 [VIBELOG-SAVE] UNCAUGHT ERROR:', uncaughtError);

    if (supabase && requestBody) {
      await logVibelogFailure(requestBody, uncaughtError, supabase);
      return NextResponse.json({
        success: true,
        message: 'Emergency data capture successful - will be recovered',
        warnings: ['Uncaught error occurred but data was preserved'],
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Catastrophic failure occurred',
        error: uncaughtError instanceof Error ? uncaughtError.message : 'Unknown error',
        data: requestBody || null,
      },
      { status: 500 }
    );
  }
}
