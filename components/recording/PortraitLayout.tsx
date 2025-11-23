'use client';

import { ReactNode } from 'react';

import { useSafeArea } from '@/hooks/useSafeArea';
import { cn } from '@/lib/utils';

export interface PortraitLayoutProps {
  /**
   * Waveform visualization component
   */
  waveform: ReactNode;

  /**
   * Transcription overlay component
   */
  transcription: ReactNode;

  /**
   * Bottom controls component
   */
  controls: ReactNode;

  /**
   * Optional header content (e.g., timer, status)
   */
  header?: ReactNode;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Portrait layout for mobile recording
 * Vertical stack: Header → Waveform → Transcription → Controls
 * Optimized for one-handed vertical phone usage
 *
 * @example
 * <PortraitLayout
 *   header={<Timer />}
 *   waveform={<MobileWaveform />}
 *   transcription={<MobileTranscription />}
 *   controls={<MobileControls />}
 * />
 */
export function PortraitLayout({
  waveform,
  transcription,
  controls,
  header,
  className,
}: PortraitLayoutProps) {
  const { top, bottom } = useSafeArea();

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col',
        'bg-gradient-to-b from-background via-background/95 to-background',
        className
      )}
      style={{
        paddingTop: top,
        paddingBottom: bottom,
      }}
    >
      {/* Header (optional) */}
      {header && <div className="flex-shrink-0 px-6 py-4">{header}</div>}

      {/* Waveform - prominent in center */}
      <div className="flex flex-shrink-0 items-center justify-center px-6 py-8">{waveform}</div>

      {/* Transcription - scrollable area */}
      <div className="min-h-0 flex-1 px-6 pb-4">{transcription}</div>

      {/* Controls - fixed at bottom */}
      <div className="flex-shrink-0 px-6 pb-6">{controls}</div>
    </div>
  );
}
