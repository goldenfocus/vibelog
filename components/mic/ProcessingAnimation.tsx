'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';

export interface ProcessingStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  completed: boolean;
}

export interface ProcessingAnimationProps {
  isVisible: boolean;
  recordingTime: number;
  onTranscribeComplete: () => Promise<any>;
  onGenerateComplete: () => Promise<any>;
  onCoverComplete?: (vibelogContent?: string) => Promise<any>;
  onAnimationComplete?: () => void;
  className?: string;
}

export default function ProcessingAnimation({
  isVisible,
  recordingTime,
  onTranscribeComplete,
  onGenerateComplete,
  onCoverComplete,
  onAnimationComplete,
  className = '',
}: ProcessingAnimationProps) {
  const { t } = useI18n();
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Currently active step for a concise status line
  const activeStep = processingSteps.find(s => !s.completed);

  const createSteps = useCallback(() => {
    return [
      {
        id: 'capture',
        title: t('components.micRecorder.symphony.captureTitle'),
        description: t('components.micRecorder.symphony.captureDesc'),
      },
      {
        id: 'transcribe',
        title: t('components.micRecorder.symphony.transcribeTitle'),
        description: t('components.micRecorder.symphony.transcribeDesc'),
      },
      {
        id: 'clean',
        title: t('components.micRecorder.symphony.cleanTitle'),
        description: t('components.micRecorder.symphony.cleanDesc'),
      },
      {
        id: 'expand',
        title: t('components.micRecorder.symphony.expandTitle'),
        description: t('components.micRecorder.symphony.expandDesc'),
      },
      {
        id: 'structure',
        title: t('components.micRecorder.symphony.structureTitle'),
        description: t('components.micRecorder.symphony.structureDesc'),
      },
      {
        id: 'format',
        title: t('components.micRecorder.symphony.formatTitle'),
        description: t('components.micRecorder.symphony.formatDesc'),
      },
      {
        id: 'image',
        title: t('components.micRecorder.symphony.imageTitle'),
        description: t('components.micRecorder.symphony.imageDesc'),
      },
      {
        id: 'optimize',
        title: t('components.micRecorder.symphony.optimizeTitle'),
        description: t('components.micRecorder.symphony.optimizeDesc'),
      },
      {
        id: 'social',
        title: t('components.micRecorder.symphony.socialTitle'),
        description: t('components.micRecorder.symphony.socialDesc'),
      },
      {
        id: 'seo',
        title: t('components.micRecorder.symphony.seoTitle'),
        description: t('components.micRecorder.symphony.seoDesc'),
      },
      {
        id: 'rss',
        title: t('components.micRecorder.symphony.rssTitle'),
        description: t('components.micRecorder.symphony.rssDesc'),
      },
      {
        id: 'html',
        title: t('components.micRecorder.symphony.htmlTitle'),
        description: t('components.micRecorder.symphony.htmlDesc'),
      },
      {
        id: 'polish',
        title: t('components.micRecorder.symphony.polishTitle'),
        description: t('components.micRecorder.symphony.polishDesc'),
      },
    ];
  }, [t]);

  const runProcessing = useCallback(async () => {
    // Prevent multiple concurrent executions
    if (isAnimating) {
      return;
    }

    const steps = createSteps();
    setProcessingSteps(
      steps.map(s => ({ id: s.id, label: s.title, description: s.description, completed: false }))
    );
    setActiveIndex(0);
    setIsAnimating(true);

    // Start API calls
    const t0 = performance.now();
    let _transcribeMs = 0;
    let generateMs = 0;
    let transcriptLen = 0;
    let _transcribeOk = false;
    let _generateOk = false;

    const transcribePromise = onTranscribeComplete()
      .then(text => {
        _transcribeOk = true;
        transcriptLen = typeof text === 'string' ? text.length : 0;
      })
      .catch(error => {
        console.error('Transcription failed:', error);
      })
      .finally(() => {
        _transcribeMs = performance.now() - t0;
      });

    let generatePromise: Promise<any> | null = null;
    let generateStarted = false;
    let generatedVibelogContent: string = '';
    const startGenerate = () => {
      if (generateStarted) {
        return; // Prevent duplicate calls
      }
      generateStarted = true;
      const g0 = performance.now();
      generatePromise = onGenerateComplete()
        .then(result => {
          _generateOk = true;
          // Capture the vibelog content for cover generation
          generatedVibelogContent = typeof result === 'string' ? result : '';

          // Start cover generation in background (performance optimization)
          // The save function will ensure it's complete before persisting
          if (typeof onCoverComplete === 'function' && generatedVibelogContent) {
            console.log('🖼️ [PROCESSING-ANIMATION] Starting cover generation in background...');
            onCoverComplete(generatedVibelogContent).catch(error => {
              console.error('Background cover generation failed:', error);
            });
          }
        })
        .catch(error => {
          console.error('Vibelog generation failed:', error);
        })
        .finally(() => {
          generateMs = performance.now() - g0;
        });
    };

    // Heuristics for durations (ms)
    const minDwell = 350;
    const preDwell = 280; // capture
    const betweenDwellTotal = Math.min(
      4000,
      Math.max(
        800,
        20 * (recordingTime || 10) + (transcriptLen ? Math.min(1500, transcriptLen * 1.5) : 0)
      )
    );
    const betweenSteps = ['clean', 'expand', 'structure']; // 3 steps
    const betweenPerStep = Math.max(220, Math.floor(betweenDwellTotal / betweenSteps.length));
    const postSteps = ['optimize', 'social', 'seo', 'rss', 'html', 'polish']; // post-image steps

    const advance = async (i: number) => {
      setActiveIndex(i);
      // Update completed map for previous step
      setProcessingSteps(prev => prev.map((s, idx) => (idx < i ? { ...s, completed: true } : s)));

      const step = steps[i];
      if (!step) {
        return;
      }

      if (step.id === 'capture') {
        await new Promise(res => setTimeout(res, preDwell));
      } else if (step.id === 'transcribe') {
        await transcribePromise; // wait for real work
        await new Promise(res => setTimeout(res, minDwell));
        // Start generation after transcription succeeds or completes
        if (!generatePromise) {
          startGenerate();
        }
      } else if (betweenSteps.includes(step.id)) {
        await new Promise(res => setTimeout(res, betweenPerStep));
      } else if (step.id === 'structure') {
        // Gate text generation here so FORMAT can be short
        if (!generatePromise) {
          startGenerate();
        }
        console.log('⏳ [PROCESSING-ANIMATION] Waiting for generation to complete...');
        await generatePromise;
        console.log('✅ [PROCESSING-ANIMATION] Generation complete, ref should be set now');
        // Small UX dwell for smooth animation, but ref is already set synchronously
        await new Promise(res => setTimeout(res, minDwell));
      } else if (step.id === 'format') {
        // Short dwell only; text already prepared at STRUCTURE
        await new Promise(res => setTimeout(res, 350));
      } else if (step.id === 'image') {
        // Just show UX animation - actual cover generation handled by save function
        await new Promise(res => setTimeout(res, 500));
      } else {
        // Post steps: scale by generation time, keep UX snappy
        const base = Math.min(
          700,
          Math.max(220, Math.floor((generateMs || 1600) / postSteps.length))
        );
        await new Promise(res => setTimeout(res, base));
      }
    };

    // Sequence
    for (let i = 0; i < steps.length; i++) {
      await advance(i);
    }

    // Mark all completed and finish
    setProcessingSteps(prev => prev.map(s => ({ ...s, completed: true })));
    setActiveIndex(steps.length - 1);
    setIsAnimating(false);
    onAnimationComplete?.();
  }, [
    createSteps,
    onTranscribeComplete,
    onGenerateComplete,
    onCoverComplete,
    onAnimationComplete,
    recordingTime,
  ]);

  useEffect(() => {
    if (!isVisible || isAnimating) {
      return undefined;
    }

    // Defer starting processing to the next tick so initial render assertions pass
    const id = setTimeout(() => {
      runProcessing();
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Reset state when component becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setProcessingSteps([]);
      setIsAnimating(false);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  // Processing Timeline (silver dot) — single-step feed with subtitle
  const steps = processingSteps;
  const currentIdx = activeIndex;
  const visibleStart = Math.max(0, currentIdx - 3);
  const visible = steps.slice(visibleStart, currentIdx + 1);
  return (
    <div
      className={`relative mb-8 overflow-hidden rounded-3xl border border-electric/20 bg-gradient-to-br from-card/40 via-card/30 to-electric/5 p-6 backdrop-blur-xl sm:p-8 ${className}`}
      data-testid="timeline-stream"
    >
      <div className="mb-4 text-center">
        <div className="bg-gradient-electric/10 inline-flex items-center gap-3 rounded-2xl border border-electric/20 px-5 py-2.5 backdrop-blur-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
          <h3 className="bg-gradient-to-r from-foreground to-electric bg-clip-text text-base font-bold text-transparent sm:text-lg">
            Processing
          </h3>
        </div>
        <div
          className="mt-2 text-center font-mono text-xs text-muted-foreground sm:text-sm"
          aria-live="polite"
        >
          {activeStep ? (
            <span data-testid="processing-now-line">Now: {activeStep.label}</span>
          ) : (
            <span data-testid="processing-now-line">Now: Finalizing…</span>
          )}
        </div>
      </div>

      {/* Vertical feed — show only the recent few steps, newest at bottom */}
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
                        ? 'radial-gradient(circle at 30% 30%, #fff, #cbd5e1 55%, rgba(255,255,255,0.05) 70%)'
                        : '#64748b',
                    }}
                  />
                  <div
                    className={`text-sm font-semibold sm:text-base ${isActive ? 'text-slate-100' : 'text-slate-400'}`}
                  >
                    {s.label}
                  </div>
                  {/* Subtitle (description) */}
                  <div
                    className={`text-xs sm:text-sm ${isActive ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    {s.description}
                  </div>
                  {/* Metallic strike/progress for active step */}
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
            rgba(148, 163, 184, 0.2) 0%,
            rgba(229, 231, 235, 0.9) 40%,
            rgba(203, 213, 225, 0.7) 60%,
            rgba(148, 163, 184, 0.2) 100%
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
