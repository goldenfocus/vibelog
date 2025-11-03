'use client';

import { create } from 'zustand';

export interface AudioTrack {
  id: string; // Unique identifier for the track
  url: string; // Audio URL (can be blob URL or remote URL)
  title?: string; // Optional title for display
  author?: string; // Optional author name
  type: 'blob' | 'url' | 'tts'; // Type of audio source
}

interface AudioPlayerState {
  // Current track being played
  currentTrack: AudioTrack | null;

  // Playback state
  isPlaying: boolean;
  isLoading: boolean;

  // Playback progress
  currentTime: number;
  duration: number;

  // Audio element ref (shared across all pages)
  audioElement: HTMLAudioElement | null;

  // Visualizer levels
  playbackLevels: number[];

  // Volume (0-1, default 1.0)
  volume: number;

  // Actions
  setTrack: (track: AudioTrack | null) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackLevels: (levels: number[]) => void;
  setVolume: (volume: number) => void;
  reset: () => void;
}

const initialState = {
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  audioElement: null,
  playbackLevels: Array.from({ length: 15 }, () => 0.15),
  volume: 1.0, // Default to 100% volume
};

export const useAudioPlayerStore = create<AudioPlayerState>(set => ({
  ...initialState,

  setTrack: track => {
    set({ currentTrack: track });
    // If switching tracks, reset playback state
    if (track) {
      set({ currentTime: 0, duration: 0 });
    }
  },

  play: async () => {
    const state = useAudioPlayerStore.getState();
    if (!state.audioElement || !state.currentTrack) {
      return;
    }

    try {
      set({ isLoading: true });

      // Ensure audio is loaded
      if (state.audioElement.readyState < 3) {
        state.audioElement.load();
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000);
          state.audioElement!.addEventListener(
            'canplaythrough',
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true }
          );
          state.audioElement!.addEventListener(
            'error',
            e => {
              clearTimeout(timeout);
              reject(e);
            },
            { once: true }
          );
        });
      }

      await state.audioElement.play();
      set({ isPlaying: true, isLoading: false });
    } catch (error) {
      console.error('Error playing audio:', error);
      set({ isPlaying: false, isLoading: false });
      throw error;
    }
  },

  pause: () => {
    const state = useAudioPlayerStore.getState();
    if (state.audioElement) {
      state.audioElement.pause();
    }
    set({ isPlaying: false });
  },

  seek: time => {
    const state = useAudioPlayerStore.getState();
    if (!state.audioElement || !state.duration || isNaN(state.duration) || state.duration <= 0) {
      return;
    }

    if (isFinite(time) && time >= 0 && time <= state.duration) {
      state.audioElement.currentTime = time;
      set({ currentTime: time });
    }
  },

  setAudioElement: element => {
    set({ audioElement: element });
  },

  setIsPlaying: playing => {
    set({ isPlaying: playing });
  },

  setIsLoading: loading => {
    set({ isLoading: loading });
  },

  setCurrentTime: time => {
    set({ currentTime: time });
  },

  setDuration: duration => {
    set({ duration: duration });
  },

  setPlaybackLevels: levels => {
    set({ playbackLevels: levels });
  },

  setVolume: volume => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    set({ volume: clampedVolume });
    // Apply volume to audio element immediately
    const state = useAudioPlayerStore.getState();
    if (state.audioElement) {
      state.audioElement.volume = clampedVolume;
    }
  },

  reset: () => {
    const state = useAudioPlayerStore.getState();
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement.currentTime = 0;
    }
    set({
      ...initialState,
      audioElement: state.audioElement, // Keep the element reference
    });
  },
}));
