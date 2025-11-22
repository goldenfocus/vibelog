'use client';

import React from 'react';

interface WaveformProps {
  levels: number[]; // Array of 15 level values (0-1)
  isActive: boolean; // Controls animations
  variant: 'recording' | 'playback';
  className?: string;
}

/**
 * Pure presentational Waveform component
 * Renders real-time audio visualization bars with responsive design
 */
export default function Waveform({
  levels,
  isActive: _isActive,
  variant = 'recording',
  className = '',
}: WaveformProps) {
  const bars = levels.length;

  // Base container classes based on variant
  const containerClasses =
    variant === 'recording'
      ? 'flex items-center justify-center gap-1 sm:gap-1.5 h-24 sm:h-32 mb-8 px-6 sm:px-12 py-4 sm:py-6 bg-card/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-border/10'
      : 'flex items-center justify-center gap-1.5 h-16 mt-6 px-8 py-4 bg-card/10 backdrop-blur-sm rounded-2xl border border-border/5';

  return (
    <div className={`${containerClasses} ${className}`}>
      {levels.map((lvl, i) => {
        // Natural equalizer - each bar responds to its own frequency range
        const heightPercent = Math.max(variant === 'recording' ? 8 : 6, lvl * 100);
        const _delay = i * 30; // Slight delay for wave effect

        // Base colors and effects
        const baseHue = variant === 'recording' ? 190 : 200;
        const hue = baseHue + i * (variant === 'recording' ? 1.5 : 2);
        const saturation = variant === 'recording' ? 80 : 70;
        const lightness =
          (variant === 'recording' ? 55 : 60) + lvl * (variant === 'recording' ? 25 : 20);

        // Special metallic effect for maxed bars (recording only)
        const isMaxed = variant === 'recording' && lvl > 0.95 && i >= bars - 3;
        const barColor = isMaxed
          ? `hsl(0, 0%, ${85 + lvl * 15}%)`
          : `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        return (
          <div
            key={i}
            className="transition-all duration-100 ease-out"
            style={{
              height: `${heightPercent}%`,
              width:
                variant === 'recording'
                  ? typeof window !== 'undefined' && window.innerWidth < 640
                    ? '6px'
                    : '9px'
                  : '6px',
              backgroundColor: barColor,
              borderRadius: variant === 'recording' ? '2.5px' : '3px',
              boxShadow: `0 0 ${
                lvl *
                (variant === 'recording'
                  ? typeof window !== 'undefined' && window.innerWidth < 640
                    ? 8
                    : 12
                  : 8)
              }px ${barColor}`,
              opacity: variant === 'recording' ? 0.8 + lvl * 0.2 : 0.7 + lvl * 0.3,
              transform:
                variant === 'recording'
                  ? `scaleY(${0.4 + lvl * 0.6}) scaleX(${0.8 + lvl * 0.2})`
                  : `scaleY(${0.5 + lvl * 0.5})`,
              filter: `blur(${(1 - lvl) * 0.3}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
