'use client';

import { Volume2, Play, Pause } from 'lucide-react';
import React, { useEffect } from 'react';

import Waveform from '@/components/mic/Waveform';
import { useI18n } from '@/components/providers/I18nProvider';
import { UseAudioPlaybackReturn } from '@/hooks/useAudioPlayback';
import { useAudioPlayerStore } from '@/state/audio-player-store';

interface AudioPlayerProps {
  audioBlob: Blob | null;
  playback: UseAudioPlaybackReturn;
}

export default function AudioPlayer({ audioBlob, playback }: AudioPlayerProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = React.useState(false);
  const [buttonPressed, setButtonPressed] = React.useState(false);
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackLevels,
    audioUrl,
    play,
    pause,
    seek,
    formatTime,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleEnded,
    handlePlay,
    handlePause,
  } = playback;

  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    currentTime: globalCurrentTime,
    duration: globalDuration,
    playbackLevels: globalPlaybackLevels,
    play: globalPlay,
    pause: globalPause,
    seek: globalSeek,
    setTrack,
  } = useAudioPlayerStore();

  // Create blob URL and sync with global store
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setBlobUrl(url);

      // Set track in global store
      setTrack({
        id: `recording-${Date.now()}`,
        url,
        title: t('components.micRecorder.yourRecording'),
        type: 'blob',
      });

      return () => {
        URL.revokeObjectURL(url);
        // Only reset if this is the current track
        const current = useAudioPlayerStore.getState().currentTrack;
        if (current?.url === url) {
          setTrack(null);
        }
      };
    } else {
      setBlobUrl(null);
      return undefined;
    }
  }, [audioBlob, setTrack, t]);

  // Sync playback state with global store
  const isUsingGlobalPlayer = currentTrack?.url === blobUrl;
  const displayIsPlaying = isUsingGlobalPlayer ? globalIsPlaying : isPlaying;
  const displayCurrentTime = isUsingGlobalPlayer ? globalCurrentTime : currentTime;
  const displayDuration = isUsingGlobalPlayer ? globalDuration : duration;
  const displayPlaybackLevels = isUsingGlobalPlayer ? globalPlaybackLevels : playbackLevels;

  const handlePlayPause = async () => {
    // Immediate visual feedback
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 150);

    if (isUsingGlobalPlayer) {
      // Use global player
      if (globalIsPlaying) {
        globalPause();
      } else {
        setIsLoading(true);
        try {
          await globalPlay();
        } catch (error) {
          console.error('Playback failed:', error);
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      // Use local player
      if (isPlaying) {
        pause();
      } else {
        setIsLoading(true);
        try {
          await play();
        } catch (error) {
          console.error('Playback failed:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const displayDur = displayDuration;
    if (!displayDur || isNaN(displayDur) || displayDur <= 0) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = (clickX / rect.width) * displayDur;

    // Ensure seekTime is valid and finite
    if (isFinite(seekTime) && seekTime >= 0 && seekTime <= displayDur) {
      if (isUsingGlobalPlayer) {
        globalSeek(seekTime);
      } else {
        seek(seekTime);
      }
    }
  };

  if (!audioBlob) {
    return null;
  }

  return (
    <div className="mb-8 rounded-2xl border border-border/30 bg-card/50 p-6 backdrop-blur-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Volume2 className="h-5 w-5" />
        {t('components.micRecorder.yourRecording')}
      </h3>
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-electric text-white transition-all duration-200 hover:shadow-[0_10px_20px_rgba(97,144,255,0.3)] ${
            buttonPressed ? 'scale-95' : 'scale-100'
          } ${isLoading ? 'cursor-wait opacity-70' : ''}`}
        >
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : displayIsPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="ml-1 h-6 w-6" />
          )}
        </button>

        <div className="flex flex-1 items-center gap-3">
          <span className="min-w-[40px] font-mono text-sm text-muted-foreground">
            {formatTime(displayCurrentTime)}
          </span>

          <div
            onClick={handleSeekClick}
            className="group relative h-2 flex-1 cursor-pointer rounded-full bg-muted/30"
          >
            <div
              className="relative h-full rounded-full bg-gradient-electric transition-all duration-75"
              style={{
                width: `${displayDuration && !isNaN(displayDuration) && displayDuration > 0 ? Math.max(0, Math.min(100, (displayCurrentTime / displayDuration) * 100)) : 0}%`,
              }}
            >
              {/* Always visible scrubber dot */}
              <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1.5 transform rounded-full border-2 border-electric bg-white shadow-sm transition-all duration-150 group-hover:h-4 group-hover:w-4" />
            </div>
          </div>

          <span className="min-w-[40px] text-right font-mono text-sm text-muted-foreground">
            {formatTime(displayDuration)}
          </span>
        </div>
      </div>

      {/* Playback Equalizer */}
      {displayIsPlaying && (
        <Waveform levels={displayPlaybackLevels} isActive={displayIsPlaying} variant="playback" />
      )}

      {/* Show indicator if playing in global player */}
      {isUsingGlobalPlayer && globalIsPlaying && (
        <div className="mt-2 text-xs text-muted-foreground">
          {t('components.micRecorder.playingInGlobalPlayer') || 'Playing in global player'}
        </div>
      )}

      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onLoadedData={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={e => {
          const audioElement = e.target as HTMLAudioElement;
          const error = audioElement.error;

          console.error('Audio playback error:', {
            src: audioElement.src,
            errorCode: error?.code,
            errorMessage: error?.message,
            networkState: audioElement.networkState,
            readyState: audioElement.readyState,
            event: e,
          });
        }}
        className="hidden"
      />
    </div>
  );
}
