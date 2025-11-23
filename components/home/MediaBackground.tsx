'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

import { getGradientStyle } from '@/lib/gradient-generator';
import { isExpiredOpenAIUrl } from '@/lib/image-utils';

interface MediaBackgroundProps {
  coverImage?: string | null;
  videoUrl?: string | null;
  vibelogId?: string; // For deterministic gradient generation
  title?: string; // For SEO-optimized alt text
  isActive?: boolean;
  className?: string;
  isPlaying?: boolean;
}

/**
 * Media background with parallax effect and Ken Burns animation
 * Displays video or image with smooth loading and hover effects
 */
export function MediaBackground({
  coverImage,
  videoUrl,
  vibelogId,
  title,
  isActive = false,
  className = '',
  isPlaying = false,
}: MediaBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Skip expired OpenAI URLs entirely
  const validCoverImage = coverImage && !isExpiredOpenAIUrl(coverImage) ? coverImage : null;

  // Generate unique gradient based on vibelog ID (only used as fallback)
  const gradientStyle = vibelogId ? getGradientStyle(vibelogId) : undefined;

  // SEO-optimized alt text
  const altText = title ? `${title} - vibelog cover image` : 'Vibelog cover image';

  // Reset errors when URLs change
  useEffect(() => {
    setVideoError(false);
    setImageError(false);
  }, [videoUrl, coverImage]);

  // Control video playback based on isPlaying prop
  useEffect(() => {
    if (!videoRef.current || !videoUrl || videoError) {
      return;
    }

    if (isPlaying) {
      videoRef.current.play().catch(err => {
        console.error('Video play failed:', err);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, videoUrl, videoError]);

  const hasVideo = videoUrl && !videoError;
  const hasImage = validCoverImage && !imageError;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Video background (if available and active) */}
      {hasVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          src={videoUrl}
          autoPlay={isActive && !isPlaying} // Only autoplay on hover if not manually playing
          loop
          muted
          playsInline
          preload="metadata" // Load first frame on mobile
          poster={validCoverImage || undefined} // Use cover image as poster
          onLoadedData={() => setIsLoaded(true)}
          onLoadedMetadata={() => setIsLoaded(true)} // Also show on metadata load
          onError={() => setVideoError(true)}
        />
      )}

      {/* Image background (fallback or primary) */}
      {hasImage && (!hasVideo || videoError) && (
        <div className="relative h-full w-full">
          <Image
            src={validCoverImage}
            alt={altText}
            fill
            className={`object-cover transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            quality={85}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImageError(true)}
            priority={false}
          />
        </div>
      )}

      {/* Gradient background (fallback if no media) */}
      {!hasImage && !hasVideo && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              gradientStyle ||
              'linear-gradient(to bottom right, hsl(240, 60%, 45%), hsl(280, 55%, 50%))',
          }}
        />
      )}

      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-card/80 via-card/60 to-card/40" />
      )}
    </div>
  );
}
