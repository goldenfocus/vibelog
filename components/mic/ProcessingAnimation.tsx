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
    
    // Initialize processing steps with the new format
    setProcessingSteps(steps.map(step => ({
      id: step.id,
      label: step.title,
      description: step.description,
      completed: false
    })));
    
    setIsAnimating(true);
    
    // Create promises for API calls to ensure proper sequencing
    let transcriptionPromise: Promise<any> | null = null;
    let blogGenerationPromise: Promise<any> | null = null;
    
    // Start API calls at specific steps
    const triggerAPICall = (stepId: string) => {
      if (stepId === "transcribe" && !transcriptionPromise) {
        console.log('🚀 Starting transcription API call...');
        transcriptionPromise = onTranscribeComplete().then(() => {
          console.log('✅ Transcription API call completed');
        }).catch(error => {
          console.error('❌ Transcription failed:', error);
          throw error;
        });
      } else if (stepId === "format" && !blogGenerationPromise && transcriptionPromise) {
        console.log('🚀 Starting blog generation API call...');
        blogGenerationPromise = transcriptionPromise.then(() => onGenerateComplete()).then(() => {
          console.log('✅ Blog generation API call completed');
        }).catch(error => {
          console.error('❌ Blog generation failed:', error);
          throw error;
        });
      }
    };
    
    // Star Wars crawl animation - each step flows upward and fades
    for (let i = 0; i < steps.length; i++) {
      await new Promise<void>(resolve => setTimeout(resolve, STEP_DURATION));
      
      // Mark current step as completed
      setProcessingSteps(prev => prev.map(s => s.id === steps[i].id ? { ...s, completed: true } : s));
      
      // Trigger API calls at appropriate steps
      triggerAPICall(steps[i].id);
      
      // Update visible window to show current processing step at the center
      setVisibleStepIndex(Math.max(0, i - 1));
    }
    
    // Ensure all API calls complete before finishing
    if (blogGenerationPromise) {
      await blogGenerationPromise;
    } else if (transcriptionPromise) {
      await transcriptionPromise;
    }
    
    // Final smooth transition
    await new Promise(resolve => setTimeout(resolve, STEP_DURATION / 2));
    
    // Set final visible state showing the last few completed steps
    setVisibleStepIndex(Math.max(0, steps.length - 3));
    setIsAnimating(false);
    
    // Notify parent that animation is complete
    onAnimationComplete?.();
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
        <div className="relative h-96 overflow-hidden bg-gradient-to-b from-background/0 via-background/50 to-background perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none"></div>
          
          <div className="star-wars-crawl space-y-8 pt-32">
            {processingSteps.map((step, index) => {
              const isCompleted = step.completed;
              const firstIncompleteIndex = processingSteps.findIndex(s => !s.completed);
              const isActive = !isCompleted && index === firstIncompleteIndex;
              const isPast = isCompleted;
              
              return (
                <div 
                  key={step.id}
                  className={`crawl-step transform transition-all duration-1000 ease-out ${
                    isCompleted ? 'opacity-60' : isActive ? 'opacity-100 scale-110' : 'opacity-40'
                  }`}
                  style={{
                    animationDelay: `${index * 0.2}s`
                  }}
                >
                  <div className="text-center mb-3">
                    <h3 className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wider transition-all duration-700 ${
                      isActive 
                        ? 'text-electric animate-pulse bg-gradient-electric bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(97,144,255,0.8)] glow-text-active' 
                        : isCompleted 
                          ? 'text-electric bg-gradient-electric bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(97,144,255,0.6)] glow-text-completed' 
                          : 'text-muted-foreground/60'
                    }`}>
                      {step.label}
                      {isCompleted && <span className="ml-3 text-2xl animate-bounce">✓</span>}
                    </h3>
                  </div>
                  
                  <div className="max-w-lg mx-auto">
                    <p className={`text-base sm:text-lg text-center leading-relaxed transition-all duration-700 font-medium ${
                      isActive 
                        ? 'text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] glow-text-secondary' 
                        : isCompleted 
                          ? 'text-muted-foreground/80' 
                          : 'text-muted-foreground/50'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Active step indicator */}
                  {isActive && (
                    <div className="flex justify-center mt-3">
                      <div className="w-20 h-1 bg-gradient-to-r from-transparent via-electric to-transparent rounded-full animate-pulse"></div>
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