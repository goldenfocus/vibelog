'use client';

import { Play, Music2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractionLayerProps {
  vibelogId: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  isHovered?: boolean;
  onPlayClick?: () => void;
}

/**
 * Floating interaction layer with play buttons and media indicators
 * Appears on hover with staggered animations
 */
export function InteractionLayer({
  vibelogId,
  hasAudio = false,
  hasVideo = false,
  isHovered = false,
  onPlayClick,
}: InteractionLayerProps) {
  const hasMedia = hasAudio || hasVideo;

  if (!hasMedia) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* Center play button - appears on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlayClick?.();
        }}
        className={cn(
          'pointer-events-auto',
          'group/play relative flex h-16 w-16 items-center justify-center',
          'rounded-full border border-white/20 bg-black/40',
          'backdrop-blur-md backdrop-saturate-150',
          'transition-all duration-300',
          'hover:scale-110 hover:border-electric/50 hover:bg-black/60',
          'focus:outline-none focus:ring-2 focus:ring-electric/50',
          isHovered
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-4 scale-95 opacity-0'
        )}
        aria-label={`Play ${hasVideo ? 'video' : 'audio'}`}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 -z-10 rounded-full bg-electric/20 blur-xl transition-all group-hover/play:bg-electric/40" />

        {/* Play icon */}
        <Play className="h-7 w-7 fill-white text-white transition-transform group-hover/play:scale-110" />
      </button>

      {/* Media type indicator - top right corner */}
      <div
        className={cn(
          'absolute right-3 top-3',
          'flex items-center gap-1.5 rounded-full',
          'border border-white/20 bg-black/50 px-2.5 py-1.5',
          'backdrop-blur-md backdrop-saturate-150',
          'transition-all duration-300 delay-75',
          isHovered
            ? 'translate-x-0 opacity-100'
            : 'translate-x-4 opacity-0'
        )}
      >
        {hasVideo ? (
          <Video className="h-3.5 w-3.5 text-white/90" />
        ) : (
          <Music2 className="h-3.5 w-3.5 text-white/90" />
        )}
        <span className="text-xs font-medium text-white/90">
          {hasVideo ? 'Video' : 'Audio'}
        </span>
      </div>
    </div>
  );
}
