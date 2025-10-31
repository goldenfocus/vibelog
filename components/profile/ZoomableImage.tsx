'use client';

import Zoom from 'react-medium-image-zoom';

import { cn } from '@/lib/utils';
import 'react-medium-image-zoom/dist/styles.css';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  rounded?: boolean;
  priority?: boolean;
}

/**
 * Zoomable image component with Medium.com-style zoom effect
 * Click to zoom, click again or press ESC to close
 */
export function ZoomableImage({
  src,
  alt,
  className,
  wrapperClassName,
  rounded = false,
}: ZoomableImageProps) {
  return (
    <Zoom classDialog="custom-zoom-overlay" zoomMargin={40}>
      <div
        className={cn(
          'relative cursor-zoom-in transition-transform hover:scale-[1.02]',
          wrapperClassName
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn('h-full w-full object-cover', rounded && 'rounded-full', className)}
        />
        {/* Hover indicator */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
            Click to enlarge
          </div>
        </div>
      </div>
    </Zoom>
  );
}
