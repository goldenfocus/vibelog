'use client';

import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface GlassTextContainerProps {
  children: ReactNode;
  dominantColor?: string;
  className?: string;
}

/**
 * Glassmorphic container for text content
 * Features backdrop blur, subtle gradient, and dynamic tinting based on dominant color
 */
export function GlassTextContainer({
  children,
  dominantColor,
  className,
}: GlassTextContainerProps) {
  // Parse RGB color and create rgba with low opacity for tint
  const parseRGBForTint = (rgb?: string) => {
    if (!rgb) {return 'rgba(255, 255, 255, 0.05)';}
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) {return 'rgba(255, 255, 255, 0.05)';}
    return `rgba(${match[0]}, ${match[1]}, ${match[2]}, 0.08)`;
  };

  const tintColor = parseRGBForTint(dominantColor);

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 pb-6',
        'backdrop-blur-glass backdrop-saturate-[180%]',
        'border-t border-white/10',
        'transition-all duration-500',
        className
      )}
      style={{
        background: `linear-gradient(
          to top,
          rgba(0, 0, 0, 0.85) 0%,
          rgba(0, 0, 0, 0.7) 40%,
          rgba(0, 0, 0, 0.4) 100%
        ), ${tintColor}`,
      }}
    >
      {/* Inner shadow for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
