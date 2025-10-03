'use client';

import { Volume2, Play, Pause } from 'lucide-react';
import React from 'react';

import Waveform from '@/components/mic/Waveform';
import { useI18n } from '@/components/providers/I18nProvider';
import { UseAudioPlaybackReturn } from '@/hooks/useAudioPlayback';

interface AudioPlayerProps {
  audioBlob: Blob | null;
  playback: UseAudioPlaybackReturn;
}

export default function AudioPlayer({ audioBlob, playback }: AudioPlayerProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = React.useState(false);
  const [buttonPressed, setButtonPressed] = React.useState(false);

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

  const handlePlayPause = async () => {
    // Immediate visual feedback
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 150);

    if (isPlaying) {
      // Always use the pause function from the hook
      pause();
    } else {
      setIsLoading(true);
      try {
        // Always use the play function from the hook
        await play();
      } catch (error) {
        console.error('Playback failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || isNaN(duration) || duration <= 0) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = (clickX / rect.width) * duration;

    // Ensure seekTime is valid and finite
    if (isFinite(seekTime) && seekTime >= 0 && seekTime <= duration) {
      seek(seekTime);
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
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="ml-1 h-6 w-6" />
          )}
        </button>

        <div className="flex flex-1 items-center gap-3">
          <span className="min-w-[40px] font-mono text-sm text-muted-foreground">
            {formatTime(currentTime)}
          </span>

          <div
            onClick={handleSeekClick}
            className="group relative h-2 flex-1 cursor-pointer rounded-full bg-muted/30"
          >
            <div
              className="relative h-full rounded-full bg-gradient-electric transition-all duration-75"
              style={{
                width: `${duration && !isNaN(duration) && duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0}%`,
              }}
            >
              {/* Always visible scrubber dot */}
              <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1.5 transform rounded-full border-2 border-electric bg-white shadow-sm transition-all duration-150 group-hover:h-4 group-hover:w-4" />
            </div>
          </div>

          <span className="min-w-[40px] text-right font-mono text-sm text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Playback Equalizer */}
      {isPlaying && <Waveform levels={playbackLevels} isActive={isPlaying} variant="playback" />}

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
        onError={e => console.error('Audio error:', e)}
        className="hidden"
      />
    </div>
  );
}
