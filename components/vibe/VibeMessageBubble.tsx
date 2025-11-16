/**
 * Vibe Message Bubble Component
 * 
 * Message bubble that shape-shifts based on emotional tone
 */

'use client';

import { useEffect, useState } from 'react';
import type { VibeAnalysis } from '@/lib/vibe/types';
import { cn } from '@/lib/utils';
import { VibeIndicator } from './VibeIndicator';

interface VibeMessageBubbleProps {
  text: string;
  vibe: VibeAnalysis;
  senderName?: string;
  isOwn?: boolean;
  showVibeIndicator?: boolean;
  className?: string;
}

export function VibeMessageBubble({
  text,
  vibe,
  senderName,
  isOwn = false,
  showVibeIndicator = true,
  className,
}: VibeMessageBubbleProps) {
  const [morphPhase, setMorphPhase] = useState(0);

  // Calculate bubble shape based on vibe
  const intensity = Math.min(100, (vibe.scores.excitement + vibe.scores.chaos) / 2);
  const borderRadius = 16 + (intensity / 100) * 8; // More rounded for high intensity
  const padding = 12 + (intensity / 100) * 4;

  // Color based on primary vibe
  const vibeColorMap: Record<string, { bg: string; text: string; border: string }> = {
    excited: { bg: '#FFF5E6', text: '#FF6B6B', border: '#FFE66D' },
    humorous: { bg: '#F7FFF7', text: '#4ECDC4', border: '#FFE66D' },
    flirty: { bg: '#FFF0F5', text: '#FF6B9D', border: '#FFB6C1' },
    calm: { bg: '#F0F8F8', text: '#95E1D3', border: '#AAE3E0' },
    stressed: { bg: '#FFF5F5', text: '#FF8C94', border: '#FFB3BA' },
    authentic: { bg: '#F8F7FF', text: '#6C5CE7', border: '#A29BFE' },
    chaotic: { bg: '#FFF0F0', text: '#FF7675', border: '#FFA8A7' },
    warm: { bg: '#FFF8DC', text: '#FFB347', border: '#FFD700' },
    confident: { bg: '#E6F3FF', text: '#00D2FF', border: '#3A7BD5' },
    vulnerable: { bg: '#F5F7FA', text: '#C7CEEA', border: '#E2E8F0' },
    neutral: { bg: '#ECF0F1', text: '#95A5A6', border: '#BDC3C7' },
    mixed: { bg: '#F0F8F8', text: '#A8E6CF', border: '#D4F1F4' },
  };

  const colors = vibeColorMap[vibe.primaryVibe] || vibeColorMap.neutral;

  // Animate morphing
  useEffect(() => {
    if (intensity > 50) {
      const interval = setInterval(() => {
        setMorphPhase(prev => prev + 0.1);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [intensity]);

  // Calculate dynamic border radius with morphing
  const morphRadius = intensity > 50
    ? borderRadius + Math.sin(morphPhase) * 4
    : borderRadius;

  return (
    <div
      className={cn(
        'relative flex gap-3',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {showVibeIndicator && (
        <div className="flex-shrink-0">
          <VibeIndicator
            scores={vibe.scores}
            primaryVibe={vibe.primaryVibe}
            size="sm"
            animated={intensity > 50}
          />
        </div>
      )}
      
      <div
        className={cn(
          'relative max-w-[70%] rounded-2xl px-4 py-2 shadow-sm transition-all duration-300',
          isOwn ? 'bg-blue-500 text-white' : 'bg-white text-gray-900'
        )}
        style={{
          borderRadius: `${morphRadius}px`,
          padding: `${padding}px`,
          backgroundColor: isOwn ? undefined : colors.bg,
          color: isOwn ? undefined : colors.text,
          border: `2px solid ${colors.border}40`,
          boxShadow: intensity > 60
            ? `0 4px 12px ${colors.border}30, 0 0 ${intensity / 5}px ${colors.border}20`
            : undefined,
        }}
      >
        {senderName && !isOwn && (
          <div className="mb-1 text-xs font-semibold opacity-70">
            {senderName}
          </div>
        )}
        
        <div className="text-sm leading-relaxed">{text}</div>
        
        {/* Vibe intensity indicator */}
        {intensity > 70 && (
          <div
            className="absolute -bottom-1 left-1/2 h-1 w-1/2 -translate-x-1/2 rounded-full"
            style={{
              backgroundColor: colors.border,
              animation: 'pulse 2s infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}

