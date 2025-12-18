/**
 * Unified Media Validation Layer
 *
 * Centralized validation for all media types (audio, video, text).
 * This module replaces scattered validation logic across the codebase
 * with a single source of truth.
 *
 * Features:
 * - MIME type normalization (strips codecs, handles variations)
 * - Content-based validation (magic numbers) for tamper detection
 * - Centralized size constraints
 * - Type-safe media categories
 */

import { detectMediaTypeFromBuffer } from './magic';

// =============================================================================
// Media Categories & Types
// =============================================================================

export type MediaCategory = 'audio' | 'video' | 'image' | 'text';

export interface MediaConstraints {
  maxSize: number; // bytes
  minSize: number; // bytes
  allowedTypes: readonly string[];
  category: MediaCategory;
}

// =============================================================================
// Centralized Constraints (Single Source of Truth)
// =============================================================================

/**
 * Audio file constraints
 * - Voice recordings (WebM from browser)
 * - Music uploads (MP3, WAV, etc.)
 */
export const AUDIO_CONSTRAINTS: MediaConstraints = {
  maxSize: 500 * 1024 * 1024, // 500MB for music files
  minSize: 1000, // 1KB minimum (prevents empty files)
  allowedTypes: [
    'audio/webm',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
  ] as const,
  category: 'audio',
};

/**
 * Video file constraints
 * - Screen recordings
 * - Camera captures
 * - Music videos
 */
export const VIDEO_CONSTRAINTS: MediaConstraints = {
  maxSize: 500 * 1024 * 1024, // 500MB
  minSize: 10000, // 10KB minimum
  allowedTypes: [
    'video/webm',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
  ] as const,
  category: 'video',
};

/**
 * Image file constraints
 * - Cover images
 * - User uploads
 */
export const IMAGE_CONSTRAINTS: MediaConstraints = {
  maxSize: 10 * 1024 * 1024, // 10MB
  minSize: 100, // 100 bytes minimum
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] as const,
  category: 'image',
};

/**
 * Text file constraints
 * - Markdown uploads
 * - Plain text
 * - Structured data (JSON, YAML)
 */
export const TEXT_CONSTRAINTS: MediaConstraints = {
  maxSize: 5 * 1024 * 1024, // 5MB
  minSize: 1, // 1 byte minimum
  allowedTypes: [
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'text/html',
    'text/xml',
    'text/yaml',
    'text/rtf',
    'application/json',
    'application/xml',
    'application/rtf',
    'application/yaml',
    'application/x-yaml',
  ] as const,
  category: 'text',
};

/**
 * Whisper API specific constraints
 * OpenAI Whisper has a 25MB file size limit
 */
export const WHISPER_CONSTRAINTS = {
  maxSize: 25 * 1024 * 1024, // 25MB hard limit from OpenAI
  supportedFormats: [
    'audio/webm',
    'audio/wav',
    'audio/mpeg',
    'audio/mp4',
    'audio/mp3',
    'audio/ogg',
    'video/webm',
    'video/mp4',
    'video/quicktime',
    'video/mpeg',
  ] as const,
};

// =============================================================================
// MIME Type Normalization
// =============================================================================

/**
 * Normalize a MIME type by stripping codecs and other parameters
 *
 * @example
 * normalizeMimeType('audio/webm; codecs=opus') // 'audio/webm'
 * normalizeMimeType('video/mp4; codecs="avc1.42E01E"') // 'video/mp4'
 */
export function normalizeMimeType(mimeType: string | null | undefined): string {
  if (!mimeType) {
    return '';
  }
  return mimeType.split(';')[0].trim().toLowerCase();
}

/**
 * Get the media category from a MIME type
 */
export function getMediaCategory(mimeType: string): MediaCategory | null {
  const normalized = normalizeMimeType(mimeType);

  if (normalized.startsWith('audio/')) {
    return 'audio';
  }
  if (normalized.startsWith('video/')) {
    return 'video';
  }
  if (normalized.startsWith('image/')) {
    return 'image';
  }
  if (normalized.startsWith('text/')) {
    return 'text';
  }

  // Special cases for application/* types that are really text
  if (
    [
      'application/json',
      'application/xml',
      'application/yaml',
      'application/x-yaml',
      'application/rtf',
    ].includes(normalized)
  ) {
    return 'text';
  }

  return null;
}

