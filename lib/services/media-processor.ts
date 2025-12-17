/**
 * Unified Media Processor Service
 *
 * Single entry point for processing all media types (audio, video, text).
 * This service provides:
 * - Consistent validation using lib/media/validation.ts
 * - Automatic retry for transient failures
 * - Transaction-like rollback on failure
 * - Unified error handling and logging
 * - Cost tracking integration
 *
 * @example
 * // Process a voice recording
 * const result = await processVoiceRecording({
 *   file: audioBlob,
 *   userId: user.id,
 *   sessionId: session.id,
 * });
 *
 * @example
 * // Process a music upload
 * const result = await processMusicUpload({
 *   storagePath: 'user123/music/file.mp3',
 *   userId: user.id,
 *   generateCover: true,
 * });
 */

import OpenAI from 'openai';

import { getCachedResponse, setCachedResponse } from '@/lib/ai-cache';
import { calculateWhisperCost, trackAICost, isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import {
  validateMediaFile,
  normalizeMimeType,
  formatBytes,
  WHISPER_CONSTRAINTS,
  type ValidationResult,
} from '@/lib/media';
import { withProcessingContext } from '@/lib/media/processing-context';
import { normalizeVibeLog } from '@/lib/normalize-vibelog';
import { downloadFromStorage, deleteFromStorage, getVibelogPublicUrl } from '@/lib/storage';
import { withRetry, OPENAI_RETRY_OPTIONS, STORAGE_RETRY_OPTIONS } from '@/lib/utils/retry';
import { whisperLanguageToISO } from '@/lib/whisper-language';

// =============================================================================
// Types
// =============================================================================

export interface ProcessingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  metadata: {
    processingTime: number;
    cached: boolean;
    cost?: number;
  };
}

export interface TranscriptionData {
  transcription: string;
  detectedLanguage: string;
  duration?: number;
}

export interface VoiceRecordingInput {
  /** Audio file (Blob or Buffer) */
  file: File | Blob | Buffer;
  /** MIME type of the file */
  mimeType: string;
  /** User ID (null for anonymous) */
  userId: string | null;
  /** Session ID for anonymous users */
  sessionId?: string;
  /** Skip content validation (magic number check) */
  skipContentValidation?: boolean;
}

export interface StorageMediaInput {
  /** Path in Supabase storage */
  storagePath: string;
  /** User ID */
  userId: string | null;
  /** Optional: known MIME type */
  mimeType?: string;
  /** Delete file after processing */
  deleteAfterProcessing?: boolean;
}

export interface TextFileInput {
  /** Path in Supabase storage OR raw content */
  storagePath?: string;
  content?: string;
  /** User ID */
  userId: string | null;
  /** MIME type (for storage path) */
  mimeType?: string;
}

// =============================================================================
// Error Codes
// =============================================================================

export const MediaProcessorErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TOO_SMALL: 'FILE_TOO_SMALL',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  CONTENT_MISMATCH: 'CONTENT_MISMATCH',
  STORAGE_ERROR: 'STORAGE_ERROR',
  TRANSCRIPTION_ERROR: 'TRANSCRIPTION_ERROR',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  API_KEY_INVALID: 'API_KEY_INVALID',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type MediaProcessorErrorCode =
  (typeof MediaProcessorErrorCodes)[keyof typeof MediaProcessorErrorCodes];

// =============================================================================
// Voice Recording Processing
// =============================================================================

/**
 * Process a voice recording for transcription
 *
 * Pipeline:
 * 1. Validate file (type, size, content)
 * 2. Check cache
 * 3. Transcribe with Whisper
 * 4. Track cost
 * 5. Cache result
 */
