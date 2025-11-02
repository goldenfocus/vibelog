import { NextRequest, NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { rateLimit } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * POST /api/clone-voice
 *
 * Clones a user's voice from their recording using ElevenLabs API.
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

    // Check if ElevenLabs API key is configured
    if (!config.ai.elevenlabs.apiKey) {
      return NextResponse.json(
        {
          error: 'Voice cloning not configured',
          message: 'ElevenLabs API key is not configured. Voice cloning is unavailable.',
        },
        { status: 503 }
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

    // Handle case where audio is received as a blob/file
    let audioFileForElevenLabs: File | Blob;

    // If audioBlob is not a File, convert it to one
    if (audioBlob instanceof File) {
      audioFileForElevenLabs = audioBlob;
    } else {
      // It's a Blob, convert to File
      const arrayBuffer = await audioBlob.arrayBuffer();
      audioFileForElevenLabs = new File([arrayBuffer], 'recording.webm', {
        type: audioBlob.type || 'audio/webm',
      });
    }

    // Validate audio file size (ElevenLabs requires at least 1 minute, max 25MB for cloning)
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

    if (audioBlob.size < 1024) {
      return NextResponse.json(
        {
          error: 'Audio file too small',
          message:
            'Audio file must be at least 1KB. For best results, provide at least 1 minute of clear speech.',
        },
        { status: 400 }
      );
    }

    // Clone voice using ElevenLabs API
    // Create FormData for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('name', voiceName);
    elevenLabsFormData.append('files', audioFileForElevenLabs);

    // Clone voice using ElevenLabs API
    const elevenLabsResponse = await fetch(`${config.ai.elevenlabs.apiUrl}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': config.ai.elevenlabs.apiKey!,
        // Don't set Content-Type header - fetch will set it with boundary for FormData
      },
      body: elevenLabsFormData,
    });

    if (!elevenLabsResponse.ok) {
      const errorData = await elevenLabsResponse.json().catch(() => ({
        error: 'Failed to clone voice',
      }));

      console.error('ElevenLabs voice cloning error:', errorData);

      return NextResponse.json(
        {
          error: 'Voice cloning failed',
          message: errorData.error?.message || 'Failed to clone voice. Please try again.',
        },
        { status: elevenLabsResponse.status }
      );
    }

    const clonedVoiceData = await elevenLabsResponse.json();
    const voiceId = clonedVoiceData.voice_id;

    if (!voiceId) {
      return NextResponse.json(
        {
          error: 'Voice cloning failed',
          message: 'No voice ID returned from cloning service.',
        },
        { status: 500 }
      );
    }

    // Store voice clone ID in database
    const adminSupabase = await createServerAdminClient();

    if (userId) {
      // Store in user profile for future use
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
        } else if (!data || data.length === 0) {
          console.warn('⚠️ No profile found for user:', userId);
        } else {
          console.log('✅ Successfully saved voice_clone_id to profile:', userId);
        }
      } catch (error) {
        console.error('❌ Exception while saving voice clone to profile:', error);
      }
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
