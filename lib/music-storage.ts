/**
 * Music File Storage Utilities
 *
 * Handles storage operations for music uploads (MP3, WAV, etc.) and music videos (MP4, MOV).
 * Uses the existing 'vibelogs' bucket with a 'music' category for organization.
 *
 * Storage structure:
 * vibelogs/
 *   {userId}/
 *     music/
 *       {timestamp}-{hash}.{ext}
 */

import { VIBELOGS_BUCKET, getVibelogPublicUrl } from '@/lib/storage';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

const MUSIC_CATEGORY = 'music';

// Supported music file types
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', // MP3
  'audio/mp3', // MP3 (alternate)
  'audio/wav', // WAV
  'audio/wave', // WAV (alternate)
  'audio/x-wav', // WAV (alternate)
  'audio/mp4', // M4A/AAC
  'audio/aac', // AAC
  'audio/ogg', // OGG
  'audio/flac', // FLAC
  'audio/webm', // WebM audio
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4', // MP4
  'video/quicktime', // MOV
  'video/webm', // WebM
  'video/x-msvideo', // AVI
  'video/mpeg', // MPEG
];

export const SUPPORTED_MUSIC_TYPES = [...SUPPORTED_AUDIO_TYPES, ...SUPPORTED_VIDEO_TYPES];

// Max file size: 500MB (matches existing video upload limits)
export const MAX_MUSIC_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Determine if a MIME type is a music audio file
 */
export function isMusicAudio(mimeType: string): boolean {
  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  return SUPPORTED_AUDIO_TYPES.includes(normalized);
}

/**
 * Determine if a MIME type is a music video file
 */
export function isMusicVideo(mimeType: string): boolean {
  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  return SUPPORTED_VIDEO_TYPES.includes(normalized);
}

/**
 * Validate music file type
 */
export function isValidMusicType(mimeType: string): boolean {
  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  return SUPPORTED_MUSIC_TYPES.includes(normalized);
}

/**
 * Get the media_type value for database based on file type
 */
export function getMediaType(mimeType: string): 'music' | 'music_video' {
  return isMusicVideo(mimeType) ? 'music_video' : 'music';
}

/**
 * Generate storage path for music file
 * Format: {userId}/music/{timestamp}-{random}.{ext}
 */
export function generateMusicPath(userId: string, mimeType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const extension = getMusicExtension(mimeType);
  const filename = `${timestamp}-${random}.${extension}`;

  return `${userId}/${MUSIC_CATEGORY}/${filename}`;
}

/**
 * Get file extension from music MIME type
 */
export function getMusicExtension(mimeType: string): string {
  const normalized = mimeType.split(';')[0].trim().toLowerCase();

  const map: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/webm': 'webm',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-msvideo': 'avi',
    'video/mpeg': 'mpeg',
  };

  return map[normalized] || 'mp3';
}

/**
 * Upload music file to storage
 * @returns Object with url, path, and error (if any)
 */
export async function uploadMusicFile(
  userId: string,
  file: Buffer | Blob,
  mimeType: string
): Promise<{ url: string | null; path: string | null; error: string | null }> {
  try {
    if (!isValidMusicType(mimeType)) {
      return {
        url: null,
        path: null,
        error: `Unsupported file type: ${mimeType}. Supported types: MP3, WAV, M4A, OGG, FLAC, MP4, MOV, WebM`,
      };
    }

    const supabase = await createServerAdminClient();
    const storagePath = generateMusicPath(userId, mimeType);

    // Convert Blob to ArrayBuffer if needed
    const buffer = file instanceof Blob ? Buffer.from(await file.arrayBuffer()) : file;

    const { error: uploadError } = await supabase.storage
      .from(VIBELOGS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: false, // Don't overwrite (unique paths)
      });

    if (uploadError) {
      console.error('❌ Failed to upload music file:', uploadError.message);
      return { url: null, path: null, error: uploadError.message };
    }

    const url = getVibelogPublicUrl(storagePath);
    console.log('✅ Music file uploaded:', url);

    return { url, path: storagePath, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Music upload error:', errorMessage);
    return { url: null, path: null, error: errorMessage };
  }
}

/**
 * Delete music file from storage
 */
export async function deleteMusicFile(
  storagePath: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerAdminClient();

    const { error } = await supabase.storage.from(VIBELOGS_BUCKET).remove([storagePath]);

    if (error) {
      console.error('❌ Failed to delete music file:', error.message);
      return { success: false, error: error.message };
    }

    console.log('🗑️ Music file deleted:', storagePath);
    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Music deletion error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get public URL for music file
 */
export function getMusicPublicUrl(storagePath: string): string {
  return getVibelogPublicUrl(storagePath);
}

/**
 * Create presigned upload URL for client-side direct upload
 * Useful for large files that would exceed API route limits
 */
export async function getPresignedMusicUploadUrl(
  userId: string,
  mimeType: string
): Promise<{ signedUrl: string; path: string; token: string; error: string | null }> {
  try {
    if (!isValidMusicType(mimeType)) {
      return {
        signedUrl: '',
        path: '',
        token: '',
        error: `Unsupported file type: ${mimeType}`,
      };
    }

    const supabase = await createServerAdminClient();
    const storagePath = generateMusicPath(userId, mimeType);

    const { data, error } = await supabase.storage
      .from(VIBELOGS_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('❌ Failed to create presigned URL:', error.message);
      return { signedUrl: '', path: '', token: '', error: error.message };
    }

    return {
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Presigned URL error:', errorMessage);
    return { signedUrl: '', path: '', token: '', error: errorMessage };
  }
}
