'use client';

/**
 * Video Player Component
 * Simple HTML5 video player for displaying AI-generated videos
 * Includes iOS Safari thumbnail fix via media fragment and preload
 */

import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  poster?: string; // Optional poster image (cover image)
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export function VideoPlayer({
  videoUrl,
  poster,
  className = '',
  autoPlay = false,
  muted = false,
  loop = false,
}: VideoPlayerProps) {
  // Add media fragment #t=0.001 to force iOS Safari to display first frame
  // This is a widely-used workaround for mobile Safari's video thumbnail limitation
  const videoSrc = videoUrl.includes('#t=') ? videoUrl : `${videoUrl}#t=0.001`;

  return (
    <div className={`relative w-full ${className}`}>
      <video
        src={videoSrc}
        poster={poster} // Use custom poster if available (higher quality thumbnail)
        preload="metadata" // Critical for iOS Safari to show thumbnail
        controls
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        className="w-full rounded-lg shadow-lg"
        playsInline
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
