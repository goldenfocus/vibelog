'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface MediaBackgroundProps {
  coverImage?: string | null;
  videoUrl?: string | null;
  isActive?: boolean;
  className?: string;
}

/**
 * Media background with parallax effect and Ken Burns animation
 * Displays video or image with smooth loading and hover effects
 */
export function MediaBackground({
  coverImage,
  videoUrl,
  isActive = false,
  className = '',
}: MediaBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Reset video error when videoUrl changes
  useEffect(() => {
    setVideoError(false);
  }, [videoUrl]);

  const hasVideo = videoUrl && !videoError;
  const hasImage = coverImage;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Video background (if available and active) */}
      {hasVideo && (
        <video
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          src={videoUrl}
          autoPlay={isActive}
          loop
          muted
          playsInline
          preload="metadata" // Load first frame on mobile
          poster={coverImage || undefined} // Use cover image as poster
          onLoadedData={() => setIsLoaded(true)}
          onLoadedMetadata={() => setIsLoaded(true)} // Also show on metadata load
          onError={() => setVideoError(true)}
        />
      )}

      {/* Image background (fallback or primary) */}
      {hasImage && (!hasVideo || videoError) && (
        <div className="relative h-full w-full">
          <Image
            src={coverImage}
            alt="Card background"
            fill
            className={`object-cover transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            quality={85}
            onLoad={() => setIsLoaded(true)}
            priority={false}
          />
        </div>
      )}

      {/* Gradient background (fallback if no media) */}
      {!hasImage && !hasVideo && (
        <div className="absolute inset-0 bg-gradient-to-br from-electric/20 via-card to-card" />
      )}

      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-card/80 via-card/60 to-card/40" />
      )}
    </div>
  );
}