export async function processVoiceRecording(
  input: VoiceRecordingInput
): Promise<ProcessingResult<TranscriptionData>> {
  const startTime = Date.now();

  return withProcessingContext(
    {
      operationName: 'voice-recording',
      userId: input.userId,
      verbose: isDev,
    },
    async ctx => {
      // Step 1: Validate file
      ctx.startStep('validate');

      const validation = await validateMediaFile(input.file, input.mimeType, {
        validateContent: !input.skipContentValidation,
        requireCategory: 'audio',
        forWhisper: true,
      });

      if (!validation.valid) {
        ctx.failStep('validate', validation.errors.join('; '));
        return createErrorResult(
          MediaProcessorErrorCodes.VALIDATION_FAILED,
          'File validation failed',
          validation.errors.join('; '),
          startTime
        );
      }

      ctx.completeStep('validate');
      ctx.addMetadata('validation', validation);

      // Step 2: Check cache
      ctx.startStep('cache-check');

      const audioBuffer =
        input.file instanceof Buffer
          ? input.file
          : Buffer.from(await (input.file as Blob).arrayBuffer());

      const cachedResult = await getCachedResponse('transcription', audioBuffer);

      if (cachedResult) {
        ctx.completeStep('cache-check');
        await trackAICost(input.userId, 'whisper', 0, {
          endpoint: 'media-processor',
          cache_hit: true,
          file_size: audioBuffer.length,
        });

        return {
          success: true,
          data: cachedResult as TranscriptionData,
          metadata: {
            processingTime: Date.now() - startTime,
            cached: true,
            cost: 0,
          },
        };
      }

      ctx.completeStep('cache-check');

      // Step 3: Check daily limit
      ctx.startStep('limit-check');

      if (await isDailyLimitExceeded()) {
        ctx.failStep('limit-check', 'Daily limit exceeded');
        return createErrorResult(
          MediaProcessorErrorCodes.DAILY_LIMIT_EXCEEDED,
          'Daily AI cost limit exceeded',
          'Service will resume tomorrow',
          startTime
        );
      }

      ctx.completeStep('limit-check');

      // Step 4: Check API key
      if (!isValidApiKey()) {
        // Return mock response for development
        if (isDev) {
          return {
            success: true,
            data: {
              transcription: getMockTranscription(),
              detectedLanguage: 'en',
            },
            metadata: {
              processingTime: Date.now() - startTime,
              cached: false,
              cost: 0,
            },
          };
        }

        return createErrorResult(
          MediaProcessorErrorCodes.API_KEY_INVALID,
          'OpenAI API key not configured',
          undefined,
          startTime
        );
      }

      // Step 5: Transcribe with Whisper
      ctx.startStep('transcribe');

      try {
        const openai = new OpenAI({
          apiKey: config.ai.openai.apiKey,
          timeout: 60_000,
        });

        // Prepare file for Whisper
        const fileExt = getFileExtension(validation.normalized.mimeType);
        const mimeType = validation.normalized.mimeType || 'audio/webm';
        // Create File from buffer (cast to BlobPart[] to satisfy TypeScript)
        const whisperFile = new File([audioBuffer as unknown as BlobPart], `recording.${fileExt}`, {
          type: mimeType,
        });

        // Call Whisper with retry
        const transcription = await withRetry(
          () =>
            openai.audio.transcriptions.create({
              file: whisperFile,
              model: config.ai.openai.whisperModel,
              response_format: 'verbose_json',
            }),
          {
            ...OPENAI_RETRY_OPTIONS,
            operationName: 'whisper-transcription',
          }
        );

        // Process result
        const detectedLanguage = whisperLanguageToISO(transcription.language);
        const transcriptionText = normalizeVibeLog(transcription.text);
        const duration = transcription.duration || estimateDuration(audioBuffer.length);

        // Track cost
        const cost = calculateWhisperCost(duration);
        const { allowed } = await trackAICost(input.userId, 'whisper', cost, {
          endpoint: 'media-processor',
          cache_hit: false,
          duration_seconds: duration,
          file_size: audioBuffer.length,
          detected_language: detectedLanguage,
        });

        if (!allowed) {
          ctx.failStep('transcribe', 'Daily limit exceeded mid-request');
          return createErrorResult(
            MediaProcessorErrorCodes.DAILY_LIMIT_EXCEEDED,
            'Daily limit exceeded',
            'Your transcription was completed but the service is now paused',
            startTime,
            cost
          );
        }

        ctx.completeStep('transcribe');

        // Step 6: Cache result
        ctx.startStep('cache-store');

        const result: TranscriptionData = {
          transcription: transcriptionText,
          detectedLanguage,
          duration,
        };

        await setCachedResponse('transcription', audioBuffer, result);

        ctx.completeStep('cache-store');

        return {
          success: true,
          data: result,
          metadata: {
            processingTime: Date.now() - startTime,
            cached: false,
            cost,
          },
        };
      } catch (error) {
        ctx.failStep('transcribe', error instanceof Error ? error.message : 'Unknown error');
        return handleTranscriptionError(error, startTime);
      }
    }
  );
}

