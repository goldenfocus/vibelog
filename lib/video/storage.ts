/**
 * Video Storage
 * Upload generated videos to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side operations
);

/**
 * Download video from fal.ai URL and upload to Supabase Storage
 */
export async function uploadVideoToStorage(
  videoUrl: string,
  vibelogId: string
): Promise<string> {
  try {
    console.log('[Video Storage] Downloading video from fal.ai:', videoUrl);

    // Download video from fal.ai
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();

    console.log('[Video Storage] Video downloaded, size:', videoBlob.size, 'bytes');

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `vibelogs/${vibelogId}/${timestamp}-video.mp4`;

    console.log('[Video Storage] Uploading to Supabase Storage:', filename);

    // Upload to Supabase Storage (use 'vibelogs' bucket)
    const { error } = await supabase.storage
      .from('vibelogs')
      .upload(filename, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      console.error('[Video Storage] Upload error:', error);
      throw new Error(`Failed to upload video to storage: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('vibelogs')
      .getPublicUrl(filename);

    console.log('[Video Storage] Video uploaded successfully:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('[Video Storage] Error:', error);
    throw error;
  }
}

/**
 * Delete video from Supabase Storage
 */
export async function deleteVideoFromStorage(videoUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const url = new URL(videoUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/vibelogs\/(.+)/);

    if (!pathMatch) {
      throw new Error('Invalid video URL format');
    }

    const filePath = pathMatch[1];

    console.log('[Video Storage] Deleting video:', filePath);

    const { error } = await supabase.storage
      .from('vibelogs')
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete video: ${error.message}`);
    }

    console.log('[Video Storage] Video deleted successfully');
  } catch (error) {
    console.error('[Video Storage] Delete error:', error);
    throw error;
  }
}
