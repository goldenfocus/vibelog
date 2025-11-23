'use client';

import { ReactNode } from 'react';

import { useSafeArea } from '@/hooks/useSafeArea';
import { cn } from '@/lib/utils';

export interface LandscapeLayoutProps {
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
 * Landscape layout for mobile recording
 * Side-by-side: Waveform (left) | Transcription (right)
 * Controls at bottom, header at top
 * Optimized for horizontal phone usage
 *
 * @example
 * <LandscapeLayout
 *   header={<Timer />}
 *   waveform={<MobileWaveform />}
 *   transcription={<MobileTranscription />}
 *   controls={<MobileControls />}
 * />
 */
export function LandscapeLayout({
  waveform,
  transcription,
  controls,
  header,
  className,
}: LandscapeLayoutProps) {
  const { top, bottom, left, right } = useSafeArea();

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col',
        'bg-gradient-to-br from-background via-background/95 to-background',
        className
      )}
      style={{
        paddingTop: top,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}
    >
      {/* Header (optional) */}
      {header && <div className="flex-shrink-0 px-6 py-3">{header}</div>}

      {/* Main content area - side by side */}
      <div className="min-h-0 flex-1 px-6 py-4">
        <div className="flex h-full gap-6">
          {/* Left: Waveform */}
          <div className="flex w-1/2 items-center justify-center">
            <div className="w-full">{waveform}</div>
          </div>

          {/* Right: Transcription */}
          <div className="w-1/2">{transcription}</div>
        </div>
      </div>

      {/* Controls - fixed at bottom */}
      <div className="flex-shrink-0 px-6 pb-4">{controls}</div>
    </div>
  );
}
