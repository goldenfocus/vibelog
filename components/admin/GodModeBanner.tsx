'use client';

import { Eye, LogOut, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GodModeBannerProps {
  targetUserName: string;
  targetUserId: string;
  onExit: () => void;
  expiresAt: number;
}

export default function GodModeBanner({ targetUserName, onExit, expiresAt }: GodModeBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);

      if (remaining === 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleExit = async () => {
    setIsExiting(true);
    await onExit();
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Eye className="h-5 w-5 animate-pulse text-white" />
              <div className="absolute inset-0 h-5 w-5 animate-ping">
                <Eye className="h-5 w-5 text-white opacity-75" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-semibold text-white">God Mode Active</span>
              <span className="hidden text-white/60 sm:inline">•</span>
              <span className="text-sm text-white/90">
                Viewing as <span className="font-semibold text-white">{targetUserName}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm sm:flex">
              <Clock className="h-4 w-4 text-white/80" />
              <span className="text-sm font-medium text-white">{timeRemaining}</span>
            </div>

            <button
              onClick={handleExit}
              disabled={isExiting}
              className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Exit God Mode</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
