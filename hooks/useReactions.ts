/**
 * useReactions Hook - Universal Reaction System
 *
 * Works with any content type: comments, vibelogs, chat messages, media, etc.
 *
 * @example
 * ```tsx
 * const { reactions, addReaction, toggleReaction } = useReactions({
 *   type: 'comment',
 *   id: commentId,
 *   realtime: true
 * });
 * ```
 */

'use client';

import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase';
import type {
  ReactionState,
  UseReactionsReturn,
  UseReactionsOptions,
  ReactionRealtimePayload,
} from '@/types/reactions';

export function useReactions(options: UseReactionsOptions): UseReactionsReturn {
  const {
    type,
    id,
    realtime = false,
    enabled = true,
    onReactionAdded,
    onReactionRemoved,
  } = options;

  const { user } = useAuth();
  const supabase = createClient();

  // State
  const [reactions, setReactions] = useState<ReactionState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Real-time channel ref
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch reactions from database
  const fetchReactions = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('reactions_summary')
        .select('*')
        .eq('reactable_type', type)
        .eq('reactable_id', id);

      if (fetchError) {
        throw fetchError;
      }

      // Transform to ReactionState
      const reactionStates: ReactionState[] = (data || []).map(r => ({
        emoji: r.emoji,
        count: r.count,
        user_ids: r.user_ids || [],
        user_reacted: user ? (r.user_ids || []).includes(user.id) : false,
      }));

      setReactions(reactionStates);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch reactions');
      setError(error);
      console.error('Error fetching reactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, type, id, user, enabled]);

  // Add reaction
  const addReaction = useCallback(
    async (emoji: string) => {
      if (!user) {
        toast.error('Please sign in to react');
        return;
      }

      // Optimistic update
      setReactions(prev => {
        const existing = prev.find(r => r.emoji === emoji);
        if (existing) {
          return prev.map(r =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count + 1,
                  user_ids: [...r.user_ids, user.id],
                  user_reacted: true,
                }
              : r
          );
        } else {
          return [...prev, { emoji, count: 1, user_ids: [user.id], user_reacted: true }];
        }
      });

      try {
        const { error: insertError } = await supabase.from('reactions').insert({
          reactable_type: type,
          reactable_id: id,
          user_id: user.id,
          emoji,
        });

        if (insertError) {
          throw insertError;
        }

        onReactionAdded?.(emoji);
      } catch (err) {
        console.error('Error adding reaction:', err);
        toast.error('Failed to add reaction');
        // Revert optimistic update
        fetchReactions();
      }
    },
    [supabase, type, id, user, fetchReactions, onReactionAdded]
  );

  // Remove reaction
  const removeReaction = useCallback(
    async (emoji: string) => {
      if (!user) {
        return;
      }

      // Optimistic update
      setReactions(prev =>
        prev
          .map(r =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count - 1,
                  user_ids: r.user_ids.filter(uid => uid !== user.id),
                  user_reacted: false,
                }
              : r
          )
          .filter(r => r.count > 0)
      );

      try {
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('reactable_type', type)
          .eq('reactable_id', id)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (deleteError) {
          throw deleteError;
        }

        onReactionRemoved?.(emoji);
      } catch (err) {
        console.error('Error removing reaction:', err);
        toast.error('Failed to remove reaction');
        // Revert optimistic update
        fetchReactions();
      }
    },
    [supabase, type, id, user, fetchReactions, onReactionRemoved]
  );

  // Toggle reaction (add if not exists, remove if exists)
  const toggleReaction = useCallback(
    async (emoji: string) => {
      const hasReacted = reactions.find(r => r.emoji === emoji)?.user_reacted;
      if (hasReacted) {
        await removeReaction(emoji);
      } else {
        await addReaction(emoji);
      }
    },
    [reactions, addReaction, removeReaction]
  );

  // Subscribe to real-time updates
  const subscribe = useCallback(() => {
    if (isSubscribed || channelRef.current) {
      return;
    }

    const channel = supabase
      .channel(`reactions:${type}:${id}`)
      .on<ReactionRealtimePayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `reactable_type=eq.${type}&reactable_id=eq.${id}`,
        },
        payload => {
          console.log('Reaction update:', payload);
          // Refetch to get accurate counts
          fetchReactions();
        }
      )
      .subscribe();

    channelRef.current = channel;
    setIsSubscribed(true);
  }, [supabase, type, id, fetchReactions]);

  // Unsubscribe from real-time updates
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
      setIsSubscribed(false);
    }
  }, []);

  // Utility: Check if user reacted with emoji
  const hasUserReacted = useCallback(
    (emoji: string) => {
      return reactions.find(r => r.emoji === emoji)?.user_reacted || false;
    },
    [reactions]
  );

  // Utility: Get count for specific emoji
  const getReactionCount = useCallback(
    (emoji: string) => {
      return reactions.find(r => r.emoji === emoji)?.count || 0;
    },
    [reactions]
  );

  // Utility: Get users who reacted with emoji
  const getUsersWhoReacted = useCallback(
    (emoji: string) => {
      return reactions.find(r => r.emoji === emoji)?.user_ids || [];
    },
    [reactions]
  );

  // Initial fetch
  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Auto-subscribe if realtime enabled
  useEffect(() => {
    if (realtime && enabled) {
      subscribe();
    }

    return () => {
      if (realtime) {
        unsubscribe();
      }
    };
  }, [realtime, enabled, subscribe, unsubscribe]);

  // Derived state
  const userReactions = reactions.filter(r => r.user_reacted).map(r => r.emoji);
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  return {
    reactions,
    isLoading,
    error,
    userReactions,
    totalCount,
    addReaction,
    removeReaction,
    toggleReaction,
    subscribe,
    unsubscribe,
    isSubscribed,
    hasUserReacted,
    getReactionCount,
    getUsersWhoReacted,
  };
}
