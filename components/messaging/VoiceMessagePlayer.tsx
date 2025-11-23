'use client';

import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { useState, useRef } from 'react';

import { cn } from '@/lib/utils';
import { useAudioPlayerStore } from '@/state/audio-player-store';
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
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    currentTime: globalCurrentTime,
    duration: globalDuration,
    play: globalPlay,
    pause: globalPause,
    setTrack,
  } = useAudioPlayerStore();

  // Check if this is the current track
  const isCurrentTrack = currentTrack?.url === audioUrl;
  const isPlaying = isCurrentTrack && globalIsPlaying;
  const currentTime = isCurrentTrack ? globalCurrentTime : 0;
  const totalDuration = isCurrentTrack ? globalDuration : duration / 1000; // Convert ms to seconds

  // Handle play/pause
  const handlePlayPause = async () => {
    if (isCurrentTrack) {
      if (globalIsPlaying) {
        globalPause();
      } else {
        await globalPlay();
      }
    } else {
      // Set this as the current track
      setTrack({
        id: `voice-message-${audioUrl}`,
        url: audioUrl,
        title: 'Voice Message',
        type: 'url',
      });
      // Play will happen automatically via the global audio player
    }
  };

  // Cycle playback speed
  const handleSpeedChange = () => {
    const speeds: Array<1 | 1.5 | 2> = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    // Apply speed to audio element if playing
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Calculate progress percentage
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="mb-2 space-y-2">
      {/* Voice message player */}
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayPause}
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
            'transition-colors duration-200',
            isCurrentUser
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-metallic-blue-500/20 text-metallic-blue-600 hover:bg-metallic-blue-500/30 dark:text-metallic-blue-400'
          )}
        >
          {isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </motion.button>

        {/* Waveform / Progress bar */}
        <div className="min-w-0 flex-1">
          <div className="relative flex h-8 items-center">
            {/* Background track */}
            <div
              className={cn(
                'absolute inset-0 h-1 rounded-full',
                isCurrentUser ? 'bg-white/20' : 'bg-metallic-blue-500/20'
              )}
            />

            {/* Progress fill */}
            <motion.div
              className={cn(
                'absolute h-1 rounded-full',
                isCurrentUser ? 'bg-white' : 'bg-metallic-blue-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />

            {/* Playhead dot */}
            {progress > 0 && (
              <motion.div
                className={cn(
                  'absolute -ml-1.5 h-3 w-3 rounded-full',
                  isCurrentUser ? 'bg-white' : 'bg-metallic-blue-500'
                )}
                style={{ left: `${progress}%` }}
              />
            )}
          </div>
        </div>

        {/* Duration */}
        <div className={cn('font-mono text-xs', isCurrentUser ? 'text-white/70' : 'text-zinc-500')}>
          {isPlaying || currentTime > 0
            ? formatAudioDuration(currentTime * 1000)
            : formatAudioDuration(duration)}
        </div>

        {/* Playback speed */}
        <button
          onClick={handleSpeedChange}
          className={cn(
            'rounded-full px-2 py-1 text-xs font-medium',
            'transition-colors duration-200',
            isCurrentUser
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-metallic-blue-500/20 text-metallic-blue-600 hover:bg-metallic-blue-500/30 dark:text-metallic-blue-400'
          )}
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Transcript toggle (if available) */}
      {transcript && (
        <div>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={cn(
              'text-xs underline',
              isCurrentUser ? 'text-white/70 hover:text-white' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </button>

          {showTranscript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                'mt-2 rounded-lg p-3 text-sm',
                isCurrentUser
                  ? 'bg-white/10 text-white/90'
                  : 'bg-metallic-blue-500/10 text-zinc-700 dark:text-zinc-300'
              )}
            >
              {transcript}
            </motion.div>
          )}
        </div>
      )}

      {/* Hidden audio element for playback control */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />
    </div>
  );
}