/**
 * Get constraints for a media category
 */
export function getConstraintsForCategory(category: MediaCategory): MediaConstraints {
  switch (category) {
    case 'audio':
      return AUDIO_CONSTRAINTS;
    case 'video':
      return VIDEO_CONSTRAINTS;
    case 'image':
      return IMAGE_CONSTRAINTS;
    case 'text':
      return TEXT_CONSTRAINTS;
  }
}

/**
 * Get constraints for a MIME type
 */
export function getConstraintsForMimeType(mimeType: string): MediaConstraints | null {
  const category = getMediaCategory(mimeType);
  return category ? getConstraintsForCategory(category) : null;
}

// =============================================================================
// Extension Mapping (Single Source of Truth)
// =============================================================================

const MIME_TO_EXTENSION: Record<string, string> = {
  // Audio
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  // Video
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/mpeg': 'mpeg',
  // Image
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  // Text
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
  'text/csv': 'csv',
  'text/html': 'html',
  'text/xml': 'xml',
  'text/yaml': 'yaml',
  'text/rtf': 'rtf',
  'application/json': 'json',
  'application/xml': 'xml',
  'application/yaml': 'yaml',
  'application/x-yaml': 'yaml',
  'application/rtf': 'rtf',
};

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const normalized = normalizeMimeType(mimeType);
  return MIME_TO_EXTENSION[normalized] || 'bin';
}

// =============================================================================
// Validation Results
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized: {
    mimeType: string;
    category: MediaCategory | null;
    extension: string;
  };
  metadata?: {
    detectedType?: string; // From magic number detection
    size: number;
  };
}

export interface ValidationOptions {
  /** Check file content against magic numbers */
  validateContent?: boolean;
  /** Custom size constraints (overrides defaults) */
  maxSize?: number;
  minSize?: number;
  /** Additional allowed MIME types */
  additionalTypes?: string[];
  /** Require specific category */
  requireCategory?: MediaCategory;
  /** Check Whisper API compatibility */
  forWhisper?: boolean;
}

// =============================================================================
// Core Validation Function
// =============================================================================

