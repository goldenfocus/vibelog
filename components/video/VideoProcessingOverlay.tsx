'use client';

/**
 * Video Processing Overlay
 * Shows live processing status after video capture, then navigates to vibelog page.
 * Inspired by the MicRecorder ProcessingAnimation pattern.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Video, Sparkles, Languages, FileText, Wand2, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ProcessingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

interface VideoProcessingOverlayProps {
  vibelogId: string;
  videoBlob?: Blob | null;
  onComplete?: () => void;
  onNavigate?: (slug: string) => void;
}

const PROCESSING_STEPS: Omit<ProcessingStep, 'status'>[] = [
  {
    id: 'upload',
    label: 'Video uploaded',
    description: 'Your video is safely stored',
    icon: <Video className="h-5 w-5" />,
  },
  {
    id: 'transcribe',
    label: 'Transcribing audio',
    description: 'Converting speech to text...',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'translate',
    label: 'Detecting language',
    description: 'Preparing for content generation...',
    icon: <Languages className="h-5 w-5" />,
  },
  {
    id: 'generate',
    label: 'Crafting your story',
    description: 'AI is writing something beautiful...',
    icon: <Wand2 className="h-5 w-5" />,
  },
  {
    id: 'polish',
    label: 'Polishing content',
    description: 'Adding the finishing touches...',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: 'ready',
    label: 'Your vibelog is ready!',
    description: 'Taking you there now...',
    icon: <CheckCircle className="h-5 w-5" />,
  },
];

export function VideoProcessingOverlay({
  vibelogId,
  videoBlob,
  onComplete,
  onNavigate,
}: VideoProcessingOverlayProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>(
    PROCESSING_STEPS.map((step, i) => ({
      ...step,
      status: i === 0 ? 'active' : 'pending',
    }))
  );
  const [isNavigating, setIsNavigating] = useState(false);

  // Ensure we're mounted before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll for vibelog status
  const pollVibelogStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/vibelog/${vibelogId}/status`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[VideoProcessingOverlay] Poll error:', error);
      return null;
    }
  }, [vibelogId]);

  // Advance to next step with animation
  const advanceStep = useCallback((toIndex: number) => {
    setSteps(prev =>
      prev.map((step, i) => ({
        ...step,
        status: i < toIndex ? 'completed' : i === toIndex ? 'active' : 'pending',
      }))
    );
    setCurrentStepIndex(toIndex);
  }, []);

  // Main processing orchestration
  useEffect(() => {
    let cancelled = false;
    let pollInterval: NodeJS.Timeout;

    const runProcessing = async () => {
      // Step 0: Upload (already done)
      advanceStep(0);
      await new Promise(r => setTimeout(r, 800));

      // Step 1: Transcribing
      if (cancelled) {
        return;
      }
      advanceStep(1);

      // Start polling for completion
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 * 2s = 2 minutes max

      pollInterval = setInterval(async () => {
        if (cancelled || isComplete) {
          return;
        }

        attempts++;
        const status = await pollVibelogStatus();

        // Check if content is ready (not "processing..." placeholder)
        const contentReady =
          status?.content &&
          !status.content.includes('processing') &&
          status.title &&
          status.title !== 'Video vibelog';

        if (contentReady) {
          isComplete = true;
          clearInterval(pollInterval);

          // Animate through remaining steps quickly
          for (let i = currentStepIndex + 1; i < PROCESSING_STEPS.length; i++) {
            if (cancelled) {
              return;
            }
            advanceStep(i);
            await new Promise(r => setTimeout(r, 400));
          }

          // Navigate after final step
          await new Promise(r => setTimeout(r, 600));
          if (!cancelled) {
            setIsNavigating(true);
            const slug = status.public_slug;
            if (onNavigate && slug) {
              onNavigate(slug);
            } else if (slug) {
              router.push(`/v/${slug}`);
            }
            onComplete?.();
          }
        } else if (attempts > maxAttempts) {
          // Timeout - still navigate but show warning
          isComplete = true;
          clearInterval(pollInterval);
          advanceStep(PROCESSING_STEPS.length - 1);
          await new Promise(r => setTimeout(r, 600));
          if (!cancelled && status?.public_slug) {
            router.push(`/v/${status.public_slug}`);
          }
        } else {
          // Simulate progress through steps based on time
          const progressStep = Math.min(Math.floor(attempts / 5) + 1, PROCESSING_STEPS.length - 2);
          if (progressStep > currentStepIndex) {
            advanceStep(progressStep);
          }
        }
      }, 2000);
    };

    runProcessing();

    return () => {
      cancelled = true;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [vibelogId, advanceStep, pollVibelogStatus, onComplete, onNavigate, router, currentStepIndex]);

  // Use portal to render overlay at document body level (escapes any parent containers)
  const overlayContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-xl"
    >
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-3 rounded-2xl border border-electric/20 bg-gradient-to-br from-electric/10 to-purple-500/10 px-6 py-3">
            <Loader2 className="h-5 w-5 animate-spin text-electric" />
            <span className="bg-gradient-to-r from-electric to-purple-500 bg-clip-text text-lg font-bold text-transparent">
              Creating your vibelog
            </span>
          </div>
        </motion.div>

        {/* Video Preview (small) */}
        {videoBlob && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <video
              src={URL.createObjectURL(videoBlob)}
              className="mx-auto h-32 w-auto rounded-xl border border-border/30 object-cover shadow-lg"
              muted
              loop
              autoPlay
              playsInline
            />
          </motion.div>
        )}

        {/* Processing Steps */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {steps.slice(0, currentStepIndex + 2).map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 ${
                  step.status === 'active'
                    ? 'border-electric/40 bg-gradient-to-r from-electric/10 to-purple-500/5'
                    : step.status === 'completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-border/30 bg-card/50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    step.status === 'active'
                      ? 'bg-electric/20 text-electric'
                      : step.status === 'completed'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : step.status === 'active' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      {step.icon}
                    </motion.div>
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      step.status === 'active'
                        ? 'text-foreground'
                        : step.status === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {step.status === 'active' && (
                  <motion.div
                    className="h-2 w-2 rounded-full bg-electric"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Current Status Line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {isNavigating
              ? 'Redirecting to your vibelog...'
              : `Step ${currentStepIndex + 1} of ${PROCESSING_STEPS.length}`}
          </p>

          {/* Progress bar */}
          <div className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-electric to-purple-500"
              initial={{ width: '0%' }}
              animate={{
                width: `${((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  // Render via portal to escape parent container constraints
  if (!mounted) {
    return null;
  }
  return createPortal(overlayContent, document.body);
}
