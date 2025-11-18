/**
 * useVideoUpload Hook
 * Handles video upload with progress tracking
 * Pattern: Direct upload to Supabase Storage, then API call to update DB
 */

import { useState, useCallback } from 'react';

import { VIBELOGS_BUCKET } from '@/lib/storage';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface VideoUploadResult {
  url: string;
  duration?: number;
  width?: number;
  height?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useVideoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload video directly to Supabase Storage, then update database
   * This bypasses Vercel's 4.5MB body size limit for Hobby plan
   * @param videoBlob - The recorded video blob
   * @param vibelogId - The vibelog ID to associate with
   * @param source - Video source: 'captured' (camera) or 'uploaded' (file)
   * @returns Promise with video URL and metadata
   */
  const uploadVideo = useCallback(
    async (
      videoBlob: Blob,
      vibelogId: string,
      source: 'captured' | 'uploaded' = 'captured'
    ): Promise<VideoUploadResult> => {
      try {
        setIsUploading(true);
        setError(null);
        setUploadProgress({ loaded: 0, total: 0, percentage: 0 });

        console.log('📹 [VIDEO-UPLOAD] Starting direct upload to Supabase...', {
          blobSize: videoBlob.size,
          blobType: videoBlob.type,
          vibelogId,
        });

        // Get Supabase client
        const supabase = createBrowserSupabaseClient();

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Authentication required');
        }

        // Generate storage path
        const timestamp = Date.now();
        const randomHash = Math.random().toString(36).substring(2, 10);
        const fileExt = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const path = `users/${user.id}/video/${vibelogId}/${timestamp}-${randomHash}.${fileExt}`;

        console.log('📹 [VIDEO-UPLOAD] Uploading to path:', path);

        // Upload to Supabase Storage with progress tracking
        // Note: Supabase doesn't natively support upload progress, so we'll simulate it
        setUploadProgress({ loaded: 0, total: videoBlob.size, percentage: 0 });

        const { error: uploadError } = await supabase.storage
          .from(VIBELOGS_BUCKET)
          .upload(path, videoBlob, {
            contentType: videoBlob.type,
            upsert: true,
          });

        if (uploadError) {
          console.error('❌ [VIDEO-UPLOAD] Storage upload failed:', uploadError);
          throw uploadError;
        }

        // Update progress to 100%
        setUploadProgress({ loaded: videoBlob.size, total: videoBlob.size, percentage: 100 });

        // Generate public URL
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const url = supabaseUrl
          ? `${supabaseUrl}/storage/v1/object/public/${VIBELOGS_BUCKET}/${path}`
          : `/${path}`;

        console.log('✅ [VIDEO-UPLOAD] Upload successful:', url);

        // Update database via API (lightweight call, just URL update)
        const updateResponse = await fetch('/api/vibelog/update-video-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vibelogId,
            videoUrl: url,
            videoSource: source,
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update database');
        }

        console.log('✅ [VIDEO-UPLOAD] Database updated');

        setIsUploading(false);
        return {
          url,
          duration: undefined,
          width: undefined,
          height: undefined,
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
        console.error('❌ [VIDEO-UPLOAD] Upload error:', errorMessage, err);
        setError(errorMessage);
        setIsUploading(false);
        throw err;
      }
    },
    []
  );

  return {
    uploadVideo,
    isUploading,
    uploadProgress,
    error,
  };
}
