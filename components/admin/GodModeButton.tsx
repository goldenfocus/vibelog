'use client';

import { Eye } from 'lucide-react';
import { useState } from 'react';

interface GodModeButtonProps {
  targetUserId: string;
  targetUserName: string;
  onEnterGodMode: (targetUserId: string) => Promise<void>;
}

export default function GodModeButton({
  targetUserId,
  targetUserName,
  onEnterGodMode,
}: GodModeButtonProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setIsEntering(true);
    try {
      await onEnterGodMode(targetUserId);
      // Page will reload after entering god mode
    } catch (error) {
      console.error('Failed to enter god mode:', error);
      setIsEntering(false);
      setShowConfirm(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isEntering}
        className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        title="Enter God Mode"
      >
        <div className="relative">
          <Eye className="h-4 w-4 transition-transform group-hover:scale-110" />
          <div className="absolute inset-0 animate-pulse">
            <Eye className="h-4 w-4 opacity-50" />
          </div>
        </div>
        <span>God Mode</span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="relative">
                <Eye className="h-6 w-6 animate-pulse text-purple-500" />
                <div className="absolute inset-0 animate-ping">
                  <Eye className="h-6 w-6 text-purple-500 opacity-50" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground">Enter God Mode?</h3>
            </div>

            <p className="mb-6 leading-relaxed text-muted-foreground">
              You are about to view the site as{' '}
              <span className="font-semibold text-foreground">{targetUserName}</span>.
            </p>

            <div className="mb-6 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> This session will last for 1 hour
                and all actions will be logged for security purposes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button
                onClick={handleConfirm}
                disabled={isEntering}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              >
                {isEntering ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Entering...</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-5 w-5" />
                    <span>Enter God Mode</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isEntering}
                className="rounded-2xl border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
