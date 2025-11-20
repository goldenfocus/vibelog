/**
 * useVibe Hook
 * 
 * React hook for accessing vibe detection and state management
 */

import { useState, useCallback } from 'react';

import type {
  VibeAnalysis,
  UserVibeState,
  VibePacket,
  AnalyzeVibeRequest,
} from '@/lib/vibe/types';

interface UseVibeOptions {
  userId?: string;
  autoUpdate?: boolean;
}

export function useVibe(options: UseVibeOptions = {}) {
  const [currentVibe, setCurrentVibe] = useState<VibeAnalysis | null>(null);
  const [vibeState, setVibeState] = useState<UserVibeState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze text for vibe
   */
  const analyzeText = useCallback(async (text: string, context?: AnalyzeVibeRequest['context']) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/vibe/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to analyze vibe');
      }

      const data = await response.json();
      const analysis = data.data.vibe;

      setCurrentVibe(analysis);

      // Auto-update state if userId provided
      if (options.userId && options.autoUpdate) {
        await updateVibeState(text);
      }

      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [options.userId, options.autoUpdate]);

  /**
   * Get current vibe state
   */
  const getVibeState = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/vibe/state?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to get vibe state');
      }

      const data = await response.json();
      const state = data.data.state;

      setVibeState(state);
      return state;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Update vibe state
   */
  const updateVibeState = useCallback(async (
    text?: string,
    settings?: Partial<UserVibeState['osSettings']>,
    thresholds?: Partial<UserVibeState['vibeThresholds']>
  ) => {
    if (!options.userId) {
      throw new Error('userId required for updating vibe state');
    }

    try {
      const response = await fetch('/api/vibe/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: options.userId,
          text,
          settings,
          thresholds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update vibe state');
      }

      const data = await response.json();
      const state = data.data.state;

      setVibeState(state);
      return state;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, [options.userId]);

  /**
   * Send vibe packet
   */
  const sendVibePacket = useCallback(async (
    text: string,
    recipientId?: string,
    packetOptions?: {
      expiresIn?: number;
      context?: { previousMessages?: string[] };
    }
  ) => {
    if (!options.userId) {
      throw new Error('userId required for sending vibe packet');
    }

    try {
      const response = await fetch('/api/vibe/packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packet: {
            text,
            senderId: options.userId,
            expiresIn: packetOptions?.expiresIn,
            context: packetOptions?.context,
          },
          recipientId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send vibe packet');
      }

      const data = await response.json();
      return data.data.packet as VibePacket;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, [options.userId]);

  return {
    currentVibe,
    vibeState,
    isAnalyzing,
    error,
    analyzeText,
    getVibeState,
    updateVibeState,
    sendVibePacket,
  };
}