/**
 * Validate a media file
 *
 * @param file - File or Blob to validate
 * @param declaredMimeType - MIME type from browser/client
 * @param options - Validation options
 *
 * @example
 * const result = await validateMediaFile(file, file.type, { validateContent: true });
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 */
export async function validateMediaFile(
  file: File | Blob | Buffer,
  declaredMimeType: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Normalize the declared MIME type
  const normalizedType = normalizeMimeType(declaredMimeType);
  const category = getMediaCategory(normalizedType);
  const extension = getExtensionFromMimeType(normalizedType);

  // Get file size
  const size = file instanceof Buffer ? file.length : (file as Blob | File).size;

  const result: ValidationResult = {
    valid: true,
    errors,
    warnings,
    normalized: {
      mimeType: normalizedType,
      category,
      extension,
    },
    metadata: {
      size,
    },
  };

  // Check if we recognize this MIME type
  if (!category) {
    errors.push(`Unrecognized media type: ${normalizedType || 'unknown'}`);
    result.valid = false;
    return result;
  }

  // Check required category
  if (options.requireCategory && category !== options.requireCategory) {
    errors.push(`Expected ${options.requireCategory} file, got ${category}`);
    result.valid = false;
    return result;
  }

  // Get constraints for this category
  const constraints = getConstraintsForCategory(category);

  // Check if MIME type is in allowed list
  const allowedTypes = [...constraints.allowedTypes, ...(options.additionalTypes || [])];
  if (!allowedTypes.includes(normalizedType)) {
    errors.push(`File type '${normalizedType}' not allowed. Supported: ${allowedTypes.join(', ')}`);
    result.valid = false;
  }

  // Check Whisper compatibility if requested
  if (options.forWhisper) {
    if (
      !WHISPER_CONSTRAINTS.supportedFormats.includes(
        normalizedType as (typeof WHISPER_CONSTRAINTS.supportedFormats)[number]
      )
    ) {
      errors.push(`File type '${normalizedType}' not supported by Whisper API`);
      result.valid = false;
    }
    if (size > WHISPER_CONSTRAINTS.maxSize) {
      errors.push(
        `File too large for Whisper API: ${formatBytes(size)} (max: ${formatBytes(WHISPER_CONSTRAINTS.maxSize)})`
      );
      result.valid = false;
    }
  }

  // Check size constraints
  const maxSize = options.maxSize ?? constraints.maxSize;
  const minSize = options.minSize ?? constraints.minSize;

  if (size === 0) {
    errors.push('File is empty');
    result.valid = false;
  } else if (size < minSize) {
    errors.push(`File too small: ${formatBytes(size)} (minimum: ${formatBytes(minSize)})`);
    result.valid = false;
  } else if (size > maxSize) {
    errors.push(`File too large: ${formatBytes(size)} (maximum: ${formatBytes(maxSize)})`);
    result.valid = false;
  }

  // Content-based validation (magic numbers)
  if (options.validateContent && result.valid) {
    try {
      // Get first 12 bytes for magic number detection
      let headerBytes: Buffer;

      if (file instanceof Buffer) {
        headerBytes = file.subarray(0, 12);
      } else {
        const blob = file as Blob;
        const slice = blob.slice(0, 12);
        const arrayBuffer = await slice.arrayBuffer();
        headerBytes = Buffer.from(arrayBuffer);
      }

      const detectedType = detectMediaTypeFromBuffer(headerBytes);
      result.metadata!.detectedType = detectedType || undefined;

      if (detectedType) {
        const detectedCategory = getMediaCategory(detectedType);

        // Check if detected type matches declared category
        if (detectedCategory && detectedCategory !== category) {
          warnings.push(
            `Content appears to be ${detectedCategory} but was declared as ${category}. ` +
              `Detected: ${detectedType}, Declared: ${normalizedType}`
          );
        }

        // Check for type mismatch within same category
        if (detectedType !== normalizedType && detectedCategory === category) {
          warnings.push(
            `Detected type (${detectedType}) differs from declared type (${normalizedType})`
          );
        }
      } else {
        // Could not detect type - only warn for binary formats
        if (category !== 'text') {
          warnings.push('Could not verify file content type from magic numbers');
        }
      }
    } catch (err) {
      warnings.push(
        `Content validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

// =============================================================================
// Quick Validation Helpers
// =============================================================================

/**
 * Quick check if a MIME type is valid audio
 */
export function isValidAudio(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return AUDIO_CONSTRAINTS.allowedTypes.includes(
    normalized as (typeof AUDIO_CONSTRAINTS.allowedTypes)[number]
  );
}

/**
 * Quick check if a MIME type is valid video
 */
export function isValidVideo(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return VIDEO_CONSTRAINTS.allowedTypes.includes(
    normalized as (typeof VIDEO_CONSTRAINTS.allowedTypes)[number]
  );
}

/**
 * Quick check if a MIME type is valid image
 */
export function isValidImage(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return IMAGE_CONSTRAINTS.allowedTypes.includes(
    normalized as (typeof IMAGE_CONSTRAINTS.allowedTypes)[number]
  );
}

/**
 * Quick check if a MIME type is valid text
 */
export function isValidText(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return TEXT_CONSTRAINTS.allowedTypes.includes(
    normalized as (typeof TEXT_CONSTRAINTS.allowedTypes)[number]
  );
}

/**
 * Quick check if a file can be transcribed by Whisper
 */
export function isWhisperCompatible(mimeType: string, size: number): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (
    WHISPER_CONSTRAINTS.supportedFormats.includes(
      normalized as (typeof WHISPER_CONSTRAINTS.supportedFormats)[number]
    ) && size <= WHISPER_CONSTRAINTS.maxSize
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Parse file size string to bytes
 */
export function parseBytes(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(bytes?|kb?|mb?|gb?)?$/i);
  if (!match) {
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();

  const multipliers: Record<string, number> = {
    b: 1,
    byte: 1,
    bytes: 1,
    k: 1024,
    kb: 1024,
    m: 1024 * 1024,
    mb: 1024 * 1024,
    g: 1024 * 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  return Math.floor(value * (multipliers[unit] || 1));
}