// =============================================================================
// Storage Media Processing (for files already in storage)
// =============================================================================

/**
 * Process media from Supabase storage path
 *
 * This is used for:
 * - Large file uploads that went directly to storage
 * - Music uploads
 * - Video analysis
 */
export async function processStorageMedia(
  input: StorageMediaInput
): Promise<ProcessingResult<TranscriptionData>> {
  const startTime = Date.now();

  return withProcessingContext(
    {
      operationName: 'storage-media',
      userId: input.userId,
      verbose: isDev,
    },
    async ctx => {
      // Step 1: Download from storage
      ctx.startStep('download');

      let blob: Blob;
      try {
        blob = await withRetry(() => downloadFromStorage(input.storagePath), {
          ...STORAGE_RETRY_OPTIONS,
          operationName: 'storage-download',
        });

        // Register cleanup to delete file if requested
        if (input.deleteAfterProcessing) {
          ctx.registerCleanup(async () => {
            await deleteFromStorage(input.storagePath);
          }, `delete-storage-file:${input.storagePath}`);
        }
      } catch (error) {
        ctx.failStep('download', error instanceof Error ? error.message : 'Unknown error');
        return createErrorResult(
          MediaProcessorErrorCodes.STORAGE_ERROR,
          'Failed to download media from storage',
          error instanceof Error ? error.message : undefined,
          startTime
        );
      }

      ctx.completeStep('download');
      ctx.addMetadata('fileSize', blob.size);

      // Determine MIME type
      const mimeType = input.mimeType || blob.type || 'audio/webm';

      // Step 2: Validate
      ctx.startStep('validate');

      const validation = await validateMediaFile(blob, mimeType, {
        validateContent: true,
        forWhisper: true,
      });

      // For storage files, we're more lenient - just warn on validation issues
      if (!validation.valid) {
        // Check if it's a size issue (hard failure)
        if (blob.size > WHISPER_CONSTRAINTS.maxSize) {
          ctx.failStep('validate', 'File too large for Whisper');
          return createErrorResult(
            MediaProcessorErrorCodes.FILE_TOO_LARGE,
            `File too large for transcription`,
            `Maximum: ${formatBytes(WHISPER_CONSTRAINTS.maxSize)}, File: ${formatBytes(blob.size)}`,
            startTime
          );
        }

        // Log warning but continue
        console.warn('[MEDIA-PROCESSOR] Validation warnings:', validation.errors);
      }

      ctx.completeStep('validate');

      // Step 3: Process as voice recording
      const buffer = Buffer.from(await blob.arrayBuffer());

      const result = await processVoiceRecording({
        file: buffer,
        mimeType: validation.normalized.mimeType || mimeType,
        userId: input.userId,
        skipContentValidation: true, // Already validated
      });

      // If successful and deleteAfterProcessing, the cleanup will run automatically
      // If failed, rollback will clean up

      if (result.success && input.deleteAfterProcessing) {
        // Clear the cleanup since we want to delete on success too
        // The file served its purpose
        try {
          await deleteFromStorage(input.storagePath);
        } catch {
          // Ignore deletion errors - best effort
        }
      }

      return result;
    }
  );
}

// =============================================================================
// Text File Processing
// =============================================================================

/**
 * Process a text file (no transcription needed)
 *
 * Simply reads the content and returns it for further processing
 */
