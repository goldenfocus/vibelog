import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { config } from '@/lib/config';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { storeTTSAudio, TTS_BUCKET, extractTTSPathFromUrl } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';
import { hashTTSContent } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Rate limit per user if logged in; otherwise per IP
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Limits: logged-in 10000 per hour; anonymous 10000 per day
    const isDev = process.env.NODE_ENV !== 'production';
    const baseOpts = userId
      ? { limit: 10000, window: '1 h' as const }
      : { limit: 10000, window: '24 h' as const };
    const opts = isDev ? { limit: 10000, window: '15 m' as const } : baseOpts;
    const rl = await rateLimit(request, 'text-to-speech', opts, userId || undefined);

    if (!rl.success) {
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message:
              "You've used your 10000 free text-to-speech generations today. Sign in with Google to get 10000 per hour!",
            upgrade: {
              action: 'Sign in with Google',
              benefits: [
                '10000 requests per hour (vs 10000 per day)',
                'Higher quality voice synthesis',
                'Multiple voice options',
                'Faster processing priority',
              ],
            },
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
      return tooManyResponse(rl);
    }

    const { text, voice = 'shimmer', vibelogId, voiceCloneId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    // Check if vibelog has a voice_clone_id
    let voiceCloneIdToUse = voiceCloneId;
    if (!voiceCloneIdToUse && vibelogId) {
      try {
        const { data: vibelog } = await adminSupabase
          .from('vibelogs')
          .select('voice_clone_id')
          .eq('id', vibelogId)
          .single();

        if (vibelog?.voice_clone_id) {
          voiceCloneIdToUse = vibelog.voice_clone_id;
        }
      } catch {
        // If vibelog not found or no voice_clone_id, continue with regular TTS
        console.log('No voice clone ID found for vibelog, using regular TTS');
      }
    }

    // If no voice clone ID, try to get from user profile
    if (!voiceCloneIdToUse && userId) {
      try {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('voice_clone_id')
          .eq('id', userId)
          .single();

        if (profile?.voice_clone_id) {
          voiceCloneIdToUse = profile.voice_clone_id;
        }
      } catch {
        // If profile not found or no voice_clone_id, continue with regular TTS
        console.log('No voice clone ID found for user, using regular TTS');
      }
    }

    // Validate text length (OpenAI TTS has a 4096 character limit)
    if (text.length > 4000) {
      return NextResponse.json(
        {
          error: 'Text too long',
          message: 'Text must be under 4000 characters for text-to-speech conversion',
        },
        { status: 400 }
      );
    }

    // Generate cache key (hash of text + voice + voiceCloneId if present)
    const cacheKey = voiceCloneIdToUse ? `${text}:${voiceCloneIdToUse}` : `${text}:${voice}`;
    const contentHash = hashTTSContent(cacheKey, voiceCloneIdToUse || voice);
    const adminSupabase = await createServerAdminClient();

    // Check cache first
    const { data: cachedEntry } = await adminSupabase
      .from('tts_cache')
      .select('audio_url, audio_size_bytes')
      .eq('content_hash', contentHash)
      .single();

    if (cachedEntry?.audio_url) {
      // Cache hit! Increment access count and return cached audio
      await adminSupabase.rpc('increment_tts_cache_access', {
        p_content_hash: contentHash,
      });

      // If vibelogId is provided and vibelog doesn't have audio_url yet, save it
      if (vibelogId && cachedEntry.audio_url) {
        try {
          // Check if vibelog exists and doesn't have audio_url
          const { data: vibelog } = await adminSupabase
            .from('vibelogs')
            .select('id, audio_url')
            .eq('id', vibelogId)
            .single();

          if (vibelog && !vibelog.audio_url) {
            // Save audio_url to vibelog for future users
            await adminSupabase
              .from('vibelogs')
              .update({
                audio_url: cachedEntry.audio_url,
                updated_at: new Date().toISOString(),
              })
              .eq('id', vibelogId);

            console.log(`💾 [TTS] Saved cached audio_url to vibelog ${vibelogId} for future use`);
          }
        } catch (error) {
          // Don't fail the request if saving to vibelog fails
          console.error('Failed to save cached audio_url to vibelog:', error);
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ TTS cache hit for hash:', contentHash.substring(0, 8) + '...');
      }

      // Fetch cached audio from storage and return it
      try {
        // Extract storage path from cached URL
        const storagePath = extractTTSPathFromUrl(cachedEntry.audio_url);

        const { data: audioData, error: downloadError } = await adminSupabase.storage
          .from(TTS_BUCKET)
          .download(storagePath);

        if (downloadError || !audioData) {
          // Cache entry exists but file missing - regenerate
          console.warn('Cached audio file missing, regenerating:', downloadError);
        } else {
          const audioBuffer = Buffer.from(await audioData.arrayBuffer());
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.length.toString(),
              'Cache-Control': 'public, max-age=31536000', // Cache for 1 year (immutable)
              'X-TTS-Cache': 'hit',
            },
          });
        }
      } catch (error) {
        // Fallback: regenerate if download fails
        console.warn('Failed to fetch cached audio, regenerating:', error);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '🔄 TTS cache miss, generating for text:',
        text.substring(0, 100) + '...',
        'with voice:',
        voice
      );
    }

    let audioBuffer: Buffer;

    // Use cloned voice if available, otherwise use OpenAI TTS
    if (voiceCloneIdToUse && config.ai.elevenlabs.apiKey) {
      // Use ElevenLabs with cloned voice
      if (process.env.NODE_ENV !== 'production') {
        console.log('🎤 Using cloned voice:', voiceCloneIdToUse);
      }

      try {
        const elevenLabsResponse = await fetch(
          `${config.ai.elevenlabs.apiUrl}/text-to-speech/${voiceCloneIdToUse}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': config.ai.elevenlabs.apiKey!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2', // Best quality model
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        );

        if (!elevenLabsResponse.ok) {
          const errorData = await elevenLabsResponse.json().catch(() => ({}));
          console.error('ElevenLabs TTS error:', errorData);

          // Fallback to OpenAI TTS if ElevenLabs fails
          throw new Error('ElevenLabs TTS failed, falling back to OpenAI');
        }

        const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();
        audioBuffer = Buffer.from(audioArrayBuffer);
      } catch (error) {
        console.warn('ElevenLabs TTS failed, falling back to OpenAI:', error);
        // Fall through to OpenAI TTS
        voiceCloneIdToUse = undefined;
      }
    }

    // Fallback to OpenAI TTS if no cloned voice or if ElevenLabs failed
    if (!voiceCloneIdToUse || !audioBuffer!) {
      // Check if we have a real API key, otherwise return mock response
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === 'dummy_key' ||
        process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
      ) {
        console.log('🧪 Using mock TTS response for development/testing');

        // Return a small silent audio file as mock
        const mockAudioData = new Uint8Array([
          // Minimal WAV file header for silence (44 bytes + minimal data)
          0x52,
          0x49,
          0x46,
          0x46, // "RIFF"
          0x28,
          0x00,
          0x00,
          0x00, // File size - 8
          0x57,
          0x41,
          0x56,
          0x45, // "WAVE"
          0x66,
          0x6d,
          0x74,
          0x20, // "fmt "
          0x10,
          0x00,
          0x00,
          0x00, // Subchunk1Size
          0x01,
          0x00,
          0x01,
          0x00, // AudioFormat, NumChannels
          0x44,
          0xac,
          0x00,
          0x00, // SampleRate (44100)
          0x88,
          0x58,
          0x01,
          0x00, // ByteRate
          0x02,
          0x00,
          0x10,
          0x00, // BlockAlign, BitsPerSample
          0x64,
          0x61,
          0x74,
          0x61, // "data"
          0x04,
          0x00,
          0x00,
          0x00, // Data size
          0x00,
          0x00,
          0x00,
          0x00, // Silence data
        ]);

        return new NextResponse(mockAudioData, {
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': mockAudioData.length.toString(),
          },
        });
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 60_000,
      });

      // Generate speech using OpenAI TTS
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        response_format: 'mp3',
      });

      audioBuffer = Buffer.from(await mp3.arrayBuffer());
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('TTS generation completed, audio size:', audioBuffer.length, 'bytes');
    }

    // Store in cache and storage for future use
    let audioUrl: string | null = null;
    try {
      // Store audio file in Supabase storage
      audioUrl = await storeTTSAudio(contentHash, audioBuffer);

      // Save to cache table
      await adminSupabase.from('tts_cache').upsert(
        {
          content_hash: contentHash,
          text_content: text,
          voice: voiceCloneIdToUse || voice,
          audio_url: audioUrl,
          audio_size_bytes: audioBuffer.length,
          last_accessed_at: new Date().toISOString(),
          access_count: 1,
        },
        {
          onConflict: 'content_hash',
          // If already exists, update URL and size (shouldn't happen with hash, but safe)
        }
      );

      // If vibelogId is provided and vibelog doesn't have audio_url yet, save it
      if (vibelogId && audioUrl) {
        try {
          // Check if vibelog exists and doesn't have audio_url
          const { data: vibelog } = await adminSupabase
            .from('vibelogs')
            .select('id, audio_url')
            .eq('id', vibelogId)
            .single();

          if (vibelog && !vibelog.audio_url) {
            // Save audio_url to vibelog for future users
            await adminSupabase
              .from('vibelogs')
              .update({
                audio_url: audioUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', vibelogId);

            console.log(`💾 [TTS] Saved audio_url to vibelog ${vibelogId} for future use`);
          }
        } catch (error) {
          // Don't fail the request if saving to vibelog fails
          console.error('Failed to save audio_url to vibelog:', error);
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('💾 TTS cached successfully:', audioUrl);
      }
    } catch (cacheError) {
      // Don't fail the request if caching fails - still return the audio
      console.error('Failed to cache TTS audio:', cacheError);
    }

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-TTS-Cache': 'miss',
      },
    });
  } catch (error) {
    console.error('TTS generation error:', error);

    let errorMessage = 'Failed to generate speech';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = 'TTS service configuration error.';
        statusCode = 401;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.error('Detailed TTS error:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
