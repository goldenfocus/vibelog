import { createServerAdminClient } from '@/lib/supabaseAdmin';

export type PutResult = { url: string; path: string };

export interface Storage {
  put(path: string, buf: Buffer, contentType: string): Promise<PutResult>;
  publicUrl(path: string): string;
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'vibelog-covers';
export const VIBELOGS_BUCKET = 'vibelogs'; // For audio/video uploads

/**
 * File type categories for organized storage
 */
export enum FileCategory {
  AUDIO = 'audio',
  VIDEO = 'video',
  IMAGE = 'image',
}

function publicUrl(path: string): string {
  // Use Supabase storage URL directly - it's fast, reliable, and globally distributed
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  }
  return `/${path}`;
}

function supabaseStorage(): Storage {
  return {
    async put(path, buf, contentType) {
      const supabase = await createServerAdminClient();
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType,
        upsert: true,
      });
      if (error) {
        throw error;
      }
      return { url: publicUrl(path), path };
    },
    publicUrl,
  };
}

export const storage: Storage = supabaseStorage();
export { publicUrl };

// ============================================================================
// Direct Upload Utilities (for large files like audio/video)
// ============================================================================

/**
 * Generate a unique storage path for a file
 * Format: {userId}/{category}/{timestamp}-{random}.{ext}
 */
export function generateStoragePath(
  userId: string,
  category: FileCategory,
  fileExtension: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const filename = `${timestamp}-${random}.${fileExtension}`;

  return `${userId}/${category}/${filename}`;
}

/**
 * Get presigned upload URL for client-side direct upload
 * This bypasses API route payload limits
 */
export async function getPresignedUploadUrl(
  storagePath: string
): Promise<{ signedUrl: string; path: string; token: string }> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase.storage
    .from(VIBELOGS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error('Failed to create signed upload URL:', error);
    throw new Error(`Storage presign failed: ${error.message}`);
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
  };
}

/**
 * Download file from storage (server-side only)
 * Used by API routes to process uploaded files
 */
export async function downloadFromStorage(storagePath: string): Promise<Blob> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase.storage.from(VIBELOGS_BUCKET).download(storagePath);

  if (error) {
    console.error('Failed to download from storage:', error);
    throw new Error(`Storage download failed: ${error.message}`);
  }

  return data;
}

/**
 * Delete file from storage (cleanup after processing)
 */
export async function deleteFromStorage(storagePath: string): Promise<void> {
  const supabase = await createServerAdminClient();

  const { error } = await supabase.storage.from(VIBELOGS_BUCKET).remove([storagePath]);

  if (error) {
    console.error('Failed to delete from storage:', error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}

/**
 * Get public URL for a file in vibelogs bucket
 */
export function getVibelogPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${VIBELOGS_BUCKET}/${storagePath}`;
  }
  return `/${storagePath}`;
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  // Normalize by stripping codecs parameter (e.g., "audio/webm; codecs=opus" -> "audio/webm")
  const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase();

  const map: Record<string, string> = {
    // Audio types
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    // Video types
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/mpeg': 'mpeg',
    // Image types
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  return map[normalizedMimeType] || 'webm';
}

/**
 * Get file category from mime type
 */
export function getCategoryFromMimeType(mimeType: string): FileCategory {
  // Normalize by stripping codecs parameter
  const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase();

  if (normalizedMimeType.startsWith('audio/')) {
    return FileCategory.AUDIO;
  }
  if (normalizedMimeType.startsWith('video/')) {
    return FileCategory.VIDEO;
  }
  if (normalizedMimeType.startsWith('image/')) {
    return FileCategory.IMAGE;
  }

  // Default to audio for music uploads
  console.warn(`Unknown mime type: ${mimeType}, defaulting to AUDIO`);
  return FileCategory.AUDIO;
}

/**
 * TTS Storage Bucket
 */
export const TTS_BUCKET = 'tts-audio';

/**
 * Generate storage path for TTS audio file
 * Uses hash-based directory structure to avoid too many files in one folder
 * Format: tts/{hash[0:2]}/{hash[2:4]}/{hash}.mp3
 */
export function generateTTSPath(contentHash: string): string {
  // Use first 2 chars and next 2 chars as subdirectories for better organization
  const dir1 = contentHash.substring(0, 2);
  const dir2 = contentHash.substring(2, 4);
  return `tts/${dir1}/${dir2}/${contentHash}.mp3`;
}

/**
 * Store TTS audio file in Supabase storage
 */
export async function storeTTSAudio(contentHash: string, audioBuffer: Buffer): Promise<string> {
  const supabase = await createServerAdminClient();
  const storagePath = generateTTSPath(contentHash);

  const { error } = await supabase.storage.from(TTS_BUCKET).upload(storagePath, audioBuffer, {
    contentType: 'audio/mpeg',
    upsert: true, // Overwrite if exists (shouldn't happen with hash, but safe)
  });

  if (error) {
    console.error('Failed to store TTS audio:', error);
    throw new Error(`TTS storage failed: ${error.message}`);
  }

  // Return public URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${TTS_BUCKET}/${storagePath}`;
  }

  return storagePath;
}

/**
 * Get public URL for TTS audio file
 */
export function getTTSPublicUrl(contentHash: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const storagePath = generateTTSPath(contentHash);
    return `${supabaseUrl}/storage/v1/object/public/${TTS_BUCKET}/${storagePath}`;
  }
  const storagePath = generateTTSPath(contentHash);
  return `/${TTS_BUCKET}/${storagePath}`;
}

/**
 * Extract storage path from TTS public URL
 * Converts: {supabase_url}/storage/v1/object/public/{bucket}/{path} → {path}
 */
export function extractTTSPathFromUrl(publicUrl: string): string {
  // URL format: {supabase_url}/storage/v1/object/public/{bucket}/{path}
  const parts = publicUrl.split('/');
  const publicIndex = parts.indexOf('public');
  if (publicIndex === -1) {
    throw new Error('Invalid TTS public URL format');
  }
  // Skip bucket name (next element after 'public') and get the rest as path
  return parts.slice(publicIndex + 2).join('/');
}

/**
 * Extract storage path from Supabase public URL
 * Converts: {supabase_url}/storage/v1/object/public/{bucket}/{path} → {path}
 *
 * @param url - Full Supabase storage public URL
 * @param bucket - Bucket name (e.g., 'vibelogs', 'vibelog-covers', 'tts-audio')
 * @returns Storage path relative to bucket, or null if extraction fails
 *
 * @example
 * extractStoragePath(
 *   'https://xyz.supabase.co/storage/v1/object/public/vibelogs/user123/audio/file.webm',
 *   'vibelogs'
 * )
 * // Returns: 'user123/audio/file.webm'
 */
export function extractStoragePath(url: string | null, bucket: string): string | null {
  if (!url) {
    return null;
  }

  // URL format: {supabase_url}/storage/v1/object/public/{bucket}/{path}
  const publicPattern = `/storage/v1/object/public/${bucket}/`;
  const pathStartIndex = url.indexOf(publicPattern);

  if (pathStartIndex === -1) {
    console.warn(`[Storage] Could not extract path from URL: ${url}`);
    return null;
  }

  return url.substring(pathStartIndex + publicPattern.length);
}
