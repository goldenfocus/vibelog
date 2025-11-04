import { useState, useCallback } from 'react';

export interface UseVoiceCloningReturn {
  isCloning: boolean;
  error: string | null;
  cloneVoice: (
    audioBlob: Blob,
    vibelogId?: string,
    voiceName?: string
  ) => Promise<{ voiceId: string; userId?: string } | null>;
}

export interface UseVoiceCloningOptions {
  onUpgradePrompt?: (message: string, benefits: string[]) => void;
}

/**
 * Hook for cloning a user's voice from their recording
 *
 * @example
 * ```tsx
 * const { isCloning, error, cloneVoice } = useVoiceCloning({
 *   onUpgradePrompt: (message, benefits) => {
 *     // Show upgrade prompt
 *   }
 * });
 *
 * const handleCloneVoice = async () => {
 *   const voiceId = await cloneVoice(audioBlob, vibelogId, 'My Voice');
 *   if (voiceId) {
 *     console.log('Voice cloned:', voiceId);
 *   }
 * };
 * ```
 */
export function useVoiceCloning(options?: UseVoiceCloningOptions): UseVoiceCloningReturn {
  const { onUpgradePrompt } = options || {};
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cloneVoice = useCallback(
    async (
      audioBlob: Blob,
      vibelogId?: string,
      voiceName?: string
    ): Promise<{ voiceId: string; userId?: string } | null> => {
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

        // Get response text first to handle both JSON and text errors
        const responseText = await response.text();
        let errorData: {
          message?: string;
          error?: string | { message?: string };
          details?: string;
        } | null = null;
        let data: { voiceId?: string; userId?: string } | null = null;

        try {
          if (!response.ok) {
            errorData = JSON.parse(responseText);
          } else {
            data = JSON.parse(responseText);
          }
        } catch {
          // If response is not JSON, use text as error message
          if (!response.ok) {
            throw new Error(
              `Voice cloning failed (${response.status}): ${responseText.substring(0, 200)}`
            );
          }
          throw new Error('Invalid response from voice cloning service');
        }

        if (!response.ok) {
          // Extract error message from various possible formats
          let errorMessage = 'Failed to clone voice. Please try again.';
          if (errorData) {
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage =
                typeof errorData.error === 'string'
                  ? errorData.error
                  : errorData.error.message || errorMessage;
            } else if (errorData.details) {
              errorMessage =
                typeof errorData.details === 'string' ? errorData.details : errorMessage;
            }
          }

          // Check if this is an upgrade prompt error
          if (
            (response.status === 400 || response.status === 429) &&
            errorData &&
            typeof errorData === 'object' &&
            'upgrade' in errorData &&
            onUpgradePrompt
          ) {
            const upgradeData = errorData as {
              upgrade?: { benefits?: string[] };
              message?: string;
            };
            onUpgradePrompt(
              errorMessage,
              upgradeData.upgrade?.benefits || [
                'Create unlimited custom voices',
                'Access to premium voice cloning features',
                'Higher quality voice synthesis',
                'Priority support',
              ]
            );
            return null;
          }

          console.error('❌ [VOICE-CLONE] API error:', {
            status: response.status,
            errorData,
            responseText: responseText.substring(0, 500),
          });

          throw new Error(errorMessage);
        }

        if (!data || !data.voiceId) {
          console.error('❌ [VOICE-CLONE] No voiceId in response:', data);
          throw new Error('No voice ID returned from cloning service.');
        }

        console.log('✅ [VOICE-CLONE] Successfully cloned voice:', data.voiceId);

        // Return both voiceId and server-verified userId
        return {
          voiceId: data.voiceId,
          userId: data.userId || undefined,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to clone voice';
        setError(errorMessage);
        console.error('❌ [VOICE-CLONE] Hook error:', err);
        return null;
      } finally {
        setIsCloning(false);
      }
    },
    [onUpgradePrompt]
  );

  return {
    isCloning,
    error,
    cloneVoice,
  };
}
