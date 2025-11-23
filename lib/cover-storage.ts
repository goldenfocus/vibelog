/**
 * Cover Image Storage Utilities
 *
 * Single source of truth for all cover image storage operations.
 * All cover images are stored in: vibelog-covers/covers/{vibelogId}.{ext}
 *
 * This ensures:
 * - One cover file per vibelog (predictable paths)
 * - Consistent naming across AI-generated and user-uploaded covers
 * - Easy deletion/modification (no path guessing needed)
 * - Future-proof for new features
 */

import { createServerSupabaseClient } from './supabase';

const BUCKET_NAME = 'vibelog-covers';
const COVERS_DIR = 'covers';

/**
 * Get the storage path for a cover image
 * @param vibelogId - The vibelog ID
 * @param extension - File extension (default: 'png')
 * @returns Storage path: covers/{vibelogId}.{ext}
 */
export function getCoverPath(vibelogId: string, extension: string = 'png'): string {
  return `${COVERS_DIR}/${vibelogId}.${extension}`;
}

/**
 * Get the public URL for a cover image
 * @param vibelogId - The vibelog ID
 * @param extension - File extension (default: 'png')
 * @returns Full public URL to the cover image
 */
export async function getCoverUrl(vibelogId: string, extension: string = 'png'): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const path = getCoverPath(vibelogId, extension);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  return publicUrl;
}

/**
 * Upload a cover image to storage
 * @param vibelogId - The vibelog ID
 * @param buffer - Image buffer
 * @param contentType - MIME type (e.g., 'image/png', 'image/jpeg')
 * @returns Object with url and error (if any)
 */
export async function uploadCover(
  vibelogId: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Determine extension from content type
    const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const path = getCoverPath(vibelogId, extension);

    // Delete existing cover if it exists (upsert behavior)
    await deleteCover(vibelogId);

    // Upload new cover
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
      contentType,
      cacheControl: '31536000', // 1 year cache
      upsert: true,
    });

    if (uploadError) {
      console.error('❌ Failed to upload cover:', uploadError.message);
      return { url: null, error: uploadError.message };
    }

    // Get public URL
    const url = await getCoverUrl(vibelogId, extension);

    console.log('✅ Cover uploaded successfully:', url);
    return { url, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Cover upload error:', errorMessage);
    return { url: null, error: errorMessage };
  }
}

/**
 * Delete a cover image from storage
 * Handles both .png and .jpg extensions (tries both)
 * @param vibelogId - The vibelog ID
 * @returns Object with success status and error (if any)
 */
export async function deleteCover(
  vibelogId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Try deleting both .png and .jpg versions (cover might exist in either format)
    const pathPng = getCoverPath(vibelogId, 'png');
    const pathJpg = getCoverPath(vibelogId, 'jpg');

    const { error: errorPng } = await supabase.storage.from(BUCKET_NAME).remove([pathPng]);
    const { error: errorJpg } = await supabase.storage.from(BUCKET_NAME).remove([pathJpg]);

    // Consider successful if at least one deletion succeeded or both files don't exist
    const bothFailed = errorPng && errorJpg;

    if (bothFailed) {
      console.warn('⚠️  Cover deletion warnings:', { errorPng, errorJpg });
      // Not a critical error if file doesn't exist
      return { success: true, error: null };
    }

    console.log('🗑️  Cover deleted successfully:', vibelogId);
    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Cover deletion error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if a cover exists for a vibelog
 * @param vibelogId - The vibelog ID
 * @returns true if cover exists, false otherwise
 */
export async function coverExists(vibelogId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check both .png and .jpg
    const { data: dataPng } = await supabase.storage.from(BUCKET_NAME).list(COVERS_DIR, {
      search: `${vibelogId}.png`,
    });

    const { data: dataJpg } = await supabase.storage.from(BUCKET_NAME).list(COVERS_DIR, {
      search: `${vibelogId}.jpg`,
    });

    return (dataPng && dataPng.length > 0) || (dataJpg && dataJpg.length > 0);
  } catch (err) {
    console.error('❌ Error checking cover existence:', err);
    return false;
  }
}
