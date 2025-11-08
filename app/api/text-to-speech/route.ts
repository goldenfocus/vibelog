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

    const { text, voice = 'shimmer', vibelogId, voiceCloneId, authorId } = await request.json();

    console.log('🎵 [TTS-API] Received request:', {
      voice,
      vibelogId,
      voiceCloneId,
      authorId,
      hasVoiceCloneId: !!voiceCloneId,
      hasAuthorId: !!authorId,
      textLength: text?.length,
      userId,
      isAuthenticated: !!userId,
    });

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    // Initialize adminSupabase early since we need it for voice clone ID lookup
    const adminSupabase = await createServerAdminClient();

    // CRITICAL: Resolve voice clone ID with priority:
    // 1. Directly provided voiceCloneId (from component prop)
    // 2. Vibelog's voice_clone_id (from this specific recording)
    // 3. Author's profile voice_clone_id (their default cloned voice)
    // This ensures we always use the author's voice if available, even if this specific recording failed to clone
    let voiceCloneIdToUse = voiceCloneId;

    // If no voiceCloneId provided directly, check vibelog and author profile
    // Also check authorId directly if provided (fallback when vibelogId lookup fails)
    if (!voiceCloneIdToUse && (vibelogId || authorId)) {
      try {
        const { data: vibelog, error: vibelogError } = await adminSupabase
          .from('vibelogs')
          .select('voice_clone_id, user_id')
          .eq('id', vibelogId)
          .single();

        if (vibelogError) {
          console.log('[TTS] Vibelog lookup error:', vibelogError.message);
        } else {
          // First try vibelog's own voice_clone_id
          if (vibelog?.voice_clone_id) {
            voiceCloneIdToUse = vibelog.voice_clone_id;
            console.log('[TTS] Found voice_clone_id from vibelog:', voiceCloneIdToUse);
          }

          // ALWAYS check author's profile, even if vibelog has a voice_clone_id
          // This ensures we use the author's latest cloned voice
          // (vibelog's voice_clone_id might be from an old recording)
          if (vibelog?.user_id) {
            try {
              const { data: profile, error: profileError } = await adminSupabase
                .from('profiles')
                .select('voice_clone_id')
                .eq('id', vibelog.user_id)
                .single();

              if (profileError) {
                console.log('[TTS] Profile lookup error:', profileError.message);
              } else if (profile?.voice_clone_id) {
                // Use author's profile voice_clone_id (prefer over vibelog's if different)
                // This ensures we use their latest cloned voice
                voiceCloneIdToUse = profile.voice_clone_id;
                console.log(
                  '[TTS] Found voice_clone_id from vibelog author profile:',
                  voiceCloneIdToUse,
                  vibelog.voice_clone_id
                    ? '(overriding vibelog voice_clone_id)'
                    : '(vibelog had none)'
                );
              } else {
                console.log('[TTS] No voice_clone_id found in author profile');
              }
            } catch (error) {
              console.error('[TTS] Error checking author profile:', error);
            }
          } else {
            console.log(
              '[TTS] Vibelog has no user_id (anonymous), cannot check profile via vibelog'
            );
            // If vibelog has no user_id but authorId was provided, check author's profile directly
            if (authorId) {
              try {
                console.log('[TTS] Checking author profile directly (vibelog has no user_id)');
                const { data: profile, error: profileError } = await adminSupabase
                  .from('profiles')
                  .select('voice_clone_id')
                  .eq('id', authorId)
                  .single();

                if (profileError) {
                  console.log('[TTS] Author profile lookup error:', profileError.message);
                } else if (profile?.voice_clone_id) {
                  voiceCloneIdToUse = profile.voice_clone_id;
                  console.log(
                    '[TTS] Found voice_clone_id from author profile (vibelog had no user_id):',
                    voiceCloneIdToUse
                  );
                } else {
                  console.log('[TTS] No voice_clone_id found in author profile');
                }
              } catch (error) {
                console.error('[TTS] Error checking author profile:', error);
              }
            }
          }

          // If still no voice_clone_id found, log it
          if (!voiceCloneIdToUse) {
            console.log('[TTS] No voice_clone_id found in vibelog or profile');
          }
        }
      } catch (error) {
        console.error('[TTS] Error looking up vibelog voice_clone_id:', error);
      }
    }

    // FALLBACK: If still no voice_clone_id and authorId was provided directly (but vibelogId wasn't), check author's profile
    // This handles cases where vibelogId lookup failed or vibelog doesn't exist yet
    // Note: We don't check again if vibelogId was provided (already checked above)
    if (!voiceCloneIdToUse && authorId && !vibelogId) {
      try {
        console.log('[TTS] Checking author profile directly (authorId provided, no vibelogId)');
        const { data: profile, error: profileError } = await adminSupabase
          .from('profiles')
          .select('voice_clone_id')
          .eq('id', authorId)
          .single();

        if (profileError) {
          console.log('[TTS] Author profile lookup error:', profileError.message);
        } else if (profile?.voice_clone_id) {
          voiceCloneIdToUse = profile.voice_clone_id;
          console.log(
            '[TTS] Found voice_clone_id from author profile (direct lookup):',
            voiceCloneIdToUse
          );
        } else {
          console.log('[TTS] No voice_clone_id found in author profile (direct lookup)');
        }
      } catch (error) {
        console.error('[TTS] Error checking author profile (direct lookup):', error);
      }
    }

    // Final check - if still no voice_clone_id found, log it
    if (!voiceCloneIdToUse) {
      console.log('[TTS] No voice_clone_id found anywhere - will use default voice');
    }

    // NOTE: We intentionally do NOT fallback to the current viewer's voice clone.
    // The voice should always match the content author, not the person viewing it.
    // If no author voice is found, we'll use the default TTS voice.
    console.log('🎵 [TTS-API] Voice clone resolution complete:', {
      voiceCloneIdToUse,
      hasVoiceClone: !!voiceCloneIdToUse,
      vibelogId,
      providedVoiceCloneId: voiceCloneId,
    });

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
    let ttsService: 'modal' | 'elevenlabs' | 'openai' | 'mock' = 'openai'; // Track which service was used
    let modalError: string | undefined; // Store Modal error details for better error messages

    // CRITICAL: If voice cloning is requested but Modal is not configured, return error immediately
    // This prevents falling back to default "shimmer" voice when voice cloning is expected
    if (voiceCloneIdToUse && !config.ai.modal.enabled) {
      console.error('❌ [CONFIG] Voice cloning requested but Modal is disabled in config');
      console.error('❌ [CONFIG] Set MODAL_ENABLED=true to use voice cloning with Modal');
      return NextResponse.json(
        {
          error: 'Voice cloning service not configured',
          message:
            'Voice cloning was requested but Modal is not enabled. Please configure Modal to use voice cloning.',
          details: 'Set MODAL_ENABLED=true and MODAL_TTS_ENDPOINT in your environment variables.',
        },
        { status: 503 }
      );
    }
    if (voiceCloneIdToUse && config.ai.modal.enabled && !config.ai.modal.endpoint) {
      console.error('❌ [CONFIG] Modal is enabled but MODAL_TTS_ENDPOINT is not set!');
      return NextResponse.json(
        {
          error: 'Voice cloning service misconfigured',
          message:
            'Modal is enabled but the endpoint is not configured. Please set MODAL_TTS_ENDPOINT.',
          details: 'Set MODAL_TTS_ENDPOINT to your Modal TTS endpoint URL.',
        },
        { status: 503 }
      );
    }

    // Try Modal.com first (self-hosted, much cheaper)
    if (voiceCloneIdToUse && config.ai.modal.enabled && config.ai.modal.endpoint) {
      try {
        console.log('🎵 [MODAL] Attempting self-hosted TTS with cloned voice:', voiceCloneIdToUse);
        console.log('🎵 [MODAL] Endpoint:', config.ai.modal.endpoint);

        // Fetch the voice audio sample from storage
        const supabaseAdmin = await createServerAdminClient();
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('voice_clone_id', voiceCloneIdToUse)
          .single();

        // Determine voice audio path based on whether this is a profile or anonymous voice
        let voiceAudioPath: string;
        if (profile && !profileError) {
          // Registered user - use profile-based path
          voiceAudioPath = `voices/${profile.id}/voice_sample.wav`;
          console.log('🎵 [MODAL] Using profile voice sample from:', voiceAudioPath);
        } else {
          // Anonymous user or profile not found - use anonymous path
          voiceAudioPath = `voices/anonymous/${voiceCloneIdToUse}/voice_sample.wav`;
          console.log('🎵 [MODAL] Using anonymous voice sample from:', voiceAudioPath);
        }

        // Fetch the voice audio file from storage
        console.log('🎵 [MODAL] Fetching voice sample from storage:', voiceAudioPath);
        const { data: voiceAudioData, error: storageError } = await supabaseAdmin.storage
          .from('tts-audio')
          .download(voiceAudioPath);

        if (storageError) {
          console.error('❌ [MODAL] Failed to download voice sample:', storageError.message);
          console.error('❌ [MODAL] Storage error:', storageError);
          console.error('❌ [MODAL] Tried path:', voiceAudioPath);
          console.error('❌ [MODAL] Voice clone ID:', voiceCloneIdToUse);
          console.error('❌ [MODAL] Profile lookup result:', {
            profile: profile?.id,
            profileError,
          });

          throw new Error(`Voice sample download failed: ${storageError.message}`);
        }

        if (voiceAudioData) {
          // Convert to base64
          const voiceBuffer = Buffer.from(await voiceAudioData.arrayBuffer());
          const voiceBase64 = voiceBuffer.toString('base64');
          console.log('🎵 [MODAL] Voice sample size:', voiceBuffer.length, 'bytes');

          // Retry logic for Modal requests (handles cold starts and timeouts)
          const MAX_RETRIES = 2;
          const TIMEOUT_MS = 180000; // 180 seconds (3 minutes) - allows for cold starts + model download
          let lastError: Error | null = null;

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              console.log(
                `🎵 [MODAL] Attempt ${attempt}/${MAX_RETRIES} - Sending request to Modal endpoint...`
              );
              console.log('🎵 [MODAL] Request details:', {
                endpoint: config.ai.modal.endpoint,
                textLength: text.length,
                voiceAudioSize: voiceBase64.length,
                timeout: TIMEOUT_MS,
                attempt,
              });

              const requestStartTime = Date.now();
              const modalResponse = await fetch(config.ai.modal.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text,
                  voiceAudio: voiceBase64,
                  language: 'en', // TODO: detect language from request
                }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
              });

              const requestDuration = Date.now() - requestStartTime;
              console.log(
                `🎵 [MODAL] Request completed in ${requestDuration}ms, status: ${modalResponse.status}`
              );

              if (modalResponse.ok) {
                const { audioBase64 } = await modalResponse.json();
                audioBuffer = Buffer.from(audioBase64, 'base64');
                ttsService = 'modal';
                console.log(
                  `✅ [MODAL] TTS generated successfully on attempt ${attempt}! Audio size:`,
                  audioBuffer.length,
                  'bytes'
                );
                break; // Success, exit retry loop
              } else {
                const errorText = await modalResponse.text();
                console.error(
                  `❌ [MODAL] Attempt ${attempt} failed with status:`,
                  modalResponse.status
                );
                console.error('❌ [MODAL] Error response:', errorText);

                // If it's a server error (5xx), retry
                if (modalResponse.status >= 500 && attempt < MAX_RETRIES) {
                  const retryDelay = attempt * 2000; // 2s, 4s delays
                  console.log(`🔄 [MODAL] Server error, retrying in ${retryDelay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  lastError = new Error(
                    `Modal TTS request failed: ${modalResponse.status} - ${errorText.substring(0, 200)}`
                  );
                  continue;
                }

                // Don't fall back to OpenAI - throw error so it's caught and handled properly
                throw new Error(
                  `Modal TTS request failed: ${modalResponse.status} - ${errorText.substring(0, 200)}`
                );
              }
            } catch (fetchError) {
              const isTimeout =
                fetchError instanceof Error &&
                (fetchError.message.includes('timeout') ||
                  fetchError.message.includes('aborted') ||
                  fetchError.name === 'AbortError');

              if (isTimeout && attempt < MAX_RETRIES) {
                const retryDelay = attempt * 3000; // 3s, 6s delays for timeouts
                console.warn(
                  `⏱️ [MODAL] Request timed out on attempt ${attempt}, retrying in ${retryDelay}ms...`
                );
                console.warn(
                  `⏱️ [MODAL] Timeout error:`,
                  fetchError instanceof Error ? fetchError.message : fetchError
                );
                lastError =
                  fetchError instanceof Error ? fetchError : new Error(String(fetchError));
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
              }

              // If this was the last attempt or not a timeout, throw the error
              throw fetchError;
            }
          }

          // If we exhausted retries and still no audioBuffer, throw the last error
          if (!audioBuffer && lastError) {
            throw lastError;
          }
        } else {
          console.error('❌ [MODAL] Voice audio data is empty');
          throw new Error('Voice sample file is empty');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error('❌ [MODAL] Exception occurred:', errorMessage);
        console.error('❌ [MODAL] Full error:', error);
        if (errorStack) {
          console.error('❌ [MODAL] Stack trace:', errorStack);
        }

        // Store error details for the response below
        modalError = errorMessage;
        // audioBuffer remains undefined, which will trigger the error response
      }
    }

    // DISABLED: ElevenLabs TTS fallback - using Modal/Coqui XTTS only
    /*
    // Helper: detect if a voice ID looks like an ElevenLabs voice ID
    const looksLikeElevenLabsId = (id: string) =>
      /^[A-Za-z0-9]{20,}$/.test(id) && !id.includes('-');

    // Fallback to ElevenLabs only if the clone ID actually looks like an ElevenLabs voice id
    if (
      !audioBuffer &&
      voiceCloneIdToUse &&
      config.ai.elevenlabs.apiKey &&
      looksLikeElevenLabsId(voiceCloneIdToUse)
    ) {
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
          ttsService = 'elevenlabs';
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
    } else if (!audioBuffer && voiceCloneIdToUse && config.ai.elevenlabs.apiKey) {
      console.log(
        'ℹ️  [TTS] Skipping ElevenLabs fallback: voiceCloneId does not look like an ElevenLabs ID (likely a Modal/Supabase UUID)'
      );
    }
    */

    // Fallback to OpenAI TTS if no cloned voice or if ElevenLabs failed
    if (!audioBuffer) {
      // CRITICAL FIX: If voice cloning was requested but failed, don't fall back to default voice
      // This prevents users from hearing "shimmer" when they expect their cloned voice
      if (voiceCloneIdToUse) {
        console.error('❌ [TTS] Voice cloning requested but Modal failed or is not configured');
        console.error('❌ [TTS] Cannot fall back to default voice - returning error instead');

        // Include the actual Modal error if available
        let errorDetails = '';
        if (config.ai.modal.enabled && config.ai.modal.endpoint) {
          if (modalError) {
            const isTimeout = modalError.includes('timeout') || modalError.includes('aborted');
            errorDetails =
              `Modal request failed: ${modalError}\n\n` +
              'Common causes:\n' +
              '- Modal endpoint is unreachable or timing out\n' +
              '- Voice sample file not found in storage\n' +
              '- Modal service error (check Modal logs with: modal app logs vibelog-tts)\n' +
              '- Network connectivity issues\n' +
              (isTimeout
                ? '- Request timeout (180 seconds) - Modal may be cold starting or processing a large request\n' +
                  '  The request was retried automatically but still timed out. Try again in a few moments.'
                : '- Request timeout (180 seconds)');
          } else {
            errorDetails =
              'Modal is enabled but the request failed. Check your server logs for detailed error messages.';
          }
        } else if (!config.ai.modal.enabled) {
          errorDetails =
            'Modal is not enabled. Set MODAL_ENABLED=true and MODAL_TTS_ENDPOINT to use voice cloning.';
        } else if (!config.ai.modal.endpoint) {
          errorDetails =
            'Modal is enabled but MODAL_TTS_ENDPOINT is not set. Set the endpoint URL in your environment variables.';
        }

        return NextResponse.json(
          {
            error: 'Voice cloning service unavailable',
            message:
              'Voice cloning was requested but the service is not available. Please check Modal configuration.',
            details: errorDetails,
          },
          { status: 503 }
        );
      }

      // Only fall back to OpenAI TTS if no voice cloning was requested
      // Check if we have a real API key, otherwise return mock response
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === 'dummy_key' ||
        process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
      ) {
        console.log('🧪 Using mock TTS response for development/testing');
        ttsService = 'mock';

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

      // Generate speech using OpenAI TTS (only when no voice cloning was requested)
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
    console.log(`🎵 [TTS] Returning audio generated by: ${ttsService.toUpperCase()}`);
    return new NextResponse(audioUint8Array, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioUint8Array.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-TTS-Cache': 'miss',
        'X-TTS-Service': ttsService, // Track which service generated this audio
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
