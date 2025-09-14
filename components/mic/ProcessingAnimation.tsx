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
    if (isVisible && !isAnimating) {
      animateMagicalSequence();
    }
  }, [isVisible, animateMagicalSequence, isAnimating]);

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
                      {isCompleted && <span className="ml-4 text-3xl drop-shadow-[0_0_15px_rgba(0,255,0,0.8)] text-green-400">✓</span>}
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