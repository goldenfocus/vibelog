'use client';

/**
 * Video Processing Animation Component
 * Reuses the same visual pattern as ProcessingAnimation from MicRecorder
 * but with video-specific processing steps
 */

import React, { useState, useEffect, useCallback } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';

export interface ProcessingStep {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
}

export interface VideoProcessingAnimationProps {
  isVisible: boolean;
  recordingTime: number;
  onUploadComplete: () => Promise<any>;
  onTranscribeComplete: () => Promise<any>;
  onGenerateComplete: () => Promise<any>;
  onCoverComplete?: (vibelogContent?: string) => Promise<any>;
  onAnimationComplete?: () => void;
  className?: string;
}

export default function VideoProcessingAnimation({
  isVisible,
  recordingTime,
  onUploadComplete,
  onTranscribeComplete,
  onGenerateComplete,
  onCoverComplete,
  onAnimationComplete,
  className = '',
}: VideoProcessingAnimationProps) {
  const { t: _t } = useI18n();
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeStep = processingSteps.find(s => !s.completed);

  const createSteps = useCallback(() => {
    return [
      {
        id: 'upload',
        title: 'Uploading video',
        description: 'Saving your video to the cloud...',
      },
      {
        id: 'extract',
        title: 'Extracting audio',
        description: 'Preparing audio track for transcription...',
      },
      {
        id: 'transcribe',
        title: 'Transcribing speech',
        description: 'Converting your words to text...',
      },
      {
        id: 'clean',
        title: 'Cleaning up text',
        description: 'Removing filler words and stutters...',
      },
      {
        id: 'expand',
        title: 'Expanding ideas',
        description: 'Developing your thoughts into full content...',
      },
      {
        id: 'structure',
        title: 'Structuring content',
        description: 'Organizing into a polished vibelog...',
      },
      {
        id: 'title',
        title: 'Generating title',
        description: 'Creating a catchy headline...',
      },
      {
        id: 'image',
        title: 'Creating cover image',
        description: 'Generating visual artwork...',
      },
      {
        id: 'optimize',
        title: 'Optimizing for SEO',
        description: 'Making it discoverable...',
      },
      {
        id: 'publish',
        title: 'Publishing',
        description: 'Making your vibelog live...',
      },
    ];
  }, []);

  const runProcessing = useCallback(async () => {
    if (isAnimating) {
      return;
    }

    const steps = createSteps();
    setProcessingSteps(
      steps.map(s => ({ id: s.id, label: s.title, description: s.description, completed: false }))
    );
    setActiveIndex(0);
    setIsAnimating(true);

    const _t0 = performance.now();
    let _uploadOk = false;
    let _transcribeOk = false;
    let _generateOk = false;
    let generatedContent = '';

    // Heuristics for animation timing
    const minDwell = 350;
    const uploadDwell = 500;
    const betweenSteps = ['clean', 'expand'];
    const betweenPerStep = Math.max(300, Math.floor((recordingTime || 10) * 30));
    const postSteps = ['optimize', 'publish'];

    const advance = async (i: number) => {
      setActiveIndex(i);
      setProcessingSteps(prev => prev.map((s, idx) => (idx < i ? { ...s, completed: true } : s)));

      const step = steps[i];
      if (!step) {
        return;
      }

      if (step.id === 'upload') {
        // Real work: upload video
        try {
          await onUploadComplete();
          _uploadOk = true;
        } catch (err) {
          console.error('Video upload failed:', err);
          throw err;
        }
        await new Promise(res => setTimeout(res, uploadDwell));
      } else if (step.id === 'extract') {
        // Visual step - Whisper handles audio extraction internally
        await new Promise(res => setTimeout(res, 400));
      } else if (step.id === 'transcribe') {
        // Real work: transcribe video
        try {
          await onTranscribeComplete();
          _transcribeOk = true;
        } catch (err) {
          console.error('Transcription failed:', err);
          throw err;
        }
        await new Promise(res => setTimeout(res, minDwell));
      } else if (betweenSteps.includes(step.id)) {
        await new Promise(res => setTimeout(res, betweenPerStep));
      } else if (step.id === 'structure') {
        // Real work: generate vibelog
        try {
          generatedContent = await onGenerateComplete();
          _generateOk = true;
        } catch (err) {
          console.error('Vibelog generation failed:', err);
          throw err;
        }
        await new Promise(res => setTimeout(res, minDwell));
      } else if (step.id === 'title') {
        // Title is generated as part of vibelog generation
        await new Promise(res => setTimeout(res, 300));
      } else if (step.id === 'image') {
        // Start cover generation in background
        if (typeof onCoverComplete === 'function' && generatedContent) {
          console.log('[VIDEO-PROCESSING] Starting cover generation...');
          onCoverComplete(generatedContent).catch(err => {
            console.error('Cover generation failed:', err);
          });
        }
        await new Promise(res => setTimeout(res, 600));
      } else if (postSteps.includes(step.id)) {
        await new Promise(res => setTimeout(res, 400));
      } else {
        await new Promise(res => setTimeout(res, minDwell));
      }
    };

    try {
      for (let i = 0; i < steps.length; i++) {
        await advance(i);
      }

      setProcessingSteps(prev => prev.map(s => ({ ...s, completed: true })));
      setActiveIndex(steps.length - 1);
      setIsAnimating(false);
      onAnimationComplete?.();
    } catch (err) {
      console.error('[VIDEO-PROCESSING] Processing failed:', err);
      setIsAnimating(false);
      // Let parent handle the error
    }
  }, [
    createSteps,
    onUploadComplete,
    onTranscribeComplete,
    onGenerateComplete,
    onCoverComplete,
    onAnimationComplete,
    recordingTime,
    isAnimating,
  ]);

  useEffect(() => {
    if (!isVisible || isAnimating) {
      return;
    }

    const id = setTimeout(() => {
      runProcessing();
    }, 0);
    return () => clearTimeout(id);
  }, [isVisible, isAnimating, runProcessing]);

  useEffect(() => {
    if (!isVisible) {
      setProcessingSteps([]);
      setIsAnimating(false);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const steps = processingSteps;
  const currentIdx = activeIndex;
  const visibleStart = Math.max(0, currentIdx - 3);
  const visible = steps.slice(visibleStart, currentIdx + 1);

  return (
    <div
      className={`relative mb-8 overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-card/40 via-card/30 to-purple-500/5 p-6 backdrop-blur-xl sm:p-8 ${className}`}
      data-testid="video-processing-timeline"
    >
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-5 py-2.5 backdrop-blur-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
          <h3 className="bg-gradient-to-r from-foreground to-purple-400 bg-clip-text text-base font-bold text-transparent sm:text-lg">
            Processing Video
          </h3>
        </div>
        <div
          className="mt-2 text-center font-mono text-xs text-muted-foreground sm:text-sm"
          aria-live="polite"
        >
          {activeStep ? (
            <span data-testid="processing-now-line">Now: {activeStep.label}</span>
          ) : (
            <span data-testid="processing-now-line">Now: Finalizing...</span>
          )}
        </div>
      </div>

      <div className="px-2 sm:px-6">
        <div className="relative">
          <div className="absolute bottom-0 left-3 top-0 w-[2px] bg-slate-600/20" />
          <ul className="space-y-6">
            {visible.map((s, i) => {
              const isActive = visibleStart + i === currentIdx;
              return (
                <li
                  key={`${s.id}-${i}`}
                  className="relative pl-8"
                  data-testid={`timeline-step-${s.id}`}
                >
                  <div
                    className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full"
                    style={{
                      background: isActive
                        ? 'radial-gradient(circle at 30% 30%, #fff, #a855f7 55%, rgba(255,255,255,0.05) 70%)'
                        : '#64748b',
                    }}
                  />
                  <div
                    className={`text-sm font-semibold sm:text-base ${isActive ? 'text-slate-100' : 'text-slate-400'}`}
                  >
                    {s.label}
                  </div>
                  <div
                    className={`text-xs sm:text-sm ${isActive ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    {s.description}
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

      <style jsx>{`
        .metallic-strike {
          background: linear-gradient(
            90deg,
            rgba(168, 85, 247, 0.2) 0%,
            rgba(229, 231, 235, 0.9) 40%,
            rgba(168, 85, 247, 0.7) 60%,
            rgba(168, 85, 247, 0.2) 100%
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
