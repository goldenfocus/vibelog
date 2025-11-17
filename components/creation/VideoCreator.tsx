'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { VideoCaptureZone } from '@/components/video/VideoCaptureZone';
import { useBulletproofSave } from '@/hooks/useBulletproofSave';

interface VideoCreatorProps {
  remixContent?: string | null;
}

export function VideoCreator({ remixContent }: VideoCreatorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { saveVibelog, isSaving } = useBulletproofSave();
  const [vibelogId, setVibelogId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Create a placeholder vibelog on mount so we have a vibelogId for video upload
  useEffect(() => {
    const initializeVibelog = async () => {
      if (!user) {
        setIsInitializing(false);
        return;
      }

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
      } finally {
        setIsInitializing(false);
      }
    };

    initializeVibelog();
  }, [user, remixContent, saveVibelog]);

  const handleVideoCaptured = async (_videoUrl: string) => {
    if (!vibelogId) {
      return;
    }

    // Redirect to edit page where they can add title/content
    // Video is already uploaded via VideoCaptureZone
    router.push(`/vibelogs/${vibelogId}/edit`);
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
