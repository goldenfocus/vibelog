import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { rateLimit } from '@/lib/rateLimit';
import { TTS_BUCKET } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * POST /api/clone-voice
 *
 * Clones a user's voice from their recording.
 * Stores the voice clone ID in the database for future use.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit per user if logged in; otherwise per IP
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Limits: logged-in 100 per hour; anonymous 10 per day
    const isDev = process.env.NODE_ENV !== 'production';
    const baseOpts = userId
      ? { limit: 100, window: '1 h' as const }
      : { limit: 10, window: '24 h' as const };
    const opts = isDev ? { limit: 1000, window: '15 m' as const } : baseOpts;
    const rl = await rateLimit(request, 'clone-voice', opts, userId || undefined);

    if (!rl.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: userId
            ? 'Too many voice cloning requests. Please try again later.'
            : 'Daily limit reached. Sign in to get more requests!',
          ...rl,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(((rl.reset || 0) - Date.now()) / 1000)),
          },
        }
      );
    }

    // Check if Modal/Coqui XTTS is configured
    if (!config.ai.modal.enabled || !config.ai.modal.endpoint) {
      return NextResponse.json(
        {
          error: 'Voice cloning not configured',
          message: 'Modal/Coqui XTTS is not configured. Voice cloning is unavailable.',
        },
        { status: 503 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'You must be signed in to clone your voice.',
        },
        { status: 401 }
      );
    }

    // Get form data from request
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as File | Blob | null;
    const vibelogId = formData.get('vibelogId') as string | null;
    const voiceName = (formData.get('voiceName') as string | null) || 'My Voice';

    if (!audioBlob) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Ensure we have a File object with proper name and type
    let audioFile: File;

    if (audioBlob instanceof File) {
      // Already a File, use it directly
      audioFile = audioBlob;
    } else {
      // Convert Blob to File with proper name and type
      const arrayBuffer = await audioBlob.arrayBuffer();
      // Determine file extension from MIME type
      const extension = audioBlob.type.includes('webm')
        ? 'webm'
        : audioBlob.type.includes('wav')
          ? 'wav'
          : audioBlob.type.includes('mp4')
            ? 'mp4'
            : 'webm'; // default to webm

      const fileName = `recording_${Date.now()}.${extension}`;
      audioFile = new File([arrayBuffer], fileName, {
        type: audioBlob.type || 'audio/webm',
      });
    }

    // Validate audio file size (max 25MB for cloning)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioBlob.size > maxSize) {
      return NextResponse.json(
        {
          error: 'Audio file too large',
          message: 'Audio file must be under 25MB for voice cloning.',
        },
        { status: 400 }
      );
    }

    // Voice cloning services typically require at least 1KB, but recommend 30+ seconds for quality
    // We'll accept smaller files but warn about quality
    if (audioBlob.size < 1024) {
      return NextResponse.json(
        {
          error: 'Audio file too small',
          message:
            'Audio file must be at least 1KB. For best voice cloning results, provide at least 30 seconds (512KB) of clear speech.',
        },
        { status: 400 }
      );
    }

    // Warn (but don't block) if audio is too short for good quality
    const recommendedMinSize = 512 * 1024; // 512KB ≈ 30 seconds
    if (audioBlob.size < recommendedMinSize) {
      console.warn(
        `⚠️ [VOICE-CLONE] Audio file is smaller than recommended (${audioBlob.size} bytes < ${recommendedMinSize} bytes). Voice quality may be reduced.`
      );
    }

    console.log('🎤 [VOICE-CLONE] Starting voice cloning with Modal/Coqui XTTS:', {
      audioSize: audioBlob.size,
      audioType: audioFile.type,
      fileName: audioFile.name,
      voiceName,
      userId,
    });

    // For Modal/Coqui XTTS, we store the voice audio in Supabase storage
    // The "voice ID" is just a unique identifier that maps to the storage path
    const voiceId = randomUUID();
    const voiceStoragePath = `voices/${userId}/voice_sample.wav`;

    // Convert audio to WAV format if needed (Coqui XTTS works best with WAV)
    // For now, we'll upload the audio as-is and let Modal handle conversion
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Upload voice sample to Supabase storage
    const adminSupabase = await createServerAdminClient();
    try {
      const { error: uploadError } = await adminSupabase.storage
        .from(TTS_BUCKET)
        .upload(voiceStoragePath, audioBuffer, {
          contentType: 'audio/wav',
          upsert: true, // Replace existing voice sample if user reclones
        });

      if (uploadError) {
        console.error('❌ [VOICE-CLONE] Failed to upload voice sample to storage:', uploadError);
        return NextResponse.json(
          {
            error: 'Voice cloning failed',
            message: 'Failed to store voice sample. Please try again.',
            details: uploadError.message,
          },
          { status: 500 }
        );
      }

      console.log('✅ [VOICE-CLONE] Voice sample uploaded to storage:', voiceStoragePath);
    } catch (storageError) {
      console.error('❌ [VOICE-CLONE] Storage error:', storageError);
      return NextResponse.json(
        {
          error: 'Voice cloning failed',
          message: 'Failed to store voice sample. Please try again.',
          details: storageError instanceof Error ? storageError.message : 'Unknown storage error',
        },
        { status: 500 }
      );
    }

    console.log('✅ [VOICE-CLONE] Voice cloned successfully:', voiceId);

    // Store voice clone ID in database
    // Note: For Modal/Coqui XTTS, the voiceId is just a reference ID
    // The actual audio is stored at voiceStoragePath in the tts-audio bucket
    try {
      const { data, error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          voice_clone_id: voiceId,
          voice_clone_name: voiceName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('❌ Failed to save voice clone to profile:', updateError);
        console.error('   User ID:', userId);
        console.error('   Voice ID:', voiceId);
        // Don't fail the request - voice is cloned, just DB update failed
      } else if (!data || data.length === 0) {
        console.warn('⚠️ No profile found for user:', userId);
      } else {
        console.log('✅ Successfully saved voice_clone_id to profile:', userId);
      }
    } catch (error) {
      console.error('❌ Exception while saving voice clone to profile:', error);
      // Don't fail the request - voice is cloned, just DB update failed
    }

    // If vibelogId is provided, store voice clone ID in vibelog
    if (vibelogId) {
      try {
        const { data, error: updateError } = await adminSupabase
          .from('vibelogs')
          .update({
            voice_clone_id: voiceId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vibelogId)
          .select();

        if (updateError) {
          console.error('❌ Failed to save voice clone to vibelog:', updateError);
          console.error('   Vibelog ID:', vibelogId);
          console.error('   Voice ID:', voiceId);
        } else if (!data || data.length === 0) {
          console.warn('⚠️ No vibelog found with ID:', vibelogId);
        } else {
          console.log('✅ Successfully saved voice_clone_id to vibelog:', vibelogId);
        }
      } catch (error) {
        console.error('❌ Exception while saving voice clone to vibelog:', error);
      }
    }

    return NextResponse.json({
      success: true,
      voiceId,
      voiceName,
      userId, // Return server-verified userId for save endpoint
      message: 'Voice cloned successfully!',
    });
  } catch (error) {
    console.error('Voice cloning error:', error);

    let errorMessage = 'Failed to clone voice';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('API key')) {
        errorMessage = 'Voice cloning service configuration error.';
        statusCode = 401;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.error('Detailed voice cloning error:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
