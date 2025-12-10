'use client';

/**
 * Music Upload Zone Component
 *
 * Allows users to upload music (MP3, WAV, etc.) and music videos (MP4, MOV)
 * that become vibelogs with AI-generated content, cover art, and translations.
 *
 * Flow:
 * 1. User selects/drops a music file
 * 2. Optionally uploads custom cover art
 * 3. Clicks "Publish Music"
 * 4. API transcribes, generates content, cover, and saves vibelog
 */

import { Music, Video, X, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface MusicUploadZoneProps {
  onSuccess?: (vibelogId: string, publicUrl: string) => void;
  onCancel?: () => void;
}

const MAX_SIZE_MB = 500;
const ALLOWED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
];
const ALLOWED_VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'];
const ALLOWED_FORMATS = [...ALLOWED_AUDIO_FORMATS, ...ALLOWED_VIDEO_FORMATS];

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function MusicUploadZone({ onSuccess, onCancel }: MusicUploadZoneProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Music file state
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPreview, setMusicPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  // Cover image state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Title override
  const [title, setTitle] = useState('');

  const musicInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isAudioFormat = useCallback((type: string) => {
    const normalized = type.split(';')[0].trim().toLowerCase();
    return ALLOWED_AUDIO_FORMATS.includes(normalized);
  }, []);

  const handleMusicSelect = useCallback(
    (file: File) => {
      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_SIZE_MB) {
        setError(
          `File is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`
        );
        setStatus('error');
        return;
      }

      // Validate file type
      const normalized = file.type.split(';')[0].trim().toLowerCase();
      if (!ALLOWED_FORMATS.includes(normalized)) {
        setError(`Invalid format. Supported: MP3, WAV, M4A, OGG, FLAC, MP4, MOV, WebM`);
        setStatus('error');
        return;
      }

      setMusicFile(file);
      setIsVideo(!isAudioFormat(file.type));
      setError(null);
      setStatus('idle');

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setMusicPreview(previewUrl);
    },
    [isAudioFormat]
  );

  const handleCoverSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Cover must be an image file (PNG, JPG, WebP)');
      return;
    }

    // Validate size (max 10MB for images)
    if (file.size > 10 * 1024 * 1024) {
      setError('Cover image is too large. Maximum size is 10MB.');
      return;
    }

    setCoverFile(file);
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    setError(null);
  }, []);

  const handleMusicInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMusicSelect(file);
    }
  };

  const handleCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Check if it's an image (for cover) or music file
      if (file.type.startsWith('image/')) {
        handleCoverSelect(file);
      } else {
        handleMusicSelect(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!musicFile) {
      return;
    }

    try {
      setStatus('uploading');
      setUploadProgress(0);
      setError(null);

      console.log('[MusicUploadZone] Starting upload:', {
        fileName: musicFile.name,
        fileSize: musicFile.size,
        isVideo,
      });

      // Create FormData
      const formData = new FormData();
      formData.append('file', musicFile);

      if (coverFile) {
        formData.append('coverImage', coverFile);
      }

      if (title.trim()) {
        formData.append('title', title.trim());
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);

          // Switch to processing status at 100%
          if (progress === 100) {
            setStatus('processing');
            setProcessingStep('Transcribing audio...');

            // Simulate processing steps for user feedback
            setTimeout(() => setProcessingStep('Generating content...'), 3000);
            setTimeout(() => setProcessingStep('Creating cover art...'), 8000);
            setTimeout(() => setProcessingStep('Publishing...'), 15000);
          }
        }
      });

      // Handle completion
      const response = await new Promise<{
        success: boolean;
        vibelogId?: string;
        publicUrl?: string;
        message?: string;
        error?: string;
      }>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && data.success) {
              resolve(data);
            } else {
              reject(
                new Error(data.message || data.error || `Upload failed with status ${xhr.status}`)
              );
            }
          } catch {
            reject(new Error('Invalid response from server'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out. Please try again.'));
        });

        xhr.open('POST', '/api/vibelog/upload-music');
        xhr.timeout = 300000; // 5 minute timeout
        xhr.send(formData);
      });

      console.log('[MusicUploadZone] Upload successful:', response);

      setStatus('success');
      toast.success('Music published!', {
        description: 'Your music vibelog is now live.',
      });

      if (onSuccess && response.vibelogId && response.publicUrl) {
        onSuccess(response.vibelogId, response.publicUrl);
      }

      // Redirect after short delay
      if (response.publicUrl) {
        setTimeout(() => {
          window.location.href = response.publicUrl!;
        }, 1500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload music';
      console.error('[MusicUploadZone] Upload error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
      toast.error('Upload failed', { description: errorMessage });
    }
  };

  const handleClear = () => {
    // Revoke object URLs to prevent memory leaks
    if (musicPreview) {
      URL.revokeObjectURL(musicPreview);
    }
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setMusicFile(null);
    setMusicPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    setTitle('');
    setIsVideo(false);
    setError(null);
    setStatus('idle');
    setUploadProgress(0);
    setProcessingStep('');

    if (musicInputRef.current) {
      musicInputRef.current.value = '';
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const removeCover = () => {
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  // Processing state
  if (status === 'processing') {
    return (
      <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-8 text-center dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-800/50">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-purple-900 dark:text-purple-100">
          Processing your music...
        </h3>
        <p className="text-sm text-purple-700 dark:text-purple-300">{processingStep}</p>
        <p className="mt-4 text-xs text-purple-600 dark:text-purple-400">
          This may take a minute. Please don&apos;t close this page.
        </p>
      </div>
    );
  }

  // Uploading state
  if (status === 'uploading') {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-center gap-3">
          <Music className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Uploading... {uploadProgress}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Upload failed</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={handleClear}
              className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-800/50 dark:text-red-200 dark:hover:bg-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // File selected - show preview and upload form
  if (musicFile && musicPreview) {
    return (
      <div className="space-y-4 rounded-xl border border-border/50 bg-card p-6">
        {/* Music file info */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            {isVideo ? (
              <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            ) : (
              <Music className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">{musicFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(musicFile.size / (1024 * 1024)).toFixed(1)}MB •{' '}
              {isVideo ? 'Music Video' : 'Audio Track'}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Remove file"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media preview */}
        {isVideo ? (
          <video
            src={musicPreview}
            controls
            className="w-full rounded-lg bg-black"
            style={{ maxHeight: '250px' }}
          />
        ) : (
          <audio src={musicPreview} controls className="w-full" />
        )}

        {/* Optional title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="AI will generate a title if left empty"
            className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        {/* Cover image */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Cover Art (optional)</label>
          {coverPreview ? (
            <div className="relative inline-block">
              <img
                src={coverPreview}
                alt="Cover preview"
                className="h-24 w-24 rounded-lg object-cover"
              />
              <button
                onClick={removeCover}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                aria-label="Remove cover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 px-4 py-3 text-sm text-muted-foreground hover:border-border hover:bg-muted/50"
            >
              <ImageIcon className="h-4 w-4" />
              Add cover art (AI will generate if empty)
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverInputChange}
            className="hidden"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpload}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
          >
            <Music className="h-4 w-4" />
            Publish Music
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          AI will transcribe, generate content, create cover art, and translate to 6 languages
        </p>
      </div>
    );
  }

  // Default: Upload zone
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="rounded-xl border-2 border-dashed border-border/50 bg-gradient-to-br from-purple-50/50 to-pink-50/50 p-8 text-center transition-colors hover:border-purple-300 hover:from-purple-50 hover:to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 dark:hover:border-purple-700 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20"
    >
      <input
        ref={musicInputRef}
        type="file"
        accept="audio/*,video/mp4,video/quicktime,video/webm"
        onChange={handleMusicInputChange}
        className="hidden"
        aria-label="Select music file"
      />

      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50">
        <Music className="h-8 w-8 text-purple-600 dark:text-purple-400" />
      </div>

      <h3 className="mb-2 text-lg font-semibold">Upload Your Music</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Drop your track or music video here, or click to browse
      </p>

      <button
        onClick={() => musicInputRef.current?.click()}
        className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
      >
        Choose File
      </button>

      <div className="mt-6 space-y-1 text-xs text-muted-foreground">
        <p>
          <strong>Audio:</strong> MP3, WAV, M4A, OGG, FLAC, WebM
        </p>
        <p>
          <strong>Video:</strong> MP4, MOV, WebM
        </p>
        <p>Maximum {MAX_SIZE_MB}MB</p>
      </div>
    </div>
  );
}
