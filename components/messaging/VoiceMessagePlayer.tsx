'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

import { cn } from '@/lib/utils';
import { formatAudioDuration } from '@/types/messaging';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number; // milliseconds
  transcript?: string | null;
  isCurrentUser: boolean;
}

export function VoiceMessagePlayer({
  audioUrl,
  duration,
  transcript,
  isCurrentUser,
}: VoiceMessagePlayerProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration / 1000); // Convert ms to seconds
  const audioRef = useRef<HTMLAudioElement>(null);

  // Update time as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      // Use actual duration from audio if available, otherwise use prop
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error('Audio error:', e, 'Audio URL:', audioUrl);
      setIsPlaying(false);
    };
    const handleCanPlay = () => {
      // Audio is ready to play
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl]);

  // Apply playback speed when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle play/pause - uses local audio element directly
  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        // Reset to start if at the end (handle NaN/Infinity duration gracefully)
        const dur = audio.duration;
        if (isFinite(dur) && dur > 0 && audio.currentTime >= dur - 0.1) {
          audio.currentTime = 0;
        }
        await audio.play();
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      // Try to recover by resetting
      audio.currentTime = 0;
      try {
        await audio.play();
      } catch (retryError) {
        console.error('Audio retry failed:', retryError);
      }
    }
  }, [isPlaying]);

  // Cycle playback speed
  const handleSpeedChange = useCallback(() => {
    const speeds: Array<1 | 1.5 | 2> = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  }, [playbackSpeed]);

  // Calculate progress percentage
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="mb-2 space-y-3">
      {/* Premium Voice message player */}
      <div className="flex items-center gap-3">
        {/* Premium Play/Pause button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayPause}
          className={cn(
            'group relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full',
            'shadow-md transition-all duration-300',
            isCurrentUser
              ? 'bg-white/20 text-white shadow-white/10 hover:bg-white/30 hover:shadow-lg hover:shadow-white/20'
              : 'bg-metallic-blue-500/20 text-metallic-blue-600 shadow-metallic-blue-500/20 hover:bg-metallic-blue-500/30 hover:shadow-lg hover:shadow-metallic-blue-500/30 dark:text-metallic-blue-400'
          )}
        >
          {/* Ripple effect on click */}
          {isPlaying && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn(
                'absolute inset-0 rounded-full',
                isCurrentUser ? 'bg-white' : 'bg-metallic-blue-500'
              )}
            />
          )}

          <motion.div
            animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="relative"
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </motion.div>
        </motion.button>

        {/* Premium Waveform / Progress bar */}
        <div className="min-w-0 flex-1">
          <div className="relative flex h-10 items-center">
            {/* Background track with glow */}
            <div
              className={cn(
                'absolute inset-0 h-1.5 rounded-full',
                isCurrentUser
                  ? 'bg-white/15 shadow-inner'
                  : 'bg-metallic-blue-500/15 shadow-inner dark:bg-metallic-blue-500/20'
              )}
            />

            {/* Progress fill with gradient */}
            <motion.div
              className={cn(
                'absolute h-1.5 rounded-full',
                isCurrentUser
                  ? 'bg-gradient-to-r from-white to-white/80 shadow-sm shadow-white/50'
                  : 'bg-gradient-to-r from-metallic-blue-500 to-metallic-blue-400 shadow-sm shadow-metallic-blue-500/50'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />

            {/* Premium Playhead dot with glow */}
            {progress > 0 && (
              <motion.div
                className="absolute -ml-2"
                style={{ left: `${progress}%` }}
                whileHover={{ scale: 1.3 }}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-full shadow-lg',
                    isCurrentUser
                      ? 'bg-white shadow-white/50'
                      : 'bg-metallic-blue-500 shadow-metallic-blue-500/50'
                  )}
                />
                {/* Glow effect */}
                <div
                  className={cn(
                    'absolute inset-0 rounded-full blur-sm',
                    isCurrentUser ? 'bg-white opacity-50' : 'bg-metallic-blue-500 opacity-50'
                  )}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Duration with better typography */}
        <div
          className={cn(
            'min-w-[45px] text-right font-mono text-xs font-semibold tabular-nums',
            isCurrentUser ? 'text-white/80' : 'text-zinc-600 dark:text-zinc-400'
          )}
        >
          {isPlaying || currentTime > 0
            ? formatAudioDuration(currentTime * 1000)
            : formatAudioDuration(duration)}
        </div>

        {/* Premium Playback speed button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSpeedChange}
          className={cn(
            'relative overflow-hidden rounded-full px-2.5 py-1.5 text-xs font-bold',
            'shadow-sm transition-all duration-300',
            isCurrentUser
              ? 'bg-white/20 text-white shadow-white/10 hover:bg-white/30 hover:shadow-md hover:shadow-white/20'
              : 'bg-metallic-blue-500/20 text-metallic-blue-600 shadow-metallic-blue-500/20 hover:bg-metallic-blue-500/30 hover:shadow-md hover:shadow-metallic-blue-500/30 dark:text-metallic-blue-400'
          )}
        >
          <span className="relative">{playbackSpeed}x</span>
        </motion.button>
      </div>

      {/* Premium Transcript toggle (if available) */}
      {transcript && (
        <div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTranscript(!showTranscript)}
            className={cn(
              'group flex items-center gap-1.5 text-xs font-semibold underline decoration-dotted underline-offset-2 transition-all',
              isCurrentUser
                ? 'text-white/70 hover:text-white'
                : 'text-metallic-blue-600 hover:text-metallic-blue-500 dark:text-metallic-blue-400 dark:hover:text-metallic-blue-300'
            )}
          >
            <motion.svg
              animate={{ rotate: showTranscript ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </motion.button>

          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                  'mt-3 overflow-hidden rounded-2xl border p-3 text-sm leading-relaxed backdrop-blur-sm',
                  isCurrentUser
                    ? 'border-white/20 bg-white/10 text-white/90'
                    : 'border-metallic-blue-500/20 bg-metallic-blue-500/10 text-zinc-700 dark:border-metallic-blue-500/30 dark:bg-metallic-blue-500/10 dark:text-zinc-300'
                )}
              >
                {transcript}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Audio element for playback control - crossOrigin for Supabase storage */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
    </div>
  );
}
