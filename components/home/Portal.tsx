'use client';

import { Mic } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface PortalProps {
  onClick: () => void;
  className?: string;
}

export function Portal({ onClick, className }: PortalProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex h-40 w-40 items-center justify-center rounded-full transition-all duration-700 ease-out focus:outline-none sm:h-56 sm:w-56',
        className
      )}
      aria-label="Enter your universe"
    >
      {/* Core Orb */}
      <div
        className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-br from-electric via-electric-glow to-electric opacity-20 blur-xl transition-all duration-700',
          isHovered ? 'scale-125 opacity-30 blur-2xl' : 'scale-100'
        )}
      />

      {/* Inner Glow Ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-electric/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-700',
          isHovered
            ? 'scale-110 border-electric/50 shadow-[0_0_50px_rgba(59,130,246,0.5)]'
            : 'scale-100'
        )}
      />

      {/* Pulsing Aura */}
      <div className="absolute inset-0 animate-slow-pulse rounded-full bg-electric/10 blur-3xl" />

      {/* Center Content */}
      <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-all duration-500 group-hover:bg-black/10">
        <Mic
          className={cn(
            'h-12 w-12 text-electric-glow transition-all duration-500 sm:h-16 sm:w-16',
            isHovered
              ? 'scale-110 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]'
              : 'scale-100'
          )}
          strokeWidth={1.5}
        />
      </div>
    </button>
  );
}
