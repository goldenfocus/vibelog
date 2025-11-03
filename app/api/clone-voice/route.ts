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

    // Ensure we have a File object with proper name and type for ElevenLabs
    // ElevenLabs API works best with File objects that have proper filenames
    let audioFileForElevenLabs: File;

    if (audioBlob instanceof File) {
      // Already a File, use it directly
      audioFileForElevenLabs = audioBlob;
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
      audioFileForElevenLabs = new File([arrayBuffer], fileName, {
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

    // ElevenLabs requires at least 1KB, but recommends 1+ minute for quality
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

    // Clone voice using ElevenLabs API
    // Create FormData for ElevenLabs API
    // Required fields: 'name' and 'files'
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('name', voiceName);
    // audioFileForElevenLabs is now guaranteed to be a File with proper name
    elevenLabsFormData.append('files', audioFileForElevenLabs);

    console.log('🎤 [VOICE-CLONE] Sending request to ElevenLabs:', {
      url: `${config.ai.elevenlabs.apiUrl}/voices/add`,
      audioSize: audioBlob.size,
      audioType: audioFileForElevenLabs.type,
      fileName: audioFileForElevenLabs.name,
      voiceName,
      hasApiKey: !!config.ai.elevenlabs.apiKey,
    });

    // Clone voice using ElevenLabs API
    let elevenLabsResponse: Response;
    try {
      elevenLabsResponse = await fetch(`${config.ai.elevenlabs.apiUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': config.ai.elevenlabs.apiKey!,
          // Don't set Content-Type header - fetch will set it with boundary for FormData
        },
        body: elevenLabsFormData,
      });
    } catch (fetchError) {
      console.error('❌ [VOICE-CLONE] Network error calling ElevenLabs:', fetchError);
      return NextResponse.json(
        {
          error: 'Network error',
          message:
            'Failed to connect to voice cloning service. Please check your internet connection and try again.',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown network error',
        },
        { status: 503 }
      );
    }

    // Get response text first to handle both JSON and text errors
    const responseText = await elevenLabsResponse.text();
    let errorData: {
      detail?: { message?: string };
      error?: { message?: string };
      message?: string;
    } | null = null;
    let clonedVoiceData: { voice_id?: string; voiceId?: string; id?: string } | null = null;

    try {
      if (!elevenLabsResponse.ok) {
        errorData = JSON.parse(responseText);
      } else {
        clonedVoiceData = JSON.parse(responseText);
      }
    } catch (parseError) {
      // If response is not JSON, use text as error message
      console.error('❌ [VOICE-CLONE] Failed to parse ElevenLabs response:', parseError);
      console.error('Response text:', responseText.substring(0, 500));

      if (!elevenLabsResponse.ok) {
        return NextResponse.json(
          {
            error: 'Voice cloning failed',
            message: `Voice cloning service returned an error (${elevenLabsResponse.status}): ${responseText.substring(0, 200)}`,
            details: responseText,
          },
          { status: elevenLabsResponse.status }
        );
      }
    }

    if (!elevenLabsResponse.ok) {
      console.error('❌ [VOICE-CLONE] ElevenLabs API error:', {
        status: elevenLabsResponse.status,
        statusText: elevenLabsResponse.statusText,
        errorData,
        responseText: responseText.substring(0, 500),
      });

      // Extract error message from various possible formats
      let errorMessage = 'Failed to clone voice. Please try again.';
      if (errorData) {
        if (errorData.detail?.message) {
          errorMessage = errorData.detail.message;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (responseText) {
        errorMessage = responseText.substring(0, 200);
      }

      return NextResponse.json(
        {
          error: 'Voice cloning failed',
          message: errorMessage,
          details: errorData || responseText,
          status: elevenLabsResponse.status,
        },
        { status: elevenLabsResponse.status }
      );
    }

    // Validate response structure
    if (!clonedVoiceData) {
      console.error('❌ [VOICE-CLONE] No data in successful response');
      return NextResponse.json(
        {
          error: 'Voice cloning failed',
          message: 'Invalid response from voice cloning service.',
          details: responseText,
        },
        { status: 500 }
      );
    }

    // Handle different possible response formats
    const voiceId = clonedVoiceData.voice_id || clonedVoiceData.voiceId || clonedVoiceData.id;

    if (!voiceId) {
      console.error('❌ [VOICE-CLONE] No voice_id in response:', clonedVoiceData);
      return NextResponse.json(
        {
          error: 'Voice cloning failed',
          message: 'No voice ID returned from cloning service.',
          details: clonedVoiceData,
        },
        { status: 500 }
      );
    }

    console.log('✅ [VOICE-CLONE] Voice cloned successfully:', voiceId);

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
