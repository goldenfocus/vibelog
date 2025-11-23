'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { VideoCaptureZone } from '@/components/video/VideoCaptureZone';

interface VideoCreatorProps {
  remixContent?: string | null;
  onSaveSuccess?: (() => void) | null;
}

export function VideoCreator({ onSaveSuccess }: VideoCreatorProps) {
  const { user } = useAuth();

  // Handle save success - trigger feed refresh
  const handleSaveSuccess = () => {
    console.log('🔄 [VIDEO-CREATOR] Triggering feed refresh');
    onSaveSuccess?.();
  };

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

  // VideoCaptureZone handles vibelog creation, video recording, and auto-processing
  return (
    <div className="mx-auto w-full max-w-2xl">
      <VideoCaptureZone isPremium={false} onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}
