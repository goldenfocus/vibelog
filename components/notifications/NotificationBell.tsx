'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase';

/**
 * PERFORMANCE FIX: Singleton Supabase client
 *
 * Previously, createClient() was called inside the component body, creating a new
 * client instance on every render. This caused the useEffect to fire repeatedly
 * because the dependency array included the supabase reference which changed each time.
 *
 * By moving it to module scope, we create it once and reuse across all renders,
 * preventing the cascade of subscription setups and API calls.
 */
const supabase = createClient();

/**
 * NotificationBell - Real-time notification badge with unread count
 *
 * This component:
 * 1. Fetches initial unread notification count on mount
 * 2. Subscribes to Supabase Realtime for live updates
 * 3. Automatically updates the badge when notifications are added/read
 *
 * Performance optimizations:
 * - Singleton Supabase client (module-level, not per-render)
 * - useRef guard to prevent duplicate subscriptions in React StrictMode
 * - Unique channel name per user to avoid conflicts
 * - Proper cleanup on unmount with mounted flag
 */
export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * PERFORMANCE FIX: Prevent duplicate subscription setup
   *
   * React 18 StrictMode intentionally double-mounts components in development
   * to help find bugs. Without this guard, we'd create two Supabase subscriptions.
   * The ref persists across the double-mount cycle, preventing duplicate setup.
   */
  const subscriptionSetup = useRef(false);

  useEffect(() => {
    // Guard: Skip if already setting up (prevents StrictMode double-subscription)
    if (subscriptionSetup.current) return;
    subscriptionSetup.current = true;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true; // Track if component is still mounted for async safety

    const initialize = async () => {
      // Get current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Exit early if no user or component unmounted during async call
      if (!user || !mounted) return;

      // Fetch initial unread notification count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      // Only update state if still mounted
      if (mounted) {
        setUnreadCount(count || 0);
      }

      /**
       * Setup Supabase Realtime subscription
       *
       * Channel name includes user ID to ensure uniqueness across sessions.
       * This prevents channel name conflicts if multiple users are logged in
       * or if the component remounts.
       *
       * We listen for:
       * - INSERT: New notification → increment count
       * - UPDATE: Notification marked as read → decrement count
       */
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // New notification received - increment badge count
            if (mounted) setUnreadCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          payload => {
            // Notification marked as read - decrement badge count
            // Only decrement if it was actually marked as read (not other updates)
            if (mounted && payload.new.is_read && !payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    };

    initialize();

    /**
     * Cleanup function
     *
     * - Sets mounted=false to prevent state updates after unmount
     * - Resets subscriptionSetup ref so remount can setup again
     * - Removes Supabase channel to prevent memory leaks and ghost listeners
     */
    return () => {
      mounted = false;
      subscriptionSetup.current = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty deps: setup once on mount only

  return (
    <Link
      href="/notifications"
      className="relative block rounded-full p-2 transition-all hover:scale-105 hover:bg-electric/10 active:scale-95"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      {/* Bell icon - filled slightly when there are unread notifications */}
      <Bell
        className="h-6 w-6 text-foreground transition-colors hover:text-electric"
        fill={unreadCount > 0 ? 'currentColor' : 'none'}
        fillOpacity={unreadCount > 0 ? '0.2' : '0'}
      />

      {/* Unread count badge - only shown when count > 0 */}
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-electric text-xs font-bold text-white shadow-lg duration-200 animate-in zoom-in-50">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
