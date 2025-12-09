'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase';

/**
 * Singleton Supabase client - prevents re-creation on every render
 */
const supabase = createClient();

/**
 * MessagesBadge - Real-time unread message count badge
 *
 * Similar to NotificationBell, this component:
 * 1. Fetches initial unread message count from conversations
 * 2. Subscribes to Supabase Realtime for new messages
 * 3. Auto-updates the badge when messages arrive or are read
 */
export default function MessagesBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionSetup = useRef(false);

  useEffect(() => {
    if (subscriptionSetup.current) {
      return;
    }
    subscriptionSetup.current = true;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        return;
      }

      // Fetch initial unread count from conversations API
      try {
        const response = await fetch('/api/conversations');
        if (response.ok && mounted) {
          const data = await response.json();
          const totalUnread =
            data.conversations?.reduce(
              (sum: number, conv: { unread_count?: number }) => sum + (conv.unread_count || 0),
              0
            ) || 0;
          setUnreadCount(totalUnread);
        }
      } catch {
        // Silently fail - badge is not critical
      }

      // Subscribe to new messages for real-time updates
      channel = supabase
        .channel(`messages-badge:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async payload => {
            // Only increment if message is from someone else
            if (mounted && payload.new.sender_id !== user.id) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_reads',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Message marked as read - decrement count
            if (mounted) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    };

    initialize();

    return () => {
      mounted = false;
      subscriptionSetup.current = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <Link
      href="/messages"
      className="relative hidden items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted lg:flex"
      title="Messages"
      aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <MessageCircle
        className="h-5 w-5 transition-colors"
        fill={unreadCount > 0 ? 'currentColor' : 'none'}
        fillOpacity={unreadCount > 0 ? '0.2' : '0'}
      />

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-electric text-xs font-bold text-white shadow-lg duration-200 animate-in zoom-in-50">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
