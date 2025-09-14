import { useRef, useEffect, useState } from "react";

// Extend Window interface for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface UseAudioPlaybackReturn {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackLevels: number[];
  audioUrl: string | null;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  formatTime: (seconds: number) => string;
}

export function useAudioPlayback(audioBlob: Blob | null): UseAudioPlaybackReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackLevels, setPlaybackLevels] = useState<number[]>(
    Array.from({ length: 15 }, () => 0.15)
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const playbackLevelsRef = useRef<number[]>(Array.from({ length: 15 }, () => 0.15));

  // Playback audio visualization
  useEffect(() => {
    if (isPlaying && playbackAnalyserRef.current) {
      const analyser = playbackAnalyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const loop = () => {
        if (!isPlaying) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Map frequency data to playback bars (same logic as recording)
        const newLevels = [...playbackLevelsRef.current];
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
          let normalized = (average / 255) * 2.5; // Slightly less aggressive for playback
          normalized = Math.pow(normalized, 0.6);
          normalized = Math.max(0.1, Math.min(1, normalized));
          
          // Smooth transition
          newLevels[i] += (normalized - newLevels[i]) * 0.5;
        }

        playbackLevelsRef.current = newLevels;
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
      playbackLevelsRef.current = fadeLevel;
      setPlaybackLevels(fadeLevel);
    }
    
    return () => {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
      }
    };
  }, [isPlaying]);

  // Create audio URL from blob
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Force load metadata to get real duration
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load(); // Force reload
        }
      }, 100);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  const play = async () => {
    if (!audioRef.current) return;
    
    try {
      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  const seek = (time: number) => {
    if (!audioRef.current || !duration || isNaN(duration) || duration <= 0) {
      return;
    }
    
    // Ensure seekTime is valid and finite
    if (isFinite(time) && time >= 0 && time <= duration) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio event handlers
  const handleLoadedMetadata = () => {
    const dur = audioRef.current?.duration;
    if (audioRef.current && dur && !isNaN(dur) && isFinite(dur) && dur > 0 && dur !== Infinity) {
      setDuration(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => setIsPlaying(false);

  const handlePlay = () => {
    setIsPlaying(true);
    // Start playback visualization
    if (!playbackAnalyserRef.current && audioRef.current) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audioRef.current);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        playbackContextRef.current = audioContext;
        playbackAnalyserRef.current = analyser;
      } catch (error) {
        console.error('Error creating playback analyser:', error);
      }
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }
  };

  return {
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
  };
}