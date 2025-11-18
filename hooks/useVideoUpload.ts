/**
 * useVideoUpload Hook
 * Handles video upload with progress tracking
 * Pattern: Follows uploadAudio from useVibelogAPI.ts
 */

import { useState, useCallback } from 'react';

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
   * Upload video to Supabase Storage via API
   * @param videoBlob - The recorded video blob
   * @param vibelogId - The vibelog ID to associate with
   * @returns Promise with video URL and metadata
   */
  const uploadVideo = useCallback(
    async (videoBlob: Blob, vibelogId: string): Promise<VideoUploadResult> => {
      try {
        setIsUploading(true);
        setError(null);
        setUploadProgress({ loaded: 0, total: 0, percentage: 0 });

        console.log('📹 [VIDEO-UPLOAD] Starting upload...', {
          blobSize: videoBlob.size,
          blobType: videoBlob.type,
          vibelogId,
        });

        // Create FormData
        const formData = new FormData();
        formData.append('video', videoBlob, 'captured-video.webm');
        formData.append('vibelogId', vibelogId);

        // Upload with progress tracking using XMLHttpRequest
        const result = await new Promise<VideoUploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) {
              const progress = {
                loaded: e.loaded,
                total: e.total,
                percentage: Math.round((e.loaded / e.total) * 100),
              };
              setUploadProgress(progress);
              console.log('📹 [VIDEO-UPLOAD] Progress:', progress.percentage + '%');
            }
          });

          // Handle completion
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              try {
                const responseData = JSON.parse(xhr.responseText);

                if (!responseData.success) {
                  reject(new Error(responseData.details || responseData.error || 'Upload failed'));
                  return;
                }

                console.log('✅ [VIDEO-UPLOAD] Upload successful:', responseData.url);

                resolve({
                  url: responseData.url,
                  // TODO: Extract video metadata if available
                  duration: undefined,
                  width: undefined,
                  height: undefined,
                });
              } catch {
                reject(new Error('Failed to parse upload response'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          // Handle errors
          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
          });

          // Send request
          xhr.open('POST', '/api/vibelog/upload-video');
          xhr.send(formData);
        });

        setIsUploading(false);
        return result;
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
