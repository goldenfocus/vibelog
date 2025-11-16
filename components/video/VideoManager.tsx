'use client';

/**
 * Video Manager Component
 * Combined UI for both video upload (primary) and AI generation (optional)
 * Pivot: User uploads are now the default, AI generation is premium/advanced
 */

import { Sparkles, Upload } from 'lucide-react';
import React, { useState } from 'react';

import { VideoGenerator } from './VideoGenerator';
import { VideoUploadZone } from './VideoUploadZone';

interface VideoManagerProps {
  vibelogId: string;
  onVideoAdded?: (videoUrl: string) => void;
  showAIOption?: boolean; // Default: true (keep as optional premium feature)
}

export function VideoManager({ vibelogId, onVideoAdded, showAIOption = true }: VideoManagerProps) {
  const [mode, setMode] = useState<'upload' | 'generate'>('upload'); // Default to upload

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      {showAIOption && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('upload')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              mode === 'upload'
                ? 'border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-900/20 dark:text-purple-100'
                : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload Video
          </button>

          <button
            onClick={() => setMode('generate')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              mode === 'generate'
                ? 'border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-900/20 dark:text-purple-100'
                : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Generate
            <span className="ml-1 rounded bg-purple-600 px-1.5 py-0.5 text-xs text-white">
              Beta
            </span>
          </button>
        </div>
      )}

      {/* Content based on mode */}
      {mode === 'upload' ? (
        <VideoUploadZone vibelogId={vibelogId} onVideoUploaded={onVideoAdded} />
      ) : (
        <div className="space-y-3">
          {/* AI Generation Info */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-xs text-yellow-900 dark:text-yellow-100">
              <strong>AI Video Generation (Beta):</strong> Takes 3-8 minutes and costs $0.50 per
              video. For best results, upload your own video instead.
            </p>
          </div>

          <VideoGenerator vibelogId={vibelogId} onVideoGenerated={onVideoAdded} />
        </div>
      )}
    </div>
  );
}
