/**
 * Media Handling Module
 *
 * Unified utilities for validating, detecting, and processing media files.
 *
 * @example
 * import { validateMediaFile, detectMediaType, formatBytes } from '@/lib/media';
 *
 * const result = await validateMediaFile(file, file.type, { validateContent: true });
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 */

// Validation
export {
  validateMediaFile,
  isValidAudio,
  isValidVideo,
  isValidImage,
  isValidText,
  isWhisperCompatible,
  normalizeMimeType,
  getMediaCategory,
  getExtensionFromMimeType,
  getConstraintsForCategory,
  getConstraintsForMimeType,
  formatBytes,
  parseBytes,
  // Constraints
  AUDIO_CONSTRAINTS,
  VIDEO_CONSTRAINTS,
  IMAGE_CONSTRAINTS,
  TEXT_CONSTRAINTS,
  WHISPER_CONSTRAINTS,
  // Types
  type MediaCategory,
  type MediaConstraints,
  type ValidationResult,
  type ValidationOptions,
} from './validation';

// Magic number detection
export {
  detectMediaType,
  detectMediaTypeFromBuffer,
  verifyMediaType,
  getFormatName,
  MAGIC_SIGNATURES,
  type MagicSignature,
} from './magic';

// Processing context with rollback support
export {
  MediaProcessingContext,
  ProcessingContext,
  withProcessingContext,
  ProcessingAbortedError,
  ProcessingTimeoutError,
  type CleanupTask,
  type CleanupRegistration,
  type ProcessingStep,
  type ProcessingContextOptions,
} from './processing-context';
