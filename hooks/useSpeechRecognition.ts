import { useEffect, useRef, useState } from 'react';

import { RecordingState } from '@/components/mic/Controls';
import { useI18n } from '@/components/providers/I18nProvider';

// Extend Window interface for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export interface UseSpeechRecognitionReturn {
  liveTranscript: string;
  isSupported: boolean;
  resetTranscript: () => void;
  updateTranscript: (newTranscript: string) => void;
}

export interface UseSpeechRecognitionOptions {
  recordingState: RecordingState;
  /** Is user currently in edit mode (editing transcript) */
  isEditMode?: boolean;
}

export function useSpeechRecognition(
  options: RecordingState | UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  const { t } = useI18n();
  const [liveTranscript, setLiveTranscript] = useState('');
  const speechRecognitionRef = useRef<any>(null);

  // Parse options (backwards compatible)
  const recordingState = typeof options === 'string' ? options : options.recordingState;
  const isEditMode = typeof options === 'object' ? options.isEditMode : false;

  // Track user edits separately from speech recognition
  const userEditedTranscriptRef = useRef<string | null>(null);
  const isUserEditingRef = useRef(false);

  // Check if Speech Recognition is supported
  const isSupported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Real-time speech recognition with better browser support
  useEffect(() => {
    if (recordingState === 'recording') {
      // Check for Speech Recognition API support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 1;

          let finalTranscript = '';
          let isBlocked = false; // Track if browser blocked the feature

          recognition.onstart = () => {
            // Speech recognition started
            setLiveTranscript(t('components.micRecorder.listening'));
          };

          recognition.onresult = (event: any) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }

            // If user has edited transcript, use their version as base
            const baseTranscript = userEditedTranscriptRef.current || finalTranscript;

            // Combine with interim results
            const currentTranscript = (baseTranscript + interimTranscript).trim();

            // Only update if user is not currently editing
            if (currentTranscript && !isUserEditingRef.current) {
              setLiveTranscript(currentTranscript);
            }
          };

          recognition.onerror = (event: any) => {
            // Speech recognition error

            // Handle different error types - but DON'T retry for blocked cases
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              isBlocked = true;
              setLiveTranscript(t('components.micRecorder.recordingBlockedByBrowser'));
            } else if (event.error === 'network') {
              isBlocked = true;
              setLiveTranscript(t('components.micRecorder.recordingBlockedByBrowser'));
            } else if (event.error === 'no-speech') {
              setLiveTranscript(t('components.micRecorder.speakLouder'));
              // Only retry for no-speech, not for blocked cases
              if (!isBlocked) {
                setTimeout(() => {
                  if (
                    recordingState === 'recording' &&
                    speechRecognitionRef.current &&
                    !isBlocked
                  ) {
                    try {
                      speechRecognitionRef.current.start();
                    } catch {
                      // Could not restart after no-speech
                      setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
                    }
                  }
                }, 3000); // Only retry after longer pause for no-speech
              }
            } else if (event.error === 'aborted') {
              if (!isBlocked) {
                setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
              }
            } else {
              setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
            }
          };

          recognition.onend = () => {
            // Speech recognition ended
            // DON'T restart if blocked - just leave it in a stable state
            if (isBlocked) {
              setLiveTranscript(t('components.micRecorder.recordingBlockedByBrowser'));
              return;
            }

            // Only restart for normal end events, not blocked ones
            if (recordingState === 'recording' && speechRecognitionRef.current && !isBlocked) {
              setTimeout(() => {
                try {
                  if (
                    recordingState === 'recording' &&
                    speechRecognitionRef.current &&
                    !isBlocked
                  ) {
                    speechRecognitionRef.current.start();
                  }
                } catch {
                  // Could not restart recognition
                  setLiveTranscript(t('components.micRecorder.recordingUnavailable'));
                }
              }, 1000);
            }
          };

          speechRecognitionRef.current = recognition;
          recognition.start();
        } catch {
          // Speech recognition initialization error
          setLiveTranscript('Recording...\n(live transcript unavailable)');
        }
      } else {
        // Fallback for browsers without Speech Recognition (like Brave in strict mode)
        // Speech Recognition API not available
        setLiveTranscript(t('components.micRecorder.recordingNotSupported'));
      }
    } else {
      // Stop recognition when not recording
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // Error stopping recognition
        }
        speechRecognitionRef.current = null;
      }
      if (recordingState === 'idle') {
        setLiveTranscript('');
      }
    }

    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // Cleanup recognition error
        }
        speechRecognitionRef.current = null;
      }
    };
  }, [recordingState, t]);

  // Track edit mode state changes
  useEffect(() => {
    isUserEditingRef.current = isEditMode || false;
  }, [isEditMode]);

  const resetTranscript = () => {
    setLiveTranscript('');
    userEditedTranscriptRef.current = null;
    isUserEditingRef.current = false;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // Error stopping recognition
      }
      speechRecognitionRef.current = null;
    }
  };

  /**
   * Manually update the transcript (called when user edits during silence)
   */
  const updateTranscript = (newTranscript: string) => {
    userEditedTranscriptRef.current = newTranscript;
    setLiveTranscript(newTranscript);
  };

  return {
    liveTranscript,
    isSupported,
    resetTranscript,
    updateTranscript,
  };
}
