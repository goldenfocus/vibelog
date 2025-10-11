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
  const normalizedMimeType = mimeType.split(';')[0].trim();

  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  return map[normalizedMimeType] || 'webm';
}

/**
 * Get file category from mime type
 */
export function getCategoryFromMimeType(mimeType: string): FileCategory {
  if (mimeType.startsWith('audio/')) {
    return FileCategory.AUDIO;
  }
  if (mimeType.startsWith('video/')) {
    return FileCategory.VIDEO;
  }
  if (mimeType.startsWith('image/')) {
    return FileCategory.IMAGE;
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}
