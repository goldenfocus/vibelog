'use client';

import { useState, useEffect, useRef } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { VideoCaptureZone } from '@/components/video/VideoCaptureZone';
import { useBulletproofSave } from '@/hooks/useBulletproofSave';

interface VideoCreatorProps {
  remixContent?: string | null;
  onSaveSuccess?: (() => void) | null;
}

export function VideoCreator({ remixContent, onSaveSuccess }: VideoCreatorProps) {
  const { user } = useAuth();
  const { saveVibelog, isSaving } = useBulletproofSave();
  const [vibelogId, setVibelogId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Create a placeholder vibelog on mount so we have a vibelogId for video upload
  useEffect(() => {
    if (hasInitialized.current || vibelogId) {
      return;
    }

    const initializeVibelog = async () => {
      console.log('🎬 [VIDEO-CREATOR] Starting initialization...', { user: !!user });

      if (!user) {
        console.log('🔒 [VIDEO-CREATOR] No user, stopping initialization');
        setIsInitializing(false);
        return;
      }

      hasInitialized.current = true;

      try {
        console.log('💾 [VIDEO-CREATOR] Creating placeholder vibelog...');
        const result = await saveVibelog({
          content: remixContent || 'Video vibelog (recording...)',
        });

        console.log('💾 [VIDEO-CREATOR] Save result:', result);

        if (result.success && result.vibelogId) {
          console.log('✅ [VIDEO-CREATOR] Vibelog created:', result.vibelogId);
          setVibelogId(result.vibelogId);
          setInitError(null);
        } else {
          console.error('❌ [VIDEO-CREATOR] Save failed:', result.message);
          hasInitialized.current = false;
          setInitError(result.message || 'Failed to initialize');
        }
      } catch (error) {
        console.error('❌ [VIDEO-CREATOR] Exception during initialization:', error);
        hasInitialized.current = false;
        setInitError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        console.log('🏁 [VIDEO-CREATOR] Initialization complete, isInitializing -> false');
        setIsInitializing(false);
      }
    };

    initializeVibelog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, remixContent]);

  // Handle save success - trigger feed refresh
  const handleSaveSuccess = () => {
    console.log('🔄 [VIDEO-CREATOR] Triggering feed refresh');
    onSaveSuccess?.();
  };

  if (isInitializing) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-center rounded-2xl border border-border/50 bg-card/80 p-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">
              {isSaving ? 'Creating vibelog...' : 'Initializing...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            Initialization failed
          </p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">{initError}</p>
          <button
            onClick={() => {
              setInitError(null);
              hasInitialized.current = false;
              setIsInitializing(true);
            }}
            className="mt-3 text-xs text-red-600 hover:underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            Please log in to create video vibelogs.
          </p>
        </div>
      </div>
    );
  }

  if (!vibelogId) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-900 dark:text-red-100">
            Failed to initialize vibelog. Please try again.
          </p>
        </div>
      </div>
    );
  }

  // VideoCaptureZone handles its own completion UI with auto-processing
  return (
    <div className="mx-auto w-full max-w-2xl">
      <VideoCaptureZone vibelogId={vibelogId} isPremium={false} onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}
