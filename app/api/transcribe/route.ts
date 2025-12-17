import { NextRequest, NextResponse } from 'next/server';

import { isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import { validateMediaFile, formatBytes } from '@/lib/media';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import {
  processVoiceRecording,
  processStorageMedia,
  MediaProcessorErrorCodes,
} from '@/lib/services/media-processor';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    const userId = auth?.user?.id || null;

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

    // ==========================================================================
    // Method 1: Storage Path (JSON body) - for large files
    // ==========================================================================
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const storagePath = body.storagePath;

      if (!storagePath) {
        return NextResponse.json({ error: 'Missing storagePath in request body' }, { status: 400 });
      }

      if (isDev) {
        console.log('📥 Processing media from storage:', storagePath);
      }

      // Use the unified media processor
      const result = await processStorageMedia({
        storagePath,
        userId,
        deleteAfterProcessing: true, // Clean up after transcription
      });

      if (!result.success) {
        return mapErrorToResponse(result.error!);
      }

      if (isDev) {
        console.log(
          '✅ Transcription completed:',
          result.data!.transcription.substring(0, 100) + '...'
        );
        console.log('🌐 Detected language:', result.data!.detectedLanguage);
        if (result.metadata.cost) {
          console.log(`💰 Cost: $${result.metadata.cost.toFixed(4)}`);
        }
      }

      return NextResponse.json({
        transcription: result.data!.transcription,
        detectedLanguage: result.data!.detectedLanguage,
        success: true,
      });
    }

    // ==========================================================================
    // Method 2: Direct Upload (FormData) - for small files
    // ==========================================================================
    const formData = await request.formData();
    const file = (formData.get('audio') || formData.get('video')) as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio or video file provided' }, { status: 400 });
    }

    // Validate the file using the new validation layer
    const validation = await validateMediaFile(file, file.type, {
      validateContent: true, // Check magic numbers
      forWhisper: true, // Apply Whisper-specific constraints
    });

    if (!validation.valid) {
      // Map validation errors to appropriate HTTP status codes
      const isTypeError = validation.errors.some(
        e => e.includes('not allowed') || e.includes('not supported')
      );
      const isSizeError = validation.errors.some(
        e => e.includes('too large') || e.includes('too small')
      );

      if (isTypeError) {
        return NextResponse.json(
          {
            error: 'Unsupported media format',
            details: `Supported formats: WebM, MP4, MOV, WAV, MP3. ${validation.errors.join('; ')}`,
          },
          { status: 415 }
        );
      }

      if (isSizeError) {
        const isVideo = file.type?.startsWith('video/');
        return NextResponse.json(
          {
            error: `${isVideo ? 'Video' : 'Audio'} file size issue`,
            details: validation.errors.join('; '),
          },
          { status: isSizeError && validation.errors[0].includes('large') ? 413 : 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Invalid media file',
          details: validation.errors.join('; '),
        },
        { status: 400 }
      );
    }

    // Log validation warnings (content type mismatches, etc.)
    if (validation.warnings.length > 0 && isDev) {
      console.warn('⚠️ Validation warnings:', validation.warnings);
    }

    if (isDev) {
      const isVideo = file.type?.startsWith('video/');
      console.log(
        `${isVideo ? '🎥' : '🎤'} Transcribing ${isVideo ? 'video' : 'audio'}:`,
        formatBytes(file.size),
        file.type
      );
    }

    // Process the file using the unified media processor
    const result = await processVoiceRecording({
      file,
      mimeType: validation.normalized.mimeType,
      userId,
      skipContentValidation: true, // Already validated above
    });

    if (!result.success) {
      return mapErrorToResponse(result.error!);
    }

    if (isDev) {
      console.log(
        '✅ Transcription completed:',
        result.data!.transcription.substring(0, 100) + '...'
      );
      console.log('🌐 Detected language:', result.data!.detectedLanguage);
      console.log(`⏱️ Processing time: ${result.metadata.processingTime}ms`);
      if (result.metadata.cached) {
        console.log('💾 Result was cached');
      } else if (result.metadata.cost) {
        console.log(`💰 Cost: $${result.metadata.cost.toFixed(4)}`);
      }
    }

    return NextResponse.json({
      transcription: result.data!.transcription,
      detectedLanguage: result.data!.detectedLanguage,
      success: true,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Map media processor errors to HTTP responses
 */
function mapErrorToResponse(error: {
  code: string;
  message: string;
  details?: string;
}): NextResponse {
  const statusMap: Record<string, number> = {
    [MediaProcessorErrorCodes.VALIDATION_FAILED]: 400,
    [MediaProcessorErrorCodes.FILE_TOO_LARGE]: 413,
    [MediaProcessorErrorCodes.FILE_TOO_SMALL]: 400,
    [MediaProcessorErrorCodes.UNSUPPORTED_TYPE]: 415,
    [MediaProcessorErrorCodes.CONTENT_MISMATCH]: 400,
    [MediaProcessorErrorCodes.STORAGE_ERROR]: 500,
    [MediaProcessorErrorCodes.TRANSCRIPTION_ERROR]: 500,
    [MediaProcessorErrorCodes.DAILY_LIMIT_EXCEEDED]: 503,
    [MediaProcessorErrorCodes.API_KEY_INVALID]: 401,
    [MediaProcessorErrorCodes.TIMEOUT]: 504,
    [MediaProcessorErrorCodes.UNKNOWN_ERROR]: 500,
  };

  const status = statusMap[error.code] || 500;

  return NextResponse.json(
    {
      error: error.message,
      details: error.details,
      code: error.code,
    },
    { status }
  );
}
