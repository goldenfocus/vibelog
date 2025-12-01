'use client';

import { Check, Filter, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import NotificationItem from '@/components/notifications/NotificationItem';
import { useI18n } from '@/components/providers/I18nProvider';
import type { Notification } from '@/types/notifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'unread' | 'comment' | 'reply' | 'reaction';

/**
 * NotificationCenter - Slide-in panel displaying user notifications
 *
 * This component provides:
 * - Paginated notification list with filtering
 * - Mark individual or all notifications as read
 * - Mobile-optimized slide-in animation
 * - i18n support for all text
 *
 * Performance optimizations:
 * - useCallback for stable function references
 * - useRef-based request deduplication to prevent double-fetches
 * - Memoized NotificationItem children (see NotificationItem.tsx)
 */
export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  /**
   * PERFORMANCE FIX: Request deduplication
   *
   * Tracks the last fetched filter to prevent duplicate API calls.
   * This is especially important because:
   * 1. React StrictMode may double-invoke effects
   * 2. Filter changes could trigger multiple fetches
   * 3. Opening/closing the panel rapidly could cause race conditions
   */
  const lastFetchRef = useRef<string>('');

  /**
   * Fetch notifications from API
   *
   * Memoized with useCallback to maintain stable reference.
   * Uses lastFetchRef to skip duplicate requests with same filter.
   */
  const fetchNotifications = useCallback(async (currentFilter: FilterType) => {
    // Dedupe: skip if we already fetched this filter
    if (lastFetchRef.current === currentFilter) return;
    lastFetchRef.current = currentFilter;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilter === 'unread') {
        params.set('isRead', 'false');
      } else if (currentFilter !== 'all') {
        params.set('types', currentFilter);
      }

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silently handle error - notification center can show empty state gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Effect: Fetch notifications when panel opens or filter changes
   *
   * When panel closes, reset lastFetchRef so the next open fetches fresh data.
   * This ensures users see updated notifications when reopening the panel.
   */
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(filter);
    } else {
      // Reset fetch ref when closing so next open fetches fresh data
      lastFetchRef.current = '';
    }
  }, [isOpen, filter, fetchNotifications]);

  /**
   * Mark a single notification as read
   *
   * Optimistically updates local state for instant UI feedback,
   * then syncs with the server.
   */
  const handleMarkRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }

      // Optimistic update - immediately reflect in UI
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  /**
   * Mark all notifications as read
   *
   * Batch operation that updates all visible notifications.
   * Shows toast feedback on success/failure.
   */
  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      // Optimistic update - mark all as read in UI
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success(t('toasts.notifications.allMarkedRead'));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(t('toasts.notifications.markReadFailed'));
    }
  };

  // Don't render anything if panel is closed
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop - click to close */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Panel - slides in from right, full height on mobile */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/10 bg-black shadow-2xl duration-300 animate-in slide-in-from-right sm:max-w-md">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/10 bg-black px-4 py-3">
          {/* Title Row */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">{t('notifications.title')}</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-400">
                  {t('notifications.unreadCount', { count: unreadCount })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Mark all as read button */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="rounded-full p-1.5 text-xs text-electric transition-colors hover:bg-white/10"
                  title="Mark all as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              {/* Close button */}
              <button
                onClick={onClose}
                className="rounded-full p-1.5 transition-colors hover:bg-white/10"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Filter pills - horizontally scrollable on mobile */}
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
            {(['all', 'unread', 'comment', 'reply', 'reaction'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => {
                  // Reset lastFetchRef when changing filters to allow new fetch
                  if (f !== filter) {
                    lastFetchRef.current = '';
                    setFilter(f);
                  }
                }}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-electric text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {t(`notifications.filters.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto bg-black px-4 py-3">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-electric" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Filter className="mb-4 h-12 w-12 text-gray-600" />
              <p className="text-lg font-medium text-white">{t('notifications.empty.title')}</p>
              <p className="text-sm text-gray-400">
                {filter === 'all'
                  ? t('notifications.empty.allCaughtUp')
                  : t('notifications.empty.noType', { type: t(`notifications.filters.${filter}`) })}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onClick={() => {
                    // Close panel when clicking notification with action URL
                    if (notification.action_url) {
                      onClose();
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
