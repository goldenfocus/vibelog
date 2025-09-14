"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

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
  onCoverComplete?: () => Promise<any>;
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
  className = ""
}: ProcessingAnimationProps) {
  const { t } = useI18n();
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Currently active step for a concise status line
  const activeStep = processingSteps.find(s => !s.completed);

  const createSteps = useCallback(() => {
    return [
      { id: "capture", title: t('components.micRecorder.symphony.captureTitle'), description: t('components.micRecorder.symphony.captureDesc') },
      { id: "transcribe", title: t('components.micRecorder.symphony.transcribeTitle'), description: t('components.micRecorder.symphony.transcribeDesc') },
      { id: "clean", title: t('components.micRecorder.symphony.cleanTitle'), description: t('components.micRecorder.symphony.cleanDesc') },
      { id: "expand", title: t('components.micRecorder.symphony.expandTitle'), description: t('components.micRecorder.symphony.expandDesc') },
      { id: "structure", title: t('components.micRecorder.symphony.structureTitle'), description: t('components.micRecorder.symphony.structureDesc') },
      { id: "format", title: t('components.micRecorder.symphony.formatTitle'), description: t('components.micRecorder.symphony.formatDesc') },
      { id: "image", title: (t('components.micRecorder.symphony.imageTitle') as any) || 'Generating Cover Image', description: (t('components.micRecorder.symphony.imageDesc') as any) || 'Creating a shareable cover image' },
      { id: "optimize", title: t('components.micRecorder.symphony.optimizeTitle'), description: t('components.micRecorder.symphony.optimizeDesc') },
      { id: "social", title: t('components.micRecorder.symphony.socialTitle'), description: t('components.micRecorder.symphony.socialDesc') },
      { id: "seo", title: t('components.micRecorder.symphony.seoTitle'), description: t('components.micRecorder.symphony.seoDesc') },
      { id: "rss", title: t('components.micRecorder.symphony.rssTitle'), description: t('components.micRecorder.symphony.rssDesc') },
      { id: "html", title: t('components.micRecorder.symphony.htmlTitle'), description: t('components.micRecorder.symphony.htmlDesc') },
      { id: "polish", title: t('components.micRecorder.symphony.polishTitle'), description: t('components.micRecorder.symphony.polishDesc') }
    ];
  }, [t]);

  const runProcessing = useCallback(async () => {
    // Prevent multiple concurrent executions
    if (isAnimating) {
      console.log('ProcessingAnimation: Already animating, skipping processing');
      return;
    }

    const steps = createSteps();
    setProcessingSteps(steps.map(s => ({ id: s.id, label: s.title, description: s.description, completed: false })));
    setActiveIndex(0);
    setIsAnimating(true);

    // Start API calls
    const t0 = performance.now();
    let transcribeMs = 0;
    let generateMs = 0;
    let transcriptLen = 0;
    let transcribeOk = false;
    let generateOk = false;

    const transcribePromise = onTranscribeComplete()
      .then((text) => {
        console.log('ProcessingAnimation: Transcription completed successfully');
        transcribeOk = true;
        transcriptLen = (typeof text === 'string') ? text.length : 0;
      })
      .catch((error) => {
        console.log('ProcessingAnimation: Transcription failed:', error);
        /* swallow to avoid UI stall */
      })
      .finally(() => {
        transcribeMs = performance.now() - t0;
      });

    let generatePromise: Promise<any> | null = null;
    let generateStarted = false;
    const startGenerate = () => {
      if (generateStarted) {
        console.log('ProcessingAnimation: Blog generation already started, skipping');
        return; // Prevent duplicate calls
      }
      console.log('ProcessingAnimation: Starting blog generation');
      generateStarted = true;
      const g0 = performance.now();
      generatePromise = onGenerateComplete()
        .then(() => {
          console.log('ProcessingAnimation: Blog generation completed successfully');
          generateOk = true;
        })
        .catch((error) => {
          console.log('ProcessingAnimation: Blog generation failed:', error);
        })
        .finally(() => { generateMs = performance.now() - g0; });
    };

    // Heuristics for durations (ms)
    const minDwell = 350;
    const preDwell = 280; // capture
    const betweenDwellTotal = Math.min(4000, Math.max(800, 20 * (recordingTime || 10) + (transcriptLen ? Math.min(1500, transcriptLen * 1.5) : 0)));
    const betweenSteps = ["clean", "expand", "structure"]; // 3 steps
    const betweenPerStep = Math.max(220, Math.floor(betweenDwellTotal / betweenSteps.length));
    const postSteps = ["format", "image", "optimize", "social", "seo", "rss", "html", "polish"]; // include format+image for dwell base

    const advance = async (i: number) => {
      setActiveIndex(i);
      // Update completed map for previous step
      setProcessingSteps(prev => prev.map((s, idx) => idx < i ? { ...s, completed: true } : s));

      const step = steps[i];
      if (!step) return;

      if (step.id === 'capture') {
        await new Promise(res => setTimeout(res, preDwell));
      } else if (step.id === 'transcribe') {
        await transcribePromise; // wait for real work
        await new Promise(res => setTimeout(res, minDwell));
        // Start generation after transcription succeeds or completes
        if (!generatePromise) startGenerate();
      } else if (betweenSteps.includes(step.id)) {
        await new Promise(res => setTimeout(res, betweenPerStep));
      } else if (step.id === 'structure') {
        // Gate text generation here so FORMAT can be short
        // Only start generation if it wasn't already started after transcription
        if (!generatePromise) startGenerate();
        await generatePromise;
        await new Promise(res => setTimeout(res, minDwell));
        // Cover generation will be handled at image step
      } else if (step.id === 'format') {
        // Short dwell only; text already prepared at STRUCTURE
        await new Promise(res => setTimeout(res, 350));
      } else if (step.id === 'image') {
        // Gate on real cover generation if provided
        const start = performance.now();
        if (typeof onCoverComplete === 'function') {
          try {
            await onCoverComplete();
          } catch (error) {
            console.log('Cover generation failed, continuing:', error);
          }
        }
        const elapsed = performance.now() - start;
        const minImage = 1200;
        if (elapsed < minImage) await new Promise(res => setTimeout(res, minImage - elapsed));
      } else {
        // Post steps: scale by generation time, keep UX snappy
        const base = Math.min(700, Math.max(220, Math.floor((generateMs || 1600) / postSteps.length)));
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
  }, [createSteps, onTranscribeComplete, onGenerateComplete, onAnimationComplete, recordingTime]);


  useEffect(() => {
    if (!isVisible || isAnimating) return;

    console.log('ProcessingAnimation: Starting processing');

    // Start the processing timeline
    runProcessing();
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
      <div className={`relative bg-gradient-to-br from-card/40 via-card/30 to-electric/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-electric/20 mb-8 overflow-hidden ${className}`} data-testid="timeline-stream">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-electric/10 backdrop-blur-sm rounded-2xl border border-electric/20">
            <div className="w-5 h-5 border-2 border-electric border-t-transparent rounded-full animate-spin"></div>
            <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-electric bg-clip-text text-transparent">
              Processing
            </h3>
          </div>
          <div className="mt-2 text-center text-xs sm:text-sm font-mono text-muted-foreground" aria-live="polite">
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
            <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-slate-600/20" />
            <ul className="space-y-6">
              {visible.map((s, i) => {
                const isActive = visibleStart + i === currentIdx;
                return (
                  <li key={`${s.id}-${i}`} className="relative pl-8" data-testid={`timeline-step-${s.id}`}>
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full"
                      style={{
                        background: isActive
                          ? 'radial-gradient(circle at 30% 30%, #fff, #cbd5e1 55%, rgba(255,255,255,0.05) 70%)'
                          : '#64748b'
                      }}
                    />
                    <div className={`text-sm sm:text-base font-semibold ${isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                      {s.label}
                    </div>
                    {/* Subtitle (description) */}
                    <div className={`text-xs sm:text-sm ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {s.description}
                    </div>
                    {/* Metallic strike/progress for active step */}
                    {isActive && (
                      <div className="mt-2 h-[2px] w-full bg-slate-700/30 overflow-hidden rounded">
                        <div className="h-full w-full metallic-strike" />
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
            background: linear-gradient(90deg, rgba(148,163,184,0.2) 0%, rgba(229,231,235,0.9) 40%, rgba(203,213,225,0.7) 60%, rgba(148,163,184,0.2) 100%);
            background-size: 200% 100%;
            animation: metallic-scan 1100ms linear infinite;
          }
          @keyframes metallic-scan {
            0% { background-position: 0% 0; }
            100% { background-position: 200% 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            .metallic-strike { animation: none; }
          }
        `}</style>
      </div>
    );
}
