'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Channel, ChannelSummary } from '@/lib/channels/types';

interface UseChannelsReturn {
  // Data
  channels: ChannelSummary[];
  defaultChannel: ChannelSummary | null;
  selectedChannelId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  selectChannel: (channelId: string | null) => void;
  refreshChannels: () => Promise<void>;
}

interface MyChannelsResponse {
  channels: Channel[];
  default_channel_id: string | null;
  total: number;
}

/**
 * Hook for managing user's channels in the recording/posting flow
 *
 * Fetches the current user's channels and provides selection functionality.
 * Used primarily in MicRecorder for choosing which channel to post to.
 */
export function useChannels(userId?: string): UseChannelsReturn {
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's channels
  const fetchChannels = useCallback(async () => {
    // Don't fetch if no userId - avoids unnecessary 401 errors in console
    if (!userId) {
      setChannels([]);
      setDefaultChannelId(null);
      setSelectedChannelId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/channels/me');

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - this is expected for anonymous users
          setChannels([]);
          setDefaultChannelId(null);
          return;
        }
        throw new Error(`Failed to fetch channels: ${response.status}`);
      }

      const data: MyChannelsResponse = await response.json();

      // Convert to ChannelSummary format
      const summaries: ChannelSummary[] = data.channels.map(channel => ({
        id: channel.id,
        handle: channel.handle,
        name: channel.name,
        avatar_url: channel.avatar_url,
        subscriber_count: channel.subscriber_count,
        vibelog_count: channel.vibelog_count,
        is_default: channel.is_default,
      }));

      setChannels(summaries);
      setDefaultChannelId(data.default_channel_id);

      // Auto-select default channel if none selected
      setSelectedChannelId(prevSelected => {
        if (!prevSelected && data.default_channel_id) {
          return data.default_channel_id;
        }
        return prevSelected;
      });
    } catch (err) {
      console.error('[useChannels] Error fetching channels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch channels on mount and when userId changes
  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  // Get default channel object
  const defaultChannel = channels.find(c => c.id === defaultChannelId) || null;

  // Select a channel
  const selectChannel = useCallback((channelId: string | null) => {
    setSelectedChannelId(channelId);
  }, []);

  return {
    channels,
    defaultChannel,
    selectedChannelId,
    isLoading,
    error,
    selectChannel,
    refreshChannels: fetchChannels,
  };
}
