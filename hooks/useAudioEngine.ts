import { useRef, useEffect, useState, useCallback } from "react";

import { AudioEngine } from "@/components/mic/AudioEngine";
import { RecordingState } from "@/components/mic/Controls";
import { AudioEngineCallbacks } from "@/types/micRecorder";

export interface UseAudioEngineReturn {
  audioEngine: AudioEngine | null;
  hasPermission: boolean | null;
  audioLevels: number[];
  audioBlob: Blob | null;
  duration: number;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  resetAudioEngine: () => void;
}

export function useAudioEngine(
  onError: (error: string) => void,
  onProcessingStart: () => void
): UseAudioEngineReturn {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array.from({ length: 15 }, () => 0.1)
  );
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const levelsRef = useRef<number[]>(Array.from({ length: 15 }, () => 0.1));

  // Store callbacks in refs to avoid dependency issues
  const onErrorRef = useRef(onError);
  const onProcessingStartRef = useRef(onProcessingStart);

  // Update refs when callbacks change
  useEffect(() => {
    onErrorRef.current = onError;
    onProcessingStartRef.current = onProcessingStart;
  }, [onError, onProcessingStart]);

  // Memoize callback functions with stable dependencies
  const onErrorCallback = useCallback((error: string) => {
    onErrorRef.current(error);
  }, []);

  const onProcessingStartCallback = useCallback(() => {
    onProcessingStartRef.current();
  }, []);

  const onLevelsUpdateCallback = useCallback((levels: number[]) => {
    levelsRef.current = levels;
    setAudioLevels([...levels]); // Create new array reference to trigger re-render
  }, []);

  const onDataAvailableCallback = useCallback((blob: Blob, duration: number) => {
    setDuration(duration);
    setAudioBlob(blob);

    // Start processing animation now that audio blob is available
    setTimeout(() => {
      onProcessingStartCallback();
    }, 100);
  }, [onProcessingStartCallback]);

  // Initialize AudioEngine
  useEffect(() => {
    const callbacks: AudioEngineCallbacks = {
      onPermissionChange: setHasPermission,
      onLevelsUpdate: onLevelsUpdateCallback,
      onDataAvailable: onDataAvailableCallback,
      onError: onErrorCallback
    };

    audioEngineRef.current = new AudioEngine(callbacks);

    return () => {
      audioEngineRef.current?.cleanup();
    };
  }, []);

  const startRecording = async (): Promise<boolean> => {
    if (!audioEngineRef.current) {return false;}
    
    const success = await audioEngineRef.current.startRecording();
    if (success) {
      // Reset previous audio data
      setAudioBlob(null);
      setDuration(0);
    }
    return success;
  };

  const stopRecording = () => {
    if (!audioEngineRef.current) {return;}
    audioEngineRef.current.stopRecordingAndRelease();
  };

  const resetAudioEngine = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.cleanup();
    }
    setAudioBlob(null);
    setDuration(0);
    setAudioLevels(Array.from({ length: 15 }, () => 0.1));
  };

  return {
    audioEngine: audioEngineRef.current,
    hasPermission,
    audioLevels: levelsRef.current,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    resetAudioEngine,
  };
}