import { useState, useRef, useEffect } from 'react';

import { useAudioPlayerStore } from '@/state/audio-player-store';

export interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  playText: (
    text: string,
    voice?: string,
    vibelogId?: string,
    voiceCloneId?: string,
    title?: string,
    author?: string
  ) => Promise<void>;
  stop: () => void;
  progress: number;
  duration: number;
}

export function useTextToSpeech(
  onUpgradePrompt?: (message: string, benefits: string[]) => void,
  onEnded?: () => void
): UseTextToSpeechReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioUrlRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);

  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    currentTime,
    duration,
    setTrack,
    play,
    pause,
  } = useAudioPlayerStore();

  // Check if our TTS track is the active track
  const isTTSTrack = trackIdRef.current && currentTrack?.id === trackIdRef.current;
  const isPlaying = isTTSTrack ? globalIsPlaying : false;
  const progress = isTTSTrack && duration > 0 ? (currentTime / duration) * 100 : 0;

  const cleanup = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    trackIdRef.current = null;
  };

  // Monitor when track ends and call onEnded callback
  useEffect(() => {
    if (
      isTTSTrack &&
      !globalIsPlaying &&
      currentTime > 0 &&
      duration > 0 &&
      currentTime >= duration - 0.5
    ) {
      if (onEnded) {
        onEnded();
      }
    }
  }, [isTTSTrack, globalIsPlaying, currentTime, duration, onEnded]);

  const playText = async (
    text: string,
    voice = 'shimmer',
    vibelogId?: string,
    voiceCloneId?: string,
    title?: string,
    author?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Clean up any existing audio URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      // Generate TTS audio (pass vibelogId and voiceCloneId so it can use cloned voice)
      console.log('🎵 [USE-TTS] Calling /api/text-to-speech with:', {
        voice,
        vibelogId,
        voiceCloneId,
        hasVoiceCloneId: !!voiceCloneId,
        textLength: text.length,
        title,
        author,
      });

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice, vibelogId, voiceCloneId }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          try {
            const errorData = await response.json();
            if (errorData.upgrade && onUpgradePrompt) {
              onUpgradePrompt(
                errorData.message || 'TTS limit reached. Sign in to get more requests!',
                errorData.upgrade.benefits || []
              );
              return;
            }
          } catch {
            // Fall through to generic error handling
          }
        }

        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to generate speech' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Create audio blob and URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      // Create unique track ID for this TTS audio
      const trackId = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      trackIdRef.current = trackId;

      // Set track in global player
      setTrack({
        id: trackId,
        url: audioUrl,
        title: title || 'Text-to-Speech',
        author: author || voice,
        type: 'tts',
      });

      // Small delay to ensure track is set
      await new Promise(resolve => setTimeout(resolve, 50));

      // Start playing via global player
      await play();
    } catch (error) {
      console.error('TTS playback error:', error);
      setError(error instanceof Error ? error.message : 'Failed to play speech');
    } finally {
      setIsLoading(false);
    }
  };

  const stop = () => {
    if (isTTSTrack) {
      pause();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    playText,
    stop,
    progress,
    duration: isTTSTrack ? duration : 0,
  };
}
