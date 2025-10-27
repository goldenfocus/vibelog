import { useEffect, useRef, useState } from 'react';

export interface UseVoiceActivityDetectionOptions {
  /** Audio levels array (0-1) from AudioEngine */
  audioLevels: number[];
  /** Is currently recording */
  isRecording: boolean;
  /** Silence threshold (0-1), below this is considered silence */
  silenceThreshold?: number;
  /** How long silence must persist before edit mode (ms) */
  silenceDebounceMs?: number;
  /** How long voice must persist to exit edit mode (ms) */
  voiceDebounceMs?: number;
}

export interface UseVoiceActivityDetectionReturn {
  /** Is there currently voice activity (above threshold) */
  hasVoiceActivity: boolean;
  /** Is it currently silent (below threshold) */
  isSilent: boolean;
  /** Can user edit transcript now (silent for debounce period) */
  canEdit: boolean;
  /** How long has it been silent (ms) */
  silenceDuration: number;
}

const DEFAULT_SILENCE_THRESHOLD = 0.2; // 20% of max volume
const DEFAULT_SILENCE_DEBOUNCE = 2000; // 2 seconds
const DEFAULT_VOICE_DEBOUNCE = 500; // 0.5 seconds

/**
 * Voice Activity Detection Hook
 *
 * Monitors audio levels to detect silence and enable transcript editing
 * during natural pauses in speech.
 */
export function useVoiceActivityDetection({
  audioLevels,
  isRecording,
  silenceThreshold = DEFAULT_SILENCE_THRESHOLD,
  silenceDebounceMs = DEFAULT_SILENCE_DEBOUNCE,
  voiceDebounceMs = DEFAULT_VOICE_DEBOUNCE,
}: UseVoiceActivityDetectionOptions): UseVoiceActivityDetectionReturn {
  const [hasVoiceActivity, setHasVoiceActivity] = useState(false);
  const [isSilent, setIsSilent] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(0);

  const silenceStartTimeRef = useRef<number | null>(null);
  const voiceStartTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording) {
      // Reset all state when not recording
      setHasVoiceActivity(false);
      setIsSilent(false);
      setCanEdit(false);
      setSilenceDuration(0);
      silenceStartTimeRef.current = null;
      voiceStartTimeRef.current = null;
      return;
    }

    // Monitor audio levels and detect voice activity
    const checkVoiceActivity = () => {
      if (!isRecording) {
        return;
      }

      // Calculate average audio level across all frequencies
      const avgLevel = audioLevels.reduce((sum, level) => sum + level, 0) / audioLevels.length;

      // Determine if there's voice activity
      const hasVoice = avgLevel > silenceThreshold;

      if (hasVoice) {
        // Voice detected
        if (!voiceStartTimeRef.current) {
          voiceStartTimeRef.current = Date.now();
        }

        const voiceDuration = Date.now() - voiceStartTimeRef.current;

        // Exit edit mode after voice debounce period
        if (voiceDuration >= voiceDebounceMs) {
          setHasVoiceActivity(true);
          setIsSilent(false);
          setCanEdit(false);
          setSilenceDuration(0);
          silenceStartTimeRef.current = null;
        }
      } else {
        // Silence detected
        if (!silenceStartTimeRef.current) {
          silenceStartTimeRef.current = Date.now();
        }

        const currentSilenceDuration = Date.now() - silenceStartTimeRef.current;
        setSilenceDuration(currentSilenceDuration);

        // Enter edit mode after silence debounce period
        if (currentSilenceDuration >= silenceDebounceMs) {
          setHasVoiceActivity(false);
          setIsSilent(true);
          setCanEdit(true);
        }

        voiceStartTimeRef.current = null;
      }

      rafRef.current = requestAnimationFrame(checkVoiceActivity);
    };

    rafRef.current = requestAnimationFrame(checkVoiceActivity);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [audioLevels, isRecording, silenceThreshold, silenceDebounceMs, voiceDebounceMs]);

  return {
    hasVoiceActivity,
    isSilent,
    canEdit,
    silenceDuration,
  };
}
