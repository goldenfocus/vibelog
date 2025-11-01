import { useState, useRef, useEffect } from 'react';

export interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  playText: (text: string, voice?: string, vibelogId?: string) => Promise<void>;
  stop: () => void;
  progress: number;
  duration: number;
}

export function useTextToSpeech(
  onUpgradePrompt?: (message: string, benefits: string[]) => void,
  onEnded?: () => void
): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('timeupdate', updateProgress);
      audioRef.current.removeEventListener('ended', handleEnded);
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const updateProgress = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      if (duration > 0) {
        setProgress((currentTime / duration) * 100);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    setTimeout(() => setProgress(0), 500); // Reset progress after a brief delay
    if (onEnded) {
      onEnded();
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const playText = async (
    text: string,
    voice = 'shimmer',
    vibelogId?: string,
    voiceCloneId?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      // Clean up any existing audio
      cleanup();

      // Generate TTS audio (pass vibelogId and voiceCloneId so it can use cloned voice)
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

      // Create and configure audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);

      // Start playing
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('TTS playback error:', error);
      setError(error instanceof Error ? error.message : 'Failed to play speech');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setProgress(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    playText,
    stop,
    progress,
    duration,
  };
}
