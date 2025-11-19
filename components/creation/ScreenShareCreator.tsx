'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { ScreenCaptureZone } from '@/components/video/ScreenCaptureZone';
import { useBulletproofSave } from '@/hooks/useBulletproofSave';

interface ScreenShareCreatorProps {
  remixContent?: string | null;
  onSaveSuccess?: (() => void) | null;
}

export function ScreenShareCreator({ remixContent, onSaveSuccess }: ScreenShareCreatorProps) {
  const { user } = useAuth();
  const { saveVibelog } = useBulletproofSave();
  const [vibelogId, setVibelogId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const hasInitialized = useRef(false);

  // Create a placeholder vibelog on mount so we have a vibelogId for screen recording upload
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current || vibelogId) {
      return;
    }

    const initializeVibelog = async () => {
      if (!user) {
        setIsInitializing(false);
        return;
      }

      hasInitialized.current = true;

      try {
        // Create placeholder vibelog
        const result = await saveVibelog({
          content: remixContent || 'Screen recording vibelog (recording...)',
        });

        if (result.success && result.vibelogId) {
          setVibelogId(result.vibelogId);

          // Trigger homepage feed refresh if callback is provided
          if (onSaveSuccess && typeof onSaveSuccess === 'function') {
            console.log('🔄 [SCREEN-SHARE-CREATOR] Triggering feed refresh');
            onSaveSuccess();
          }
        }
      } catch (error) {
        console.error('Failed to initialize vibelog:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeVibelog();
  }, [user, vibelogId, saveVibelog, remixContent, onSaveSuccess]);

  const handleScreenRecordingComplete = (videoUrl: string) => {
    console.log('Screen recording complete:', videoUrl);
    setShowCompletion(true);

    // Trigger feed refresh (check if callback exists and is a function)
    if (onSaveSuccess && typeof onSaveSuccess === 'function') {
      onSaveSuccess();
    }

    // Hide completion message after 5 seconds
    setTimeout(() => {
      setShowCompletion(false);
    }, 5000);
  };

  if (!user) {
    return (
      <div className="w-full max-w-3xl rounded-2xl border border-border/50 bg-card/80 p-8 text-center backdrop-blur-sm">
        <h3 className="mb-4 text-xl font-semibold">Screen Share Recording</h3>
        <p className="mb-6 text-muted-foreground">
          Sign in to record your screen with optional camera overlay
        </p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex w-full max-w-3xl items-center justify-center rounded-2xl border border-border/50 bg-card/80 p-12 backdrop-blur-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Initializing screen recorder...</p>
        </div>
      </div>
    );
  }

  if (!vibelogId) {
    return (
      <div className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Failed to initialize screen recorder. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      {showCompletion && (
        <div className="mb-6 flex items-center justify-center gap-3 rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300">
          <Check className="h-5 w-5" />
          <span className="font-medium">Screen recording uploaded successfully!</span>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold">Ready to Capture Some Magic? ✨</h2>
          <p className="text-sm text-muted-foreground">
            Record your screen (+ your beautiful face if you want!) — perfect for tutorials, demos,
            product tours, and showing off your genius 🚀
          </p>
        </div>

        <ScreenCaptureZone
          vibelogId={vibelogId}
          onVideoCaptured={handleScreenRecordingComplete}
          maxDurationSeconds={60}
          isPremium={false}
          enableCameraPip={true}
        />
      </div>
    </div>
  );
}
