'use client';

/**
 * Video Player Component
 * Simple HTML5 video player for displaying AI-generated videos
 */

import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export function VideoPlayer({
  videoUrl,
  className = '',
  autoPlay = false,
  muted = false,
  loop = false,
}: VideoPlayerProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <video
        src={videoUrl}
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
