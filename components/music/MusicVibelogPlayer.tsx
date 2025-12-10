'use client';

/**
 * Music Vibelog Player Component
 *
 * Immersive player for music vibelogs with:
 * - Full-width album art background (blurred)
 * - Centered cover image
 * - Play/pause, seek, volume controls
 * - Lyrics/content display below
 *
 * For music videos, shows video player instead.
 */

import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Music } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface MusicVibelogPlayerProps {
  title: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
  coverImageUrl?: string | null;
  mediaType: 'music' | 'music_video' | 'voice';
  content?: string;
  transcript?: string;
  authorName?: string;
  authorAvatar?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MusicVibelogPlayer({
  title,
  audioUrl,
  videoUrl,
  coverImageUrl,
  mediaType,
  content,
  transcript,
  authorName,
}: MusicVibelogPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const isVideoMode = mediaType === 'music_video' && videoUrl;
  const mediaElement = isVideoMode ? videoRef.current : audioRef.current;

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!mediaElement) {
      return;
    }

    if (isPlaying) {
      mediaElement.pause();
    } else {
      mediaElement.play();
    }
  }, [mediaElement, isPlaying]);

  // Handle seek
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!mediaElement) {
        return;
      }
      const time = parseFloat(e.target.value);
      mediaElement.currentTime = time;
      setCurrentTime(time);
    },
    [mediaElement]
  );

  // Handle volume
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!mediaElement) {
        return;
      }
      const vol = parseFloat(e.target.value);
      mediaElement.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    },
    [mediaElement]
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!mediaElement) {
      return;
    }
    mediaElement.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [mediaElement, isMuted]);

  // Skip forward/backward
  const skip = useCallback(
    (seconds: number) => {
      if (!mediaElement) {
        return;
      }
      mediaElement.currentTime = Math.max(
        0,
        Math.min(duration, mediaElement.currentTime + seconds)
      );
    },
    [mediaElement, duration]
  );

  // Media event handlers
  useEffect(() => {
    const element = isVideoMode ? videoRef.current : audioRef.current;
    if (!element) {
      return;
    }

    const handleLoadedMetadata = () => {
      setDuration(element.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(element.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    element.addEventListener('loadedmetadata', handleLoadedMetadata);
    element.addEventListener('timeupdate', handleTimeUpdate);
    element.addEventListener('play', handlePlay);
    element.addEventListener('pause', handlePause);
    element.addEventListener('ended', handleEnded);

    return () => {
      element.removeEventListener('loadedmetadata', handleLoadedMetadata);
      element.removeEventListener('timeupdate', handleTimeUpdate);
      element.removeEventListener('play', handlePlay);
      element.removeEventListener('pause', handlePause);
      element.removeEventListener('ended', handleEnded);
    };
  }, [isVideoMode]);

  // Video mode - simpler player
  if (isVideoMode && videoUrl) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="aspect-video w-full"
          poster={coverImageUrl || undefined}
          preload="metadata"
        />

        {/* Content below video */}
        {(content || transcript) && (
          <div className="bg-card p-6">
            <h2 className="mb-4 text-xl font-bold">{title}</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {content && (
                <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
              )}
              {transcript && !content && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Lyrics</h3>
                  <p className="whitespace-pre-wrap">{transcript}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Audio mode - immersive player
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background blur */}
      {coverImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl"
          style={{ backgroundImage: `url(${coverImageUrl})` }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      {/* Content */}
      <div className="relative z-10 p-8">
        {/* Album art and info */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Cover image */}
          <div className="relative aspect-square w-48 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl sm:w-56">
            {coverImageUrl ? (
              <img src={coverImageUrl} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <Music className="h-16 w-16 text-white/80" />
              </div>
            )}

            {/* Play overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                {isPlaying ? (
                  <Pause className="h-8 w-8 text-gray-900" />
                ) : (
                  <Play className="ml-1 h-8 w-8 text-gray-900" />
                )}
              </div>
            </button>
          </div>

          {/* Track info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
            {authorName && <p className="text-lg text-white/70">{authorName}</p>}

            {/* Audio element (hidden) */}
            <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />

            {/* Controls */}
            <div className="mt-6 space-y-4">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <span className="w-12 text-right text-sm text-white/70">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/30 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  disabled={!isLoaded}
                />
                <span className="w-12 text-sm text-white/70">{formatTime(duration)}</span>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-center gap-4 sm:justify-start">
                <button
                  onClick={() => skip(-10)}
                  className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Rewind 10 seconds"
                >
                  <SkipBack className="h-5 w-5" />
                </button>

                <button
                  onClick={togglePlay}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg transition-transform hover:scale-105"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
                </button>

                <button
                  onClick={() => skip(10)}
                  className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Forward 10 seconds"
                >
                  <SkipForward className="h-5 w-5" />
                </button>

                {/* Volume */}
                <div className="ml-4 flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/30 sm:block [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lyrics/Content section */}
        {(content || transcript) && (
          <div className="mt-8 rounded-xl bg-black/30 p-6 backdrop-blur-sm">
            {transcript && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
                  Lyrics
                </h3>
                <p className="whitespace-pre-wrap text-white/90">{transcript}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Export a badge component for cards
export function MusicBadge({ mediaType }: { mediaType: string }) {
  if (mediaType !== 'music' && mediaType !== 'music_video') {
    return null;
  }

  return (
    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
      <Music className="h-3 w-3" />
      <span>{mediaType === 'music_video' ? 'Video' : 'Music'}</span>
    </div>
  );
}
