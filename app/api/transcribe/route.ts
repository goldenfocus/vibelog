import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { downloadFromStorage, deleteFromStorage } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCachedResponse, setCachedResponse } from '@/lib/ai-cache';
import {
  trackAICost,
  calculateWhisperCost,
  isDailyLimitExceeded,
} from '@/lib/ai-cost-tracker';

// Use Node.js runtime for better performance with larger payloads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for transcription

export async function POST(request: NextRequest) {
  try {
    // 🛡️ CIRCUIT BREAKER: Check if daily cost limit exceeded
    if (await isDailyLimitExceeded()) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message:
            'AI services have reached their daily cost limit ($50). Service will resume tomorrow. This protection prevents unexpected bills.',
        },
        { status: 503 }
      );
    }

    // Rate limit per user if logged in; otherwise per IP
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Use rate limits from config (AGGRESSIVE LIMITS for cost protection)
    const limits = config.rateLimits.transcription;
    const opts = userId ? limits.authenticated : limits.anonymous;
    const rl = await rateLimit(request, 'transcribe', opts, userId || undefined);
    if (!rl.success) {
      // Custom response for anonymous users to encourage signup
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message: `You've used your ${opts.limit} free transcriptions today. Sign in with Google to get ${limits.authenticated.limit} transcriptions per day!`,
            upgrade: {
              action: 'Sign in with Google',
              benefits: [
                `${limits.authenticated.limit} transcriptions per day (vs ${opts.limit})`,
                'Save your vibelogs',
                'Access to premium features',
                'Priority processing',
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

    // Support two methods: direct upload (formData) and storage path (JSON)
    const contentType = request.headers.get('content-type') || '';
    let audioFile: File;
    let storagePath: string | null = null;

    if (contentType.includes('application/json')) {
      // NEW WAY: Download from storage (supports unlimited file sizes!)
      const body = await request.json();
      storagePath = body.storagePath;

      if (!storagePath) {
        return NextResponse.json({ error: 'Missing storagePath in request body' }, { status: 400 });
      }

      console.log('📥 Downloading media from storage:', storagePath);

      try {
        // Download file from Supabase Storage
        const blob = await downloadFromStorage(storagePath);

        // Detect if it's video or audio from blob type
        const isVideo = blob.type?.startsWith('video/');
        const fileExt = isVideo
          ? blob.type.includes('mp4')
            ? 'mp4'
            : blob.type.includes('quicktime')
              ? 'mov'
              : 'webm'
          : 'webm';

        // Convert blob to File
        audioFile = new File([blob], `recording.${fileExt}`, {
          type: blob.type || 'audio/webm',
        });

        console.log('✅ Downloaded:', audioFile.size, 'bytes', isVideo ? '(video)' : '(audio)');
      } catch (storageError) {
        console.error('Storage download failed:', storageError);
        return NextResponse.json(
          {
            error: 'Failed to download media from storage',
            message: storageError instanceof Error ? storageError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    } else {
      // OLD WAY: Direct formData upload (4MB limit, kept for backwards compatibility)
      const formData = await request.formData();
      // Accept both 'audio' and 'video' form field names
      const file = (formData.get('audio') || formData.get('video')) as File;

      if (!file) {
        return NextResponse.json({ error: 'No audio or video file provided' }, { status: 400 });
      }

      audioFile = file;

      // Validate file type - support both audio and video
      const fileType = (audioFile.type || '').split(';')[0].trim();
      const ALLOWED_TYPES = [
        // Audio formats
        'audio/webm',
        'audio/wav',
        'audio/mpeg',
        'audio/mp4',
        'audio/mp3',
        'audio/ogg',
        // Video formats (Whisper API supports these)
        'video/webm',
        'video/mp4',
        'video/quicktime', // .mov
        'video/mpeg',
      ];

      if (!ALLOWED_TYPES.includes(fileType)) {
        return NextResponse.json(
          {
            error: 'Unsupported media format',
            details: `Supported formats: WebM, MP4, MOV, WAV, MP3. You uploaded: ${fileType}`,
          },
          { status: 415 }
        );
      }

      // Use file constraints from config (only for direct uploads)
      const isVideo = fileType.startsWith('video/');
      const { maxSize: AUDIO_MAX_SIZE, minSize: MIN_SIZE_BYTES } = config.files.audio;

      // Whisper API has a 25MB limit for all files
      const WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25MB
      const MAX_SIZE_BYTES = isVideo
        ? Math.min(WHISPER_MAX_SIZE, 25 * 1024 * 1024) // 25MB for video
        : AUDIO_MAX_SIZE; // Use config limit for audio

      // Check for empty or too small files
      if (audioFile.size === 0) {
        return NextResponse.json(
          { error: `${isVideo ? 'Video' : 'Audio'} file is empty. Please try recording again.` },
          { status: 400 }
        );
      }

      // Check for minimum file size to avoid corrupted recordings
      if (audioFile.size < MIN_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `${isVideo ? 'Video' : 'Audio'} file is too small or corrupted. Please try recording again with longer ${isVideo ? 'video' : 'audio'}.`,
          },
          { status: 400 }
        );
      }

      if (audioFile.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `${isVideo ? 'Video' : 'Audio'} file too large`,
            details: `Maximum size is ${MAX_SIZE_BYTES / (1024 * 1024)}MB. Your file is ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB`,
          },
          { status: 413 }
        );
      }
    }

    // Detect if it's a video or audio file
    const isVideo = audioFile.type?.startsWith('video/');

    if (isDev) {
      console.log(
        `${isVideo ? '🎥' : '🎤'} Transcribing ${isVideo ? 'video' : 'audio'}:`,
        audioFile.size,
        'bytes',
        audioFile.type,
        storagePath ? `(from storage: ${storagePath})` : '(direct upload)'
      );
    }

    // 🔍 CACHE CHECK: Check if we already transcribed this audio
    const audioBuffer = await audioFile.arrayBuffer();
    const cachedResult = await getCachedResponse('transcription', Buffer.from(audioBuffer));

    if (cachedResult) {
      console.log('💾 Cache hit! Returning cached transcription (saved API call)');

      // Track cache hit (no cost)
      await trackAICost(userId || null, 'whisper', 0, {
        endpoint: '/api/transcribe',
        cache_hit: true,
        file_size: audioFile.size,
      });

      return NextResponse.json(cachedResult);
    }

    // Check if we have a real API key, otherwise return mock response for testing
    if (
      !config.ai.openai.apiKey ||
      config.ai.openai.apiKey === 'dummy_key' ||
      config.ai.openai.apiKey === 'your_openai_api_key_here'
    ) {
      console.warn('🧪 Using mock transcription for development/testing');
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay
      return NextResponse.json({
        transcription:
          "Today I want to share some thoughts about the future of voice technology and how it's changing the way we create content. Speaking is our most natural form of communication and I believe we're moving toward a world where your voice becomes your pen.",
        detectedLanguage: 'en',
        success: true,
      });
    }

    // Initialize OpenAI client only when we have a real API key
    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    // Convert File to format OpenAI expects
    // Detect proper file extension based on type
    const fileType = audioFile.type || '';
    const fileExt = isVideo
      ? fileType.includes('mp4')
        ? 'mp4'
        : fileType.includes('quicktime')
          ? 'mov'
          : 'webm'
      : 'webm';

    const whisperFile = new File([audioFile], `recording.${fileExt}`, {
      type: audioFile.type || 'audio/webm',
    });

    // Calculate duration (rough estimate: 1 byte ≈ 0.0001 seconds for compressed audio)
    const estimatedDurationSeconds = Math.ceil(audioFile.size / 10000); // Very rough estimate

    // Use verbose_json to get language detection metadata
    const transcription = await openai.audio.transcriptions.create({
      file: whisperFile,
      model: config.ai.openai.whisperModel,
      // Remove language parameter to enable auto-detection
      response_format: 'verbose_json',
    });

    // Extract language metadata from verbose response
    const detectedLanguage = transcription.language || 'en'; // ISO 639-1 code
    const transcriptionText = transcription.text;
    const actualDuration = transcription.duration || estimatedDurationSeconds;

    // 💰 COST TRACKING: Track this API call
    const cost = calculateWhisperCost(actualDuration);
    const { allowed } = await trackAICost(userId || null, 'whisper', cost, {
      endpoint: '/api/transcribe',
      cache_hit: false,
      duration_seconds: actualDuration,
      file_size: audioFile.size,
      detected_language: detectedLanguage,
    });

    if (!allowed) {
      // Circuit breaker triggered mid-request
      return NextResponse.json(
        {
          error: 'Daily cost limit exceeded',
          message:
            'AI services have reached their daily cost limit. Your transcription was completed but the service is now paused. Try again tomorrow.',
        },
        { status: 503 }
      );
    }

    if (isDev) {
      console.log('✅ Transcription completed:', transcriptionText.substring(0, 100) + '...');
      console.log('🌐 Detected language:', detectedLanguage);
      console.log(`💰 Cost: $${cost.toFixed(4)} (${actualDuration.toFixed(1)}s audio)`);
    }

    const result = {
      transcription: transcriptionText,
      detectedLanguage, // ISO 639-1 code (e.g., "fr", "en", "es")
      success: true,
    };

    // 💾 CACHE STORE: Save result for future requests
    await setCachedResponse('transcription', Buffer.from(audioBuffer), result);

    // Clean up storage file after successful transcription
    if (storagePath) {
      console.log('🧹 Cleaning up storage file:', storagePath);
      // Fire and forget - don't wait for deletion
      deleteFromStorage(storagePath).catch((err) => console.warn('Failed to delete storage file:', err));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Transcription error:', error);

    // Provide more detailed error information
    let errorMessage = 'Failed to transcribe audio';
    let statusCode = 500;

    if (error instanceof Error) {
      // Handle specific OpenAI API errors
      if (error.message.includes('Unsupported file type')) {
        errorMessage = 'Audio format not supported. Please try a different recording format.';
        statusCode = 415;
      } else if (error.message.includes('File size too large')) {
        errorMessage = 'Audio file is too large. Please record a shorter clip.';
        statusCode = 413;
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = 'API configuration error. Please check your OpenAI settings.';
        statusCode = 401;
      }

      if (isDev) {
        console.error('Detailed error:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
