'use client';

/**
 * Upload Jobs Indicator
 *
 * Floating pill that shows when there's an active upload.
 * Allows users to navigate away while uploads continue in the background.
 * Shows toast notification when upload completes.
 */

import {
  Music,
  Video,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useUploadJobsStore, UploadJob, UploadJobFileType } from '@/state/upload-jobs-store';

function getFileIcon(type: UploadJobFileType, className: string) {
  switch (type) {
    case 'video':
      return <Video className={className} />;
    case 'text':
      return <FileText className={className} />;
    default:
      return <Music className={className} />;
  }
}

function UploadJobPill({ job, onDismiss }: { job: UploadJob; onDismiss: () => void }) {
  const router = useRouter();

  const isActive = job.status === 'uploading' || job.status === 'processing';
  const isComplete = job.status === 'complete';
  const isError = job.status === 'error';

  const handleClick = () => {
    if (isComplete && job.publicUrl) {
      router.push(job.publicUrl);
      onDismiss();
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl transition-all ${isActive ? 'border-electric/30 bg-card/90 hover:border-electric/50' : ''} ${isComplete ? 'cursor-pointer border-green-500/30 bg-green-950/50 hover:border-green-500/50' : ''} ${isError ? 'border-red-500/30 bg-red-950/50' : ''} `}
      onClick={isComplete ? handleClick : undefined}
    >
      {/* Icon */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-electric/20' : ''} ${isComplete ? 'bg-green-500/20' : ''} ${isError ? 'bg-red-500/20' : ''} `}
      >
        {isActive && <Loader2 className="h-5 w-5 animate-spin text-electric" />}
        {isComplete && <CheckCircle className="h-5 w-5 text-green-400" />}
        {isError && <XCircle className="h-5 w-5 text-red-400" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {getFileIcon(job.fileType, 'h-3.5 w-3.5 text-muted-foreground')}
          <p className="truncate text-sm font-medium">
            {isActive &&
              (job.status === 'uploading' ? 'Uploading...' : job.step || 'Processing...')}
            {isComplete && 'Published!'}
            {isError && 'Failed'}
          </p>
        </div>

        {/* Progress bar for uploading */}
        {job.status === 'uploading' && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric to-blue-400 transition-all"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        )}

        {/* Step text for processing */}
        {job.status === 'processing' && job.step && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.step}</p>
        )}

        {/* View link for complete */}
        {isComplete && job.publicUrl && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-green-400">
            <ExternalLink className="h-3 w-3" />
            Click to view
          </p>
        )}

        {/* Error message */}
        {isError && job.error && (
          <p className="mt-0.5 truncate text-xs text-red-400">{job.error}</p>
        )}
      </div>

      {/* Dismiss button for completed/error states */}
      {!isActive && (
        <button
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}
          className="rounded-lg p-1.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export function UploadJobsIndicator() {
  const { jobs, removeJob } = useUploadJobsStore();
  const notifiedJobsRef = useRef<Set<string>>(new Set());

  // Show toast when job completes
  useEffect(() => {
    jobs.forEach(job => {
      if (
        (job.status === 'complete' || job.status === 'error') &&
        !notifiedJobsRef.current.has(job.id)
      ) {
        notifiedJobsRef.current.add(job.id);

        if (job.status === 'complete') {
          toast.success('Your vibe is live!', {
            description: 'Click the notification to view it.',
            action: job.publicUrl
              ? {
                  label: 'View',
                  onClick: () => {
                    window.location.href = job.publicUrl!;
                  },
                }
              : undefined,
          });
        } else if (job.status === 'error') {
          toast.error('Upload failed', {
            description: job.error || 'Please try again.',
          });
        }
      }
    });
  }, [jobs]);

  // Filter to show only recent jobs (last 30 seconds for completed, all active)
  const visibleJobs = jobs.filter(job => {
    if (job.status === 'uploading' || job.status === 'processing') {
      return true;
    }
    // Show completed/error jobs for 30 seconds
    if (job.completedAt) {
      return Date.now() - job.completedAt < 30000;
    }
    return false;
  });

  if (visibleJobs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 sm:bottom-6">
      {visibleJobs.map(job => (
        <UploadJobPill key={job.id} job={job} onDismiss={() => removeJob(job.id)} />
      ))}
    </div>
  );
}
