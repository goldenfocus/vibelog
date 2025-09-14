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
  onAnimationComplete?: () => void;
  className?: string;
}

export default function ProcessingAnimation({
  isVisible,
  recordingTime,
  onTranscribeComplete,
  onGenerateComplete,
  onAnimationComplete,
  className = ""
}: ProcessingAnimationProps) {
  const { t } = useI18n();
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [visibleStepIndex, setVisibleStepIndex] = useState(0);
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
      { id: "optimize", title: t('components.micRecorder.symphony.optimizeTitle'), description: t('components.micRecorder.symphony.optimizeDesc') },
      { id: "social", title: t('components.micRecorder.symphony.socialTitle'), description: t('components.micRecorder.symphony.socialDesc') },
      { id: "seo", title: t('components.micRecorder.symphony.seoTitle'), description: t('components.micRecorder.symphony.seoDesc') },
      { id: "rss", title: t('components.micRecorder.symphony.rssTitle'), description: t('components.micRecorder.symphony.rssDesc') },
      { id: "html", title: t('components.micRecorder.symphony.htmlTitle'), description: t('components.micRecorder.symphony.htmlDesc') },
      { id: "polish", title: t('components.micRecorder.symphony.polishTitle'), description: t('components.micRecorder.symphony.polishDesc') }
    ];
  }, [t]);

  // ----------------------
  // Processing Timeline runner (behind flag)
  // Enable when NEXT_PUBLIC_PROCESSING_UI=timeline (keeps 'v2' for backward compat)
  // ----------------------
  const isTimeline =
    process.env.NEXT_PUBLIC_PROCESSING_UI === 'timeline' ||
    process.env.NEXT_PUBLIC_PROCESSING_UI === 'v2';

  const runV2 = useCallback(async () => {
    const steps = createSteps();
    // Mark gating: wait at 'transcribe' for transcription; wait at 'format' for generation
    const gatedIds = new Set(["transcribe", "format"]);
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
        transcribeOk = true;
        transcriptLen = (typeof text === 'string') ? text.length : 0;
      })
      .catch(() => { /* swallow to avoid UI stall */ })
      .finally(() => {
        transcribeMs = performance.now() - t0;
      });

    let generatePromise: Promise<any> | null = null;
    const startGenerate = () => {
      const g0 = performance.now();
      generatePromise = onGenerateComplete()
        .then(() => { generateOk = true; })
        .catch(() => {})
        .finally(() => { generateMs = performance.now() - g0; });
    };

    // Heuristics for durations (ms)
    const minDwell = 350;
    const preDwell = 280; // capture
    const betweenDwellTotal = Math.min(4000, Math.max(800, 20 * (recordingTime || 10) + (transcriptLen ? Math.min(1500, transcriptLen * 1.5) : 0)));
    const betweenSteps = ["clean", "expand", "structure"]; // 3 steps
    const betweenPerStep = Math.max(220, Math.floor(betweenDwellTotal / betweenSteps.length));
    const postSteps = ["optimize", "social", "seo", "rss", "html", "polish"]; // 6 steps

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
      } else if (step.id === 'format') {
        // Gate on generation
        if (!generatePromise) startGenerate();
        await generatePromise;
        await new Promise(res => setTimeout(res, minDwell));
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

  const animateMagicalSequence = useCallback(async () => {
    const steps = createSteps();
    
    // Calculate timing based on recording duration (faster for short recordings)
    const recordingDuration = recordingTime; // in seconds
    const baseStepDuration = recordingDuration < 30 ? 800 : recordingDuration < 120 ? 1200 : 1800;
    const STEP_DURATION = baseStepDuration;

    try {
    
    // Initialize processing steps with the new format
    setProcessingSteps(steps.map(step => ({
      id: step.id,
      label: step.title,
      description: step.description,
      completed: false
    })));
    
    setIsAnimating(true);
    
    // Start API calls immediately in parallel with animation
    let transcriptionPromise: Promise<any> | null = null;
    let blogGenerationPromise: Promise<any> | null = null;
    
    // Start transcription immediately
    transcriptionPromise = onTranscribeComplete().then(() => {
      return true;
    }).catch(error => {
      console.error('Transcription failed:', error);
      return false;
    });
    
    // Start blog generation after a short delay (chained after transcription)
    blogGenerationPromise = transcriptionPromise.then(async (transcriptionSuccess) => {
      if (transcriptionSuccess) {
        const result = await onGenerateComplete().then(() => {
          return true;
        }).catch(error => {
          console.error('Blog generation failed:', error);
          return false;
        });
        return result;
      }
      return false;
    });
    
    // Star Wars crawl animation - each step flows upward and fades
    for (let i = 0; i < steps.length; i++) {
      // Mark current step as completed
      setProcessingSteps(prev => prev.map(s => s.id === steps[i].id ? { ...s, completed: true } : s));
      
      // Update visible window to show current processing step at the center
      setVisibleStepIndex(Math.max(0, i - 1));
      
      // Wait for step duration
      await new Promise<void>(resolve => setTimeout(resolve, STEP_DURATION));
    }
    
    // Wait for any remaining API calls to complete
    if (blogGenerationPromise) {
      await blogGenerationPromise;
    }
    
    // Final smooth transition
    await new Promise(resolve => setTimeout(resolve, STEP_DURATION / 2));
    
    // Set final visible state showing the last few completed steps
    setVisibleStepIndex(Math.max(0, steps.length - 3));
    setIsAnimating(false);
    
    // Notify parent that animation is complete
    onAnimationComplete?.();
    } catch (error) {
      console.error('❌ Processing animation failed:', error);
      setIsAnimating(false);
      // Still notify parent to prevent getting stuck
      onAnimationComplete?.();
    }
  }, [recordingTime, onTranscribeComplete, onGenerateComplete, onAnimationComplete, createSteps]);

  useEffect(() => {
    if (!isVisible || isAnimating) return;
    if (isTimeline) {
      runV2();
    } else {
      animateMagicalSequence();
    }
  }, [isVisible, isAnimating, isTimeline, runV2, animateMagicalSequence]);

  // Reset state when component becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setProcessingSteps([]);
      setVisibleStepIndex(0);
      setIsAnimating(false);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  // Processing Timeline (silver dot) — single-step feed with subtitle
  if (isTimeline) {
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
                const isDone = !isActive;
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

  // V1 fallback (Star Wars crawl)
  return (
    <div className={`relative bg-gradient-to-br from-card/40 via-card/30 to-electric/5 backdrop-blur-xl rounded-3xl p-8 border border-electric/20 mb-8 overflow-hidden ${className}`}>
      {/* Background particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 right-8 w-2 h-2 bg-electric rounded-full animate-pulse"></div>
        <div className="absolute top-12 left-12 w-1 h-1 bg-electric/60 rounded-full animate-ping"></div>
        <div className="absolute bottom-8 right-16 w-1.5 h-1.5 bg-electric/40 rounded-full animate-pulse delay-700"></div>
      </div>
      
      <div className="relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-electric/10 backdrop-blur-sm rounded-2xl border border-electric/20">
            <div className="w-6 h-6 border-2 border-electric border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-electric bg-clip-text text-transparent">
                ⚡ Vibelogging your content...
              </h3>
            </div>
          </div>

          {/* Codex-style status line: show what is happening now */}
          <div className="mt-3 text-center text-xs sm:text-sm font-mono text-muted-foreground">
            {activeStep ? (
              <span data-testid="processing-now-line">Now: {activeStep.label}</span>
            ) : (
              <span data-testid="processing-now-line">Now: Finalizing…</span>
            )}
          </div>
        
        {/* Star Wars Crawl Effect */}
        <div className="relative h-96 overflow-hidden bg-gradient-to-b from-background/0 via-background/50 to-background">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none"></div>
          
          <div 
            className="star-wars-crawl space-y-12 transition-transform duration-1000 ease-linear"
            style={{
              transform: `translateY(${-visibleStepIndex * 120}px)`,
            }}
          >
            {processingSteps.map((step, index) => {
              const isCompleted = step.completed;
              const currentStepIndex = processingSteps.findIndex(s => !s.completed);
              const isActive = index === currentStepIndex;
              
              return (
                <div 
                  key={step.id}
                  className="crawl-step transition-all duration-500 ease-out"
                >
                  <div className="text-center mb-4">
                    <h3 className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-widest transition-all duration-500 ${
                      isActive 
                        ? 'text-white animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.9)] filter brightness-125 [text-shadow:0_0_20px_rgba(255,255,255,0.8),0_0_40px_rgba(255,255,255,0.6),0_0_60px_rgba(255,255,255,0.4)]' 
                        : isCompleted 
                          ? 'text-slate-200 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] [text-shadow:0_0_15px_rgba(255,255,255,0.5),0_0_30px_rgba(255,255,255,0.3)]' 
                          : 'text-slate-400/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                    }`}>
                      {step.label}
                    </h3>
                  </div>
                  
                  <div className="max-w-lg mx-auto">
                    <p className={`text-lg sm:text-xl text-center leading-relaxed transition-all duration-500 font-semibold ${
                      isActive 
                        ? 'text-slate-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] [text-shadow:0_0_8px_rgba(255,255,255,0.3)]' 
                        : isCompleted 
                          ? 'text-slate-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]' 
                          : 'text-slate-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Active step indicator */}
                  {isActive && (
                    <div className="flex justify-center mt-6">
                      <div className="w-32 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
