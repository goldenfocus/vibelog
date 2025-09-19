"use client";

import { Volume2, Play, Pause } from "lucide-react";
import React from "react";

import Waveform from "@/components/mic/Waveform";
import { useI18n } from "@/components/providers/I18nProvider";
import { UseAudioPlaybackReturn } from "@/hooks/useAudioPlayback";

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
  } = playback as UseAudioPlaybackReturn & {
    handleLoadedMetadata: () => void;
    handleTimeUpdate: () => void;
    handleEnded: () => void;
    handlePlay: () => void;
    handlePause: () => void;
  };

  const handlePlayPause = async () => {
    // Immediate visual feedback
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 150);

    if (isPlaying) {
      pause();
    } else {
      setIsLoading(true);
      try {
        // For mobile: ensure user interaction context is preserved
        if (audioRef.current) {
          // Force load and play in same user gesture
          audioRef.current.load();
          await audioRef.current.play();
        } else {
          await play();
        }
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

  if (!audioBlob) {return null;}

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 mb-8">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Volume2 className="w-5 h-5" />
        {t('components.micRecorder.yourRecording')}
      </h3>
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className={`flex items-center justify-center w-12 h-12 bg-gradient-electric text-white rounded-full hover:shadow-[0_10px_20px_rgba(97,144,255,0.3)] transition-all duration-200 ${
            buttonPressed ? 'scale-95' : 'scale-100'
          } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>
        
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-mono min-w-[40px]">
            {formatTime(currentTime)}
          </span>
          
          <div 
            onClick={handleSeekClick}
            className="flex-1 h-2 bg-muted/30 rounded-full cursor-pointer group relative"
          >
            <div
              className="h-full bg-gradient-electric rounded-full transition-all duration-75 relative"
              style={{ width: `${(duration && !isNaN(duration) && duration > 0) ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0}%` }}
            >
              {/* Always visible scrubber dot */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-electric rounded-full shadow-sm transform translate-x-1.5 transition-all duration-150 group-hover:w-4 group-hover:h-4" />
            </div>
          </div>
          
          <span className="text-sm text-muted-foreground font-mono min-w-[40px] text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>
      
      {/* Playback Equalizer */}
      {isPlaying && (
        <Waveform 
          levels={playbackLevels}
          isActive={isPlaying}
          variant="playback"
        />
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
        onError={(e) => console.error('Audio error:', e)}
        className="hidden"
      />
    </div>
  );
}