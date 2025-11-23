'use client';

import { useEffect } from 'react';

import { useWaveformAnimation } from '@/hooks/useWaveformAnimation';
import { RECORDING_UI } from '@/lib/mobile/constants';
import { cn } from '@/lib/utils';

export interface MobileWaveformProps {
  /**
   * Web Audio API analyzer node for live audio data
   */
  analyzerNode?: AnalyserNode | null;

  /**
   * Is currently recording
   */
  isRecording: boolean;

  /**
   * Visual theme
   * @default 'primary'
   */
  theme?: 'primary' | 'gradient' | 'minimal';

  /**
   * Enable 3D perspective effect
   * @default true
   */
  perspective?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Mobile waveform visualization
 * Dramatic, reactive waveform optimized for mobile
 * Uses spring physics for smooth, natural movement
 *
 * @example
 * <MobileWaveform
 *   analyzerNode={analyzer}
 *   isRecording={isRecording}
 *   theme="gradient"
 * />
 */
export function MobileWaveform({
  analyzerNode,
  isRecording,
  theme = 'primary',
  perspective = true,
  className,
}: MobileWaveformProps) {
  const { bars, updateAudioData } = useWaveformAnimation({
    barCount: 40,
    baseHeight: RECORDING_UI.WAVEFORM_HEIGHT.MOBILE,
    maxScale: 1.8, // More dramatic scaling for mobile
    springConfig: {
      stiffness: 180,
      damping: 15,
    },
  });

  // Update waveform with live audio data
  useEffect(() => {
    if (!analyzerNode || !isRecording) {
      return;
    }

    let animationFrameId: number;
    const dataArray = new Uint8Array(analyzerNode.frequencyBinCount);

    const updateLoop = () => {
      analyzerNode.getByteFrequencyData(dataArray);
      updateAudioData(dataArray);
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    updateLoop();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [analyzerNode, isRecording, updateAudioData]);

  // Theme styles
  const themeStyles = {
    primary: 'bg-primary',
    gradient: 'bg-gradient-to-t from-primary via-primary/80 to-primary/60',
    minimal: 'bg-foreground/20',
  };

  return (
    <div
      className={cn(
        'flex items-end justify-center gap-1',
        perspective && 'perspective-1000',
        className
      )}
      style={{
        height: RECORDING_UI.WAVEFORM_HEIGHT.MOBILE,
      }}
      role="presentation"
      aria-label={isRecording ? 'Recording waveform visualization' : 'Waveform visualization'}
    >
      {bars.map((bar, index) => (
        <div
          key={`bar-${index}`}
          className={cn(
            'w-1.5 rounded-full transition-all duration-75',
            themeStyles[theme],
            isRecording ? 'opacity-100' : 'opacity-50'
          )}
          style={{
            height: `${bar.height}px`,
            transform: perspective
              ? `scaleY(${1 + (bar.height / RECORDING_UI.WAVEFORM_HEIGHT.MOBILE) * 0.2}) translateZ(0)`
              : undefined,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}
