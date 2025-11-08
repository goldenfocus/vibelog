'use client';

import { Play, Pause, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import Waveform from '@/components/mic/Waveform';
import { useAudioPlayerStore } from '@/state/audio-player-store';

export default function GlobalAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackLevels,
    audioElement,
    setAudioElement,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setPlaybackLevels,
    reset,
    play,
    pause,
    seek,
  } = useAudioPlayerStore();

  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const mediaSourceCreatedRef = useRef<boolean>(false);

  // Initialize audio element once
  useEffect(() => {
    if (audioElement) {
      return; // Already initialized
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous'; // Enable CORS for Web Audio API
    // Set initial volume from store
    const currentVolume = useAudioPlayerStore.getState().volume;
    audio.volume = currentVolume;

    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      const dur = audio.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
        setDuration(dur);
      }
    });

    audio.addEventListener('canplay', () => {
      const dur = audio.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
        setDuration(dur);
      }
    });

    audio.addEventListener('durationchange', () => {
      const dur = audio.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
        setDuration(dur);
      }
    });

    audio.addEventListener('loadeddata', () => {
      const dur = audio.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
        setDuration(dur);
      }
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
      // Start playback visualization - create AudioContext ONCE per audio element
      if (!mediaSourceCreatedRef.current && audio) {
        try {
          const audioContext = new (window.AudioContext ||
            (window as typeof window & { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext!)();
          const source = audioContext.createMediaElementSource(audio);
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyser.connect(audioContext.destination);

          playbackContextRef.current = audioContext;
          playbackAnalyserRef.current = analyser;
          mediaSourceCreatedRef.current = true; // Mark as created to prevent recreation
        } catch (error) {
          console.error('Error creating playback analyser:', error);
        }
      }
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
    });

    audio.addEventListener('error', e => {
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
      setIsPlaying(false);
    });

    setAudioElement(audio);

    return () => {
      // Don't clean up the audio element here - it's managed by the store
      // Just clean up visualization
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
      }
      if (playbackContextRef.current) {
        try {
          playbackContextRef.current.close();
        } catch {
          // Ignore errors when closing context
        }
      }
      mediaSourceCreatedRef.current = false;
    };
  }, [audioElement, setAudioElement, setIsPlaying, setCurrentTime, setDuration]);

  // Set audio to full volume (100%)
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = 1.0;
    }
  }, [audioElement]);

  // Update audio source when track changes
  useEffect(() => {
    if (!audioElement || !currentTrack) {
      // Clear source if no track
      if (audioElement && !currentTrack) {
        audioElement.pause();
        audioElement.removeAttribute('src'); // Remove src attribute instead of setting to empty string
        setCurrentTime(0);
        setDuration(0);
      }
      return;
    }

    // Compare URLs properly (blob URLs need special handling)
    // Use getAttribute to check if src is actually set (not the default page URL)
    const currentSrcAttr = audioElement.getAttribute('src');
    const currentSrc = currentSrcAttr || '';
    const newSrc = currentTrack.url;

    // Extract just the URL part (remove origin for blob URLs)
    const normalizeUrl = (url: string) => {
      if (!url) {
        return '';
      }
      try {
        if (url.startsWith('blob:')) {
          return url;
        }
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search + urlObj.hash;
      } catch {
        return url;
      }
    };

    // If URL changed, update the source
    if (normalizeUrl(currentSrc) !== normalizeUrl(newSrc)) {
      // Stop animation frame if playing
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }

      // Don't close AudioContext - it's reused for all tracks
      // Just update the audio source
      audioElement.src = currentTrack.url;
      audioElement.load();
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentTrack, audioElement, setCurrentTime, setDuration]);

  // Playback audio visualization
  useEffect(() => {
    if (isPlaying && playbackAnalyserRef.current) {
      const analyser = playbackAnalyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const loop = () => {
        if (!isPlaying) {
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        // Map frequency data to playback bars
        const newLevels = Array.from({ length: 15 }, () => 0.15);
        const bars = 15;

        for (let i = 0; i < bars; i++) {
          const minFreq = 0;
          const maxFreq = bufferLength * 0.7;
          const freq = minFreq + (maxFreq - minFreq) * Math.pow(i / (bars - 1), 1.5);

          const start = Math.floor(freq);
          const end = Math.min(start + Math.floor(bufferLength / bars) + 1, bufferLength);
          let sum = 0;
          let count = 0;

          for (let j = start; j < end && j < bufferLength; j++) {
            sum += dataArray[j];
            count++;
          }

          const average = count > 0 ? sum / count : 0;
          let normalized = (average / 255) * 2.5;
          normalized = Math.pow(normalized, 0.6);
          normalized = Math.max(0.1, Math.min(1, normalized));

          // Smooth transition
          newLevels[i] += (normalized - newLevels[i]) * 0.5;
        }

        setPlaybackLevels([...newLevels]);
        playbackRafRef.current = requestAnimationFrame(loop);
      };

      playbackRafRef.current = requestAnimationFrame(loop);
    } else if (!isPlaying) {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      // Fade to minimum when not playing
      const fadeLevel = Array.from({ length: 15 }, () => 0.1);
      setPlaybackLevels(fadeLevel);
    }

    return () => {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
      }
    };
  }, [isPlaying, setPlaybackLevels]);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds === Infinity) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!currentTrack) {
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      try {
        await play();
      } catch (error) {
        console.error('Playback failed:', error);
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

    if (isFinite(seekTime) && seekTime >= 0 && seekTime <= duration) {
      seek(seekTime);
    }
  };

  const handleClose = () => {
    reset();
  };

  // Don't render if no track is set
  if (!currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-card/95 shadow-2xl backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              {currentTrack.title && (
                <p className="font-medium text-foreground">{currentTrack.title}</p>
              )}
              {currentTrack.author && (
                <p className="text-sm text-muted-foreground">{currentTrack.author}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-electric text-white transition-all duration-200 hover:shadow-[0_10px_20px_rgba(97,144,255,0.3)] ${
              isLoading ? 'cursor-wait opacity-70' : ''
            }`}
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
                  width: `${
                    duration && !isNaN(duration) && duration > 0
                      ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
                      : 0
                  }%`,
                }}
              >
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
      </div>
    </div>
  );
}
