import { useState, useCallback } from 'react';

export interface UseVoiceCloningReturn {
  isCloning: boolean;
  error: string | null;
  cloneVoice: (audioBlob: Blob, vibelogId?: string, voiceName?: string) => Promise<string | null>;
}

/**
 * Hook for cloning a user's voice from their recording
 *
 * @example
 * ```tsx
 * const { isCloning, error, cloneVoice } = useVoiceCloning();
 *
 * const handleCloneVoice = async () => {
 *   const voiceId = await cloneVoice(audioBlob, vibelogId, 'My Voice');
 *   if (voiceId) {
 *     console.log('Voice cloned:', voiceId);
 *   }
 * };
 * ```
 */
export function useVoiceCloning(): UseVoiceCloningReturn {
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cloneVoice = useCallback(
    async (audioBlob: Blob, vibelogId?: string, voiceName?: string): Promise<string | null> => {
      try {
        setIsCloning(true);
        setError(null);

        // Create FormData for the API
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        if (vibelogId) {
          formData.append('vibelogId', vibelogId);
        }
        if (voiceName) {
          formData.append('voiceName', voiceName);
        }

        const response = await fetch('/api/clone-voice', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'Failed to clone voice',
          }));
          throw new Error(errorData.error || errorData.message || 'Failed to clone voice');
        }

        const data = await response.json();
        return data.voiceId || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to clone voice';
        setError(errorMessage);
        console.error('Voice cloning error:', err);
        return null;
      } finally {
        setIsCloning(false);
      }
    },
    []
  );

  return {
    isCloning,
    error,
    cloneVoice,
  };
}
