import { NextRequest, NextResponse } from 'next/server';

// import { checkAndBlockBots } from '@/lib/botid-check'; // DISABLED: Blocking legit users
import { getUserDefaultChannel } from '@/lib/channels';
import {
  createVibelog,
  handleAsyncTasks,
  logVibelogFailure,
  normalizeVibelogData,
  SaveVibelogRequest,
  updateVibelog,
} from '@/lib/services/vibelog-service';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let requestBody: SaveVibelogRequest | null = null;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;
  let vibelogData: any = null;

  try {
    // === STEP 0: BOT PROTECTION === DISABLED - was blocking legitimate users
    // const botCheck = await checkAndBlockBots();
    // if (botCheck) {
    //   return botCheck;
    // }

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

    console.log(
      '👤 [VIBELOG-SAVE] User:',
      userId ? `authenticated (${userId.substring(0, 8)}...)` : 'anonymous'
    );

    const { data: normalizedData, warnings } = await normalizeVibelogData(requestBody, userId);
    vibelogData = normalizedData;

    // Auto-assign default channel if user is authenticated and no channel specified
    if (userId && !vibelogData.channel_id) {
      const defaultChannel = await getUserDefaultChannel(userId);
      if (defaultChannel) {
        vibelogData.channel_id = defaultChannel.id;
        console.log('📺 [VIBELOG-SAVE] Auto-assigned to default channel:', defaultChannel.handle);
      }
    }

    console.log('📋 [VIBELOG-SAVE] Normalized data keys:', Object.keys(vibelogData));

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
      channelId: vibelogData.channel_id,
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
      // Use admin client to bypass RLS for inserts (auth already verified above)
      const supabaseAdmin = await createServerAdminClient();
      const result = await createVibelog(vibelogData, userId, supabaseAdmin);

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
      const errorMessage =
        directInsertError instanceof Error ? directInsertError.message : 'Database error';
      const errorStack = directInsertError instanceof Error ? directInsertError.stack : undefined;
      console.error('❌ [VIBELOG-SAVE] Direct insert failed:', {
        message: errorMessage,
        stack: errorStack,
        error: directInsertError,
      });

      // Log to failures table for recovery
      await logVibelogFailure(vibelogData, directInsertError, supabase);

      // Return error to client so they can handle it properly
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create vibelog',
          error: errorMessage,
          // Include more details in development
          details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (uncaughtError) {
    console.error('💥 [VIBELOG-SAVE] UNCAUGHT ERROR:', uncaughtError);

    // Try to log for recovery if possible
    if (supabase && requestBody) {
      await logVibelogFailure(requestBody, uncaughtError, supabase);
    }

    // Always return error to client
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save vibelog',
        error: uncaughtError instanceof Error ? uncaughtError.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
