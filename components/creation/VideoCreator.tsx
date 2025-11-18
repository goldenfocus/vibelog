'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { VideoCaptureZone } from '@/components/video/VideoCaptureZone';
import { useBulletproofSave } from '@/hooks/useBulletproofSave';

interface VideoCreatorProps {
  remixContent?: string | null;
}

export function VideoCreator({ remixContent }: VideoCreatorProps) {
  const { user } = useAuth();
  const { saveVibelog, isSaving } = useBulletproofSave();
  const [vibelogId, setVibelogId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const hasInitialized = useRef(false);

  // Create a placeholder vibelog on mount so we have a vibelogId for video upload
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
          content: remixContent || 'Video vibelog (recording...)',
        });

        if (result.success && result.vibelogId) {
          setVibelogId(result.vibelogId);
        }
      } catch (error) {
        console.error('Failed to initialize vibelog:', error);
        hasInitialized.current = false; // Allow retry on error
      } finally {
        setIsInitializing(false);
      }
    };

    initializeVibelog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, remixContent]); // Removed saveVibelog from dependencies

  const handleVideoCaptured = async (_videoUrl: string) => {
    if (!vibelogId) {
      return;
    }

    // Show completion UI instead of redirecting
    // Video is already uploaded and saved to vibelog
    console.log('✅ [VideoCreator] Video captured and uploaded successfully');
    setShowCompletion(true);
  };

  const handleRecordAnother = () => {
    // Reset to record a new video
    setShowCompletion(false);
    setVibelogId(null);
    hasInitialized.current = false;
    setIsInitializing(true);
  };

  if (isInitializing || isSaving) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-center rounded-2xl border border-border/50 bg-card/80 p-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Initializing...</p>
          </div>
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

  // Show completion UI after successful upload
  if (showCompletion && vibelogId) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-8 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-600 p-2 dark:bg-green-500">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Video vibelog created!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your video has been uploaded and saved successfully.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Link
              href={`/vibelogs/${vibelogId}/edit`}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              Add title & publish
            </Link>
            <button
              onClick={handleRecordAnother}
              className="flex-1 rounded-lg border border-green-600 px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/40"
            >
              Record another
            </button>
          </div>

          <Link
            href="/dashboard"
            className="block text-center text-sm text-green-600 hover:underline dark:text-green-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <VideoCaptureZone
        vibelogId={vibelogId}
        onVideoCaptured={handleVideoCaptured}
        isPremium={false}
      />
    </div>
  );
}
