'use client';

/**
 * Media Upload Zone Component
 *
 * Universal upload for any content type: audio, video, text files.
 * Creates vibelogs with AI-generated content, cover art, and translations.
 *
 * Design: Electric blue glass morphism matching VibeLog's aesthetic
 */

import { FileText, Music, Video, X, AlertCircle, Upload, Sparkles } from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';

import { useUploadJobsStore } from '@/state/upload-jobs-store';

interface MediaUploadZoneProps {
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

const ALLOWED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/mpeg',
  'video/x-msvideo',
];

const ALLOWED_TEXT_FORMATS = [
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
];

const ALLOWED_FORMATS = [
  ...ALLOWED_AUDIO_FORMATS,
  ...ALLOWED_VIDEO_FORMATS,
  ...ALLOWED_TEXT_FORMATS,
];

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
type FileType = 'audio' | 'video' | 'text';

interface ProcessingStep {
  id: string;
  label: string;
  description: string;
}

const AUDIO_STEPS: ProcessingStep[] = [
  { id: 'upload', label: 'Uploading', description: 'Sending to the cloud...' },
  { id: 'transcribe', label: 'Listening', description: 'Hearing your track...' },
  { id: 'understand', label: 'Understanding', description: 'Feeling the vibe...' },
  { id: 'write', label: 'Writing', description: 'Crafting your story...' },
  { id: 'artwork', label: 'Artwork', description: 'Creating cover art...' },
  { id: 'publish', label: 'Publishing', description: 'Going live...' },
];

const VIDEO_STEPS: ProcessingStep[] = [
  { id: 'upload', label: 'Uploading', description: 'Sending to the cloud...' },
  { id: 'process', label: 'Processing', description: 'Analyzing your video...' },
  { id: 'extract', label: 'Extracting', description: 'Capturing the essence...' },
  { id: 'write', label: 'Writing', description: 'Crafting your story...' },
  { id: 'thumbnail', label: 'Thumbnail', description: 'Creating preview...' },
  { id: 'publish', label: 'Publishing', description: 'Going live...' },
];

const TEXT_STEPS: ProcessingStep[] = [
  { id: 'upload', label: 'Reading', description: 'Processing your text...' },
  { id: 'enhance', label: 'Enhancing', description: 'Polishing the content...' },
  { id: 'artwork', label: 'Artwork', description: 'Creating cover art...' },
  { id: 'publish', label: 'Publishing', description: 'Going live...' },
];

function getFileType(mimeType: string): FileType {
  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  if (ALLOWED_VIDEO_FORMATS.includes(normalized)) {
    return 'video';
  }
  if (ALLOWED_TEXT_FORMATS.includes(normalized)) {
    return 'text';
  }
  return 'audio';
}

function getStepsForType(type: FileType): ProcessingStep[] {
  switch (type) {
    case 'video':
      return VIDEO_STEPS;
    case 'text':
      return TEXT_STEPS;
    default:
      return AUDIO_STEPS;
  }
}

function getFileIcon(type: FileType, className: string) {
  switch (type) {
    case 'video':
      return <Video className={className} />;
    case 'text':
      return <FileText className={className} />;
    default:
      return <Music className={className} />;
  }
}

function getFileTypeLabel(type: FileType): string {
  switch (type) {
    case 'video':
      return 'Video';
    case 'text':
      return 'Text';
    default:
      return 'Audio';
  }
}