export async function processTextFile(
  input: TextFileInput
): Promise<ProcessingResult<{ content: string; detectedLanguage: string }>> {
  const startTime = Date.now();

  // If content is provided directly, return it
  if (input.content) {
    return {
      success: true,
      data: {
        content: input.content,
        detectedLanguage: 'en', // Assume English for direct content
      },
      metadata: {
        processingTime: Date.now() - startTime,
        cached: false,
      },
    };
  }

  // Otherwise, download from storage
  if (!input.storagePath) {
    return createErrorResult(
      MediaProcessorErrorCodes.VALIDATION_FAILED,
      'Either content or storagePath must be provided',
      undefined,
      startTime
    );
  }

  return withProcessingContext(
    {
      operationName: 'text-file',
      userId: input.userId,
      verbose: isDev,
    },
    async ctx => {
      ctx.startStep('download');

      try {
        const blob = await withRetry(() => downloadFromStorage(input.storagePath!), {
          ...STORAGE_RETRY_OPTIONS,
          operationName: 'storage-download',
        });

        const content = await blob.text();

        ctx.completeStep('download');

        return {
          success: true,
          data: {
            content,
            detectedLanguage: 'en', // TODO: Could add language detection here
          },
          metadata: {
            processingTime: Date.now() - startTime,
            cached: false,
          },
        };
      } catch (error) {
        ctx.failStep('download', error instanceof Error ? error.message : 'Unknown error');
        return createErrorResult(
          MediaProcessorErrorCodes.STORAGE_ERROR,
          'Failed to read text file',
          error instanceof Error ? error.message : undefined,
          startTime
        );
      }
    }
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function createErrorResult<T>(
  code: MediaProcessorErrorCode,
  message: string,
  details: string | undefined,
  startTime: number,
  cost?: number
): ProcessingResult<T> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      processingTime: Date.now() - startTime,
      cached: false,
      cost,
    },
  };
}

function isValidApiKey(): boolean {
  return !!(
    config.ai.openai.apiKey &&
    config.ai.openai.apiKey !== 'dummy_key' &&
    config.ai.openai.apiKey !== 'your_openai_api_key_here'
  );
}

function getMockTranscription(): string {
  return (
    'Today I want to share some thoughts about the future of voice technology ' +
    "and how it's changing the way we create content. Speaking is our most natural " +
    "form of communication and I believe we're moving toward a world where your " +
    'voice becomes your pen.'
  );
}

function getFileExtension(mimeType: string): string {
  const normalized = normalizeMimeType(mimeType);

  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
  };

  return map[normalized] || 'webm';
}

function estimateDuration(fileSize: number): number {
  // Very rough estimate: ~10KB per second for compressed audio
  return Math.ceil(fileSize / 10000);
}

function handleTranscriptionError(
  error: unknown,
  startTime: number
): ProcessingResult<TranscriptionData> {
  const message = error instanceof Error ? error.message : 'Unknown error';

  // Map specific errors to codes
  if (message.includes('Unsupported file type')) {
    return createErrorResult(
      MediaProcessorErrorCodes.UNSUPPORTED_TYPE,
      'Audio format not supported',
      'Please try a different recording format',
      startTime
    );
  }

  if (message.includes('File size too large')) {
    return createErrorResult(
      MediaProcessorErrorCodes.FILE_TOO_LARGE,
      'Audio file is too large',
      'Please record a shorter clip',
      startTime
    );
  }

  if (message.includes('Invalid API key') || message.includes('invalid_api_key')) {
    return createErrorResult(
      MediaProcessorErrorCodes.API_KEY_INVALID,
      'API configuration error',
      'OpenAI API key is invalid or missing',
      startTime
    );
  }

  if (message.includes('insufficient_quota') || message.includes('exceeded')) {
    return createErrorResult(
      MediaProcessorErrorCodes.DAILY_LIMIT_EXCEEDED,
      'OpenAI API quota exceeded',
      'Please check billing settings',
      startTime
    );
  }

  return createErrorResult(
    MediaProcessorErrorCodes.TRANSCRIPTION_ERROR,
    'Transcription failed',
    message,
    startTime
  );
}

// =============================================================================
// Utility: Quick Validation (without processing)
// =============================================================================

/**
 * Quickly validate a media file without processing
 * Useful for client-side validation before upload
 */
export async function quickValidateMedia(
  file: File | Blob | Buffer,
  mimeType: string,
  options: {
    requireCategory?: 'audio' | 'video' | 'image' | 'text';
    forWhisper?: boolean;
    validateContent?: boolean;
  } = {}
): Promise<ValidationResult> {
  return validateMediaFile(file, mimeType, options);
}

/**
 * Get public URL for a storage path
 */
export function getMediaPublicUrl(storagePath: string): string {
  return getVibelogPublicUrl(storagePath);
}
