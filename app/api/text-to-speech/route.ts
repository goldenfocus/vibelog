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

    // Initialize adminSupabase early since we need it for voice clone ID lookup
    const adminSupabase = await createServerAdminClient();

    // Check if vibelog has a voice_clone_id
    let voiceCloneIdToUse = voiceCloneId;
    if (!voiceCloneIdToUse && vibelogId) {
      try {
        const { data: vibelog, error: vibelogError } = await adminSupabase
          .from('vibelogs')
          .select('voice_clone_id, user_id')
          .eq('id', vibelogId)
          .single();

        if (vibelogError) {
          console.log('[TTS] Vibelog lookup error:', vibelogError.message);
        } else if (vibelog?.voice_clone_id) {
          voiceCloneIdToUse = vibelog.voice_clone_id;
          console.log('[TTS] Found voice_clone_id from vibelog:', voiceCloneIdToUse);
        } else {
          console.log('[TTS] No voice_clone_id found in vibelog, will check profile');
          // Also try to get from vibelog's author profile
          if (vibelog?.user_id) {
            try {
              const { data: profile } = await adminSupabase
                .from('profiles')
                .select('voice_clone_id')
                .eq('id', vibelog.user_id)
                .single();

              if (profile?.voice_clone_id) {
                voiceCloneIdToUse = profile.voice_clone_id;
                console.log(
                  '[TTS] Found voice_clone_id from vibelog author profile:',
                  voiceCloneIdToUse
                );
              }
            } catch {
              // Ignore errors
            }
          }
        }
      } catch (error) {
        console.error('[TTS] Error looking up vibelog voice_clone_id:', error);
      }
    }

    // NOTE: We intentionally do NOT fallback to the current viewer's voice clone.
    // The voice should always match the content author, not the person viewing it.
    // If no author voice is found, we'll use the default TTS voice.
    if (!voiceCloneIdToUse) {
      console.log('[TTS] Using default voice (no cloned voice available for author)');
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
      // IMPORTANT: Only save if this cached audio was generated with the CREATOR'S voice
      if (vibelogId && cachedEntry.audio_url) {
        try {
          // Check if vibelog exists and doesn't have audio_url
          const { data: vibelog } = await adminSupabase
            .from('vibelogs')
            .select('id, audio_url, voice_clone_id')
            .eq('id', vibelogId)
            .single();

          if (vibelog && !vibelog.audio_url) {
            // CRITICAL: Only save cached audio if it matches the creator's voice
            // This ensures we ALWAYS play the creator's voice, never default voice
            const creatorVoiceId = vibelog.voice_clone_id;
            const cachedWithCreatorVoice = !creatorVoiceId || voiceCloneIdToUse === creatorVoiceId;

            if (cachedWithCreatorVoice) {
              // ✅ This cached audio uses creator's voice - safe to save for instant playback
              await adminSupabase
                .from('vibelogs')
                .update({
                  audio_url: cachedEntry.audio_url,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', vibelogId);

              console.log(
                `💾 [TTS] Saved cached audio_url to vibelog ${vibelogId} (creator's voice)`
              );
            } else {
              // ❌ Cached audio uses wrong voice - don't save, but still return it for this request
              console.log(
                `⚠️ [TTS] NOT saving cached audio to vibelog ${vibelogId} - voice mismatch (cached: ${voiceCloneIdToUse}, creator: ${creatorVoiceId})`
              );
            }
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
          const audioUint8Array = new Uint8Array(audioBuffer);
          return new NextResponse(audioUint8Array, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioUint8Array.length.toString(),
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

    let audioBuffer: Buffer | undefined;

    // Use cloned voice if available, otherwise use OpenAI TTS
    if (voiceCloneIdToUse && config.ai.elevenlabs.apiKey) {
      // Use ElevenLabs with cloned voice
      if (process.env.NODE_ENV !== 'production') {
        console.log('🎤 Using cloned voice:', voiceCloneIdToUse);
      }

      // Retry logic for ElevenLabs API (helps with network/timeout issues on mobile)
      const MAX_RETRIES = 3;
      const RETRY_DELAY_BASE = 1000; // 1 second base delay

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 2); // 1s, 2s, 4s
            console.log(`🔄 [ElevenLabs] Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

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
              signal: AbortSignal.timeout(30000), // 30 second timeout per attempt
            }
          );

          if (!elevenLabsResponse.ok) {
            const errorData = await elevenLabsResponse.json().catch(() => ({}));
            console.error(`❌ [ElevenLabs] Attempt ${attempt} failed:`, errorData);

            // If rate limited or server error, retry
            if (
              elevenLabsResponse.status === 429 ||
              elevenLabsResponse.status >= 500 ||
              attempt < MAX_RETRIES
            ) {
              continue; // Retry
            }

            // Fallback to OpenAI TTS if all retries exhausted
            throw new Error('ElevenLabs TTS failed after retries, falling back to OpenAI');
          }

          const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();
          audioBuffer = Buffer.from(audioArrayBuffer);
          console.log(`✅ [ElevenLabs] Success on attempt ${attempt}`);
          break; // Success, exit retry loop
        } catch (error) {
          console.warn(`⚠️ [ElevenLabs] Attempt ${attempt}/${MAX_RETRIES} error:`, error);

          // If this was the last attempt, fall back to OpenAI
          if (attempt === MAX_RETRIES) {
            console.warn('❌ [ElevenLabs] All retries exhausted, falling back to OpenAI');
            audioBuffer = undefined;
            break;
          }
          // Otherwise, continue to next retry
        }
      }
    }

    // Fallback to OpenAI TTS if no cloned voice or if ElevenLabs failed
    if (!audioBuffer) {
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
      // IMPORTANT: Only save if this audio was generated with the CREATOR'S voice
      if (vibelogId && audioUrl) {
        try {
          // Check if vibelog exists and doesn't have audio_url
          const { data: vibelog } = await adminSupabase
            .from('vibelogs')
            .select('id, audio_url, voice_clone_id')
            .eq('id', vibelogId)
            .single();

          if (vibelog && !vibelog.audio_url) {
            // CRITICAL: Only save audio if it matches the creator's voice
            // This ensures we ALWAYS play the creator's voice, never default voice
            const creatorVoiceId = vibelog.voice_clone_id;
            const generatedWithCreatorVoice =
              !creatorVoiceId || voiceCloneIdToUse === creatorVoiceId;

            if (generatedWithCreatorVoice) {
              // ✅ This audio uses creator's voice - safe to save for instant playback
              await adminSupabase
                .from('vibelogs')
                .update({
                  audio_url: audioUrl,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', vibelogId);

              console.log(`💾 [TTS] Saved audio_url to vibelog ${vibelogId} (creator's voice)`);
            } else {
              // ❌ Audio uses wrong voice - don't save, but still return it for this request
              console.log(
                `⚠️ [TTS] NOT saving audio to vibelog ${vibelogId} - voice mismatch (generated: ${voiceCloneIdToUse}, creator: ${creatorVoiceId})`
              );
            }
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

    // At this point, audioBuffer is guaranteed to be assigned (from ElevenLabs or OpenAI)
    if (!audioBuffer) {
      throw new Error('Failed to generate audio buffer');
    }

    // Convert Buffer to Uint8Array for NextResponse
    const audioUint8Array = new Uint8Array(audioBuffer);
    return new NextResponse(audioUint8Array, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioUint8Array.length.toString(),
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
