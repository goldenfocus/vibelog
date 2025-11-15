'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useAudioPlayerStore } from '@/state/audio-player-store';

interface AutoPlayOptions {
  vibelogId?: string;
  audioUrl?: string | null;
  title?: string | null;
  author?: string | null;
  enabled?: boolean;
}

/**
 * Attempts to auto-play the vibelog's original audio when a detail page loads.
 * Gracefully degrades if the browser blocks autoplay by surfacing a subtle toast.
 */
export function useAutoPlayVibelogAudio({
  vibelogId,
  audioUrl,
  title,
  author,
  enabled = true,
}: AutoPlayOptions) {
  const { currentTrack, setTrack, play } = useAudioPlayerStore();
  const hasAttemptedRef = useRef(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasAttemptedRef.current || !audioUrl || !vibelogId) {
      return;
    }

    hasAttemptedRef.current = true;

    const attemptAutoplay = async () => {
      try {
        const desiredTrackId = `vibelog-${vibelogId}`;
        if (currentTrack?.id !== desiredTrackId) {
          setTrack({
            id: desiredTrackId,
            url: audioUrl,
            title: title || 'Vibe',
            author: author || undefined,
            type: 'url',
          });
          // Give the global audio element a tiny moment to swap sources
          await new Promise(resolve => setTimeout(resolve, 120));
        }

        await play();
      } catch (error) {
        // Browsers often block autoplay without user interaction.
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          toast.info('Tap play to hear this vibe');
        }
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useAutoPlayVibelogAudio] Autoplay blocked:', error);
        }
      }
    };

    attemptAutoplay();
  }, [audioUrl, author, currentTrack?.id, enabled, play, setTrack, title, vibelogId]);
}