export function MediaUploadZone({ onSuccess, onCancel }: MediaUploadZoneProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType>('audio');

  // Cover image state
  const [_coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Title override
  const [title, setTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate file size
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_SIZE_MB) {
      setError(`File is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`);
      setStatus('error');
      return;
    }

    // Validate file type
    const normalized = selectedFile.type.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_FORMATS.includes(normalized)) {
      setError(
        'Invalid format. Supported: Audio (MP3, WAV, FLAC), Video (MP4, MOV), Documents (TXT, MD, CSV, HTML, JSON, XML, YAML, RTF)'
      );
      setStatus('error');
      return;
    }

    const detectedType = getFileType(selectedFile.type);
    setFile(selectedFile);
    setFileType(detectedType);
    setError(null);
    setStatus('idle');

    // Create preview URL for audio/video
    if (detectedType !== 'text') {
      const previewUrl = URL.createObjectURL(selectedFile);
      setFilePreview(previewUrl);
    } else {
      setFilePreview(null);
    }
  }, []);

  const handleCoverSelect = useCallback((coverFile: File) => {
    if (!coverFile.type.startsWith('image/')) {
      setError('Cover must be an image file (PNG, JPG, WebP)');
      return;
    }

    if (coverFile.size > 10 * 1024 * 1024) {
      setError('Cover image is too large. Maximum size is 10MB.');
      return;
    }

    setCoverFile(coverFile);
    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);
    setError(null);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const coverFile = e.target.files?.[0];
    if (coverFile) {
      handleCoverSelect(coverFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type.startsWith('image/')) {
        handleCoverSelect(droppedFile);
      } else {
        handleFileSelect(droppedFile);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    // Generate unique job ID
    const jobId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const steps = getStepsForType(fileType);

    // Add job to global store for background tracking
    const { addJob, updateJob } = useUploadJobsStore.getState();
    addJob({
      id: jobId,
      fileName: file.name,
      fileType,
      status: 'uploading',
      progress: 0,
      step: steps[0]?.description,
    });

    try {
      setStatus('uploading');
      setUploadProgress(0);
      setCurrentStepIndex(0);
      setError(null);

      // Step 1: Get presigned URL
      const presignResponse = await fetch('/api/storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: file.type,
          fileSize: file.size,
          sessionId: `media-${Date.now()}`,
        }),
      });

      if (!presignResponse.ok) {
        const err = await presignResponse.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { uploadUrl, storagePath } = await presignResponse.json();

      // Step 2: Upload with progress (continues in background)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            updateJob(jobId, { progress });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Storage upload failed')));
        xhr.addEventListener('timeout', () => reject(new Error('Storage upload timed out')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.timeout = 300000;
        xhr.send(file);
      });

      // Step 3: Processing
      setStatus('processing');
      setCurrentStepIndex(1);
      updateJob(jobId, {
        status: 'processing',
        progress: 100,
        step: steps[1]?.description,
      });

      // Animate through steps (for local UI)
      const stepDuration = 3000;
      for (let i = 2; i < steps.length; i++) {
        setTimeout(
          () => {
            setCurrentStepIndex(i);
            updateJob(jobId, { step: steps[i]?.description });
          },
          stepDuration * (i - 1)
        );
      }

      // Step 4: Call processing API
      const processResponse = await fetch('/api/vibelog/upload-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath,
          mimeType: file.type,
          title: title.trim() || undefined,
        }),
      });

      if (!processResponse.ok) {
        const err = await processResponse.json();
        throw new Error(err.message || err.error || 'Processing failed');
      }

      const response = await processResponse.json();

      // Update store with completion
      updateJob(jobId, {
        status: 'complete',
        vibelogId: response.vibelogId,
        publicUrl: response.publicUrl,
        step: 'Published!',
      });

      setStatus('success');
      setCurrentStepIndex(steps.length - 1);

      // Toast is now handled by UploadJobsIndicator
      if (onSuccess && response.vibelogId && response.publicUrl) {
        onSuccess(response.vibelogId, response.publicUrl);
      }

      // Only redirect if user is still on this page
      if (response.publicUrl) {
        setTimeout(() => {
          window.location.href = response.publicUrl;
        }, 1500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      updateJob(jobId, {
        status: 'error',
        error: errorMessage,
      });
      setError(errorMessage);
      setStatus('error');
      // Toast is now handled by UploadJobsIndicator
    }
  };

  const handleClear = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setFile(null);
    setFilePreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    setTitle('');
    setFileType('audio');
    setError(null);
    setStatus('idle');
    setUploadProgress(0);
    setCurrentStepIndex(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING STATE - Glass card with timeline
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === 'processing') {
    const steps = getStepsForType(fileType);
    const currentStep = steps[currentStepIndex];
    const visibleSteps = steps.slice(Math.max(0, currentStepIndex - 2), currentStepIndex + 1);

    return (
      <div className="relative overflow-hidden rounded-3xl border border-electric/20 bg-gradient-to-br from-card/40 via-card/30 to-electric/5 p-6 backdrop-blur-xl sm:p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-electric/20 bg-electric/5 px-5 py-2.5 backdrop-blur-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-electric border-t-transparent" />
            <h3 className="bg-gradient-to-r from-foreground to-electric bg-clip-text text-base font-bold text-transparent sm:text-lg">
              Processing
            </h3>
          </div>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            {currentStep?.description || 'Finalizing...'}
          </p>
        </div>

        {/* Timeline */}
        <div className="px-2 sm:px-6">
          <div className="relative">
            <div className="absolute bottom-0 left-3 top-0 w-[2px] bg-slate-600/20" />
            <ul className="space-y-5">
              {visibleSteps.map((step, i) => {
                const actualIndex = Math.max(0, currentStepIndex - 2) + i;
                const isActive = actualIndex === currentStepIndex;

                return (
                  <li key={step.id} className="relative pl-8">
                    <div
                      className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full transition-all"
                      style={{
                        background: isActive
                          ? 'radial-gradient(circle at 30% 30%, #fff, #60a5fa 55%, rgba(96,165,250,0.3) 70%)'
                          : '#64748b',
                        boxShadow: isActive ? '0 0 12px rgba(96,165,250,0.5)' : 'none',
                      }}
                    />
                    <div
                      className={`text-sm font-semibold transition-colors sm:text-base ${
                        isActive ? 'text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </div>
                    <div
                      className={`text-xs transition-colors sm:text-sm ${
                        isActive ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {step.description}
                    </div>
                    {isActive && (
                      <div className="mt-2 h-[2px] w-full overflow-hidden rounded bg-slate-700/30">
                        <div className="metallic-strike h-full w-full" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Inline styles for metallic animation */}
        <style jsx>{`
          .metallic-strike {
            background: linear-gradient(
              90deg,
              rgba(96, 165, 250, 0.2) 0%,
              rgba(147, 197, 253, 0.9) 40%,
              rgba(96, 165, 250, 0.7) 60%,
              rgba(96, 165, 250, 0.2) 100%
            );
            background-size: 200% 100%;
            animation: metallic-scan 1100ms linear infinite;
          }
          @keyframes metallic-scan {
            0% {
              background-position: 0% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .metallic-strike {
              animation: none;
            }
          }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOADING STATE - Progress bar with glass card
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === 'uploading') {
    return (
      <div className="overflow-hidden rounded-3xl border border-electric/20 bg-gradient-to-br from-card/40 via-card/30 to-electric/5 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-electric/10">
            {getFileIcon(fileType, 'h-6 w-6 text-electric')}
          </div>
          <div className="flex-1">
            <p className="bg-gradient-to-r from-foreground to-electric bg-clip-text text-sm font-semibold text-transparent">
              Uploading... {uploadProgress}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-electric to-blue-400 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === 'error' && error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-950/20 to-card/40 p-6 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-200">Upload failed</p>
            <p className="mt-1 text-sm text-red-300/80">{error}</p>
            <button
              onClick={handleClear}
              className="mt-3 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/30"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE SELECTED - Preview and upload form
  // ═══════════════════════════════════════════════════════════════════════════
  if (file) {
    return (
      <div className="space-y-4 rounded-3xl border border-electric/20 bg-gradient-to-br from-card/40 via-card/30 to-electric/5 p-6 backdrop-blur-xl">
        {/* File info */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-electric/10">
            {getFileIcon(fileType, 'h-6 w-6 text-electric')}
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(1)}MB • {getFileTypeLabel(fileType)}
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
        {fileType === 'video' && filePreview && (
          <video
            src={filePreview}
            controls
            className="w-full rounded-xl bg-black"
            style={{ maxHeight: '250px' }}
          />
        )}
        {fileType === 'audio' && filePreview && (
          <audio src={filePreview} controls className="w-full" />
        )}

        {/* Title input */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="AI will generate a title if left empty"
            className="w-full rounded-xl border border-electric/20 bg-card/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
          />
        </div>

        {/* Cover image */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Cover Art (optional)</label>
          {coverPreview ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL preview, next/image doesn't optimize blobs */}
              <img
                src={coverPreview}
                alt="Cover preview"
                className="h-24 w-24 rounded-xl object-cover"
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
              className="flex items-center gap-2 rounded-xl border border-dashed border-electric/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-electric/50 hover:bg-electric/5"
            >
              <Sparkles className="h-4 w-4" />
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
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpload}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric to-blue-400 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-electric/25 transition-all hover:shadow-electric/40"
          >
            <Upload className="h-4 w-4" />
            Publish Vibe
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          AI will transcribe, generate content, create cover art, and translate to 6 languages
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT: Upload zone (idle state)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="group cursor-pointer rounded-3xl border-2 border-dashed border-electric/30 bg-gradient-to-br from-electric/5 to-card/40 p-8 text-center backdrop-blur-xl transition-all hover:border-electric/50 hover:from-electric/10"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/mp4,video/quicktime,video/webm,.txt,.md,.csv,.html,.xml,.yaml,.yml,.json,.rtf,text/plain,text/markdown,text/csv,text/html,text/xml,application/json,application/xml"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Select file"
      />

      {/* Icon cluster */}
      <div className="mx-auto mb-4 flex items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10 transition-transform group-hover:scale-110">
          <Music className="h-5 w-5 text-electric" />
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-electric/20 transition-transform group-hover:scale-110">
          <Video className="h-6 w-6 text-electric" />
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10 transition-transform group-hover:scale-110">
          <FileText className="h-5 w-5 text-electric" />
        </div>
      </div>

      <h3 className="mb-2 bg-gradient-to-r from-foreground to-electric bg-clip-text text-lg font-semibold text-transparent">
        Upload Your Vibe
      </h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Drop your audio, video, or text file here
      </p>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl bg-gradient-to-r from-electric to-blue-400 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-electric/25 transition-all hover:shadow-electric/40"
      >
        Choose File
      </button>

      <div className="mt-6 space-y-1 text-xs text-muted-foreground">
        <p>
          <span className="text-electric">Audio:</span> MP3, WAV, M4A, OGG, FLAC
        </p>
        <p>
          <span className="text-electric">Video:</span> MP4, MOV, WebM
        </p>
        <p>
          <span className="text-electric">Documents:</span> TXT, MD, CSV, HTML, JSON, XML, YAML, RTF
        </p>
        <p className="mt-2">Maximum {MAX_SIZE_MB}MB</p>
      </div>
    </div>
  );
}
