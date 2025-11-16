'use client';

/**
 * Video Upload Zone Component
 * Allows users to upload their own videos (pivot from AI generation)
 * Pattern: Similar to audio recording flow but with file upload
 */

import { Upload, Video, X, AlertCircle, Check } from 'lucide-react';
import React, { useState, useRef } from 'react';

interface VideoUploadZoneProps {
  vibelogId: string;
  onVideoUploaded?: (videoUrl: string) => void;
  maxSizeMB?: number;
}

const MAX_SIZE_MB = 500;
const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'];

export function VideoUploadZone({
  vibelogId,
  onVideoUploaded,
  maxSizeMB = MAX_SIZE_MB,
}: VideoUploadZoneProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`Video is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`);
      setStatus('error');
      return;
    }

    // Validate file type
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setError(
        `Invalid video format. Supported formats: MP4, MOV, WebM. You selected: ${file.type}`
      );
      setStatus('error');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setStatus('idle');

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      setStatus('uploading');
      setUploadProgress(0);
      setError(null);

      console.log('[VideoUploadZone] Uploading video:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        vibelogId,
      });

      // Create FormData
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('vibelogId', vibelogId);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Handle completion
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', '/api/vibelog/upload-video');
        xhr.send(formData);
      });

      // Parse response
      const responseData = JSON.parse(xhr.responseText);

      if (!responseData.success) {
        throw new Error(responseData.details || responseData.error || 'Upload failed');
      }

      console.log('[VideoUploadZone] Upload successful:', responseData.url);

      setStatus('success');
      if (onVideoUploaded) {
        onVideoUploaded(responseData.url);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
      console.error('[VideoUploadZone] Upload error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setVideoPreview(null);
    setError(null);
    setStatus('idle');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Video uploaded successfully!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Your video is now part of this vibelog.
          </p>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-green-600 hover:underline dark:text-green-400"
        >
          Upload another
        </button>
      </div>
    );
  }

  // Uploading state
  if (status === 'uploading') {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Uploading video... {uploadProgress}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
              <div
                className="h-full bg-blue-600 transition-all dark:bg-blue-400"
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Upload failed</p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={handleClear}
              className="mt-2 text-xs text-red-600 hover:underline dark:text-red-400"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // File selected (preview + upload button)
  if (selectedFile && videoPreview) {
    return (
      <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-start gap-3">
          <Video className="mt-1 h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
            </p>
          </div>
          <button
            onClick={handleClear}
            className="rounded p-1 hover:bg-muted"
            aria-label="Remove video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video preview */}
        <video
          src={videoPreview}
          controls
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: '300px' }}
        />

        {/* Upload button */}
        <button
          onClick={handleUpload}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
        >
          Upload Video
        </button>
      </div>
    );
  }

  // Default: Upload zone
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="rounded-lg border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center transition-colors hover:border-border hover:bg-muted/30"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/mpeg"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Select video file"
      />

      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
        <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
      </div>

      <h3 className="mb-1 text-sm font-medium">Upload your video</h3>
      <p className="mb-4 text-xs text-muted-foreground">Drag and drop or click to browse</p>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
      >
        Choose Video
      </button>

      <p className="mt-4 text-xs text-muted-foreground">
        Supported: MP4, MOV, WebM • Max {maxSizeMB}MB
      </p>
    </div>
  );
}
