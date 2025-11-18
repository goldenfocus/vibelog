'use client';

import { Check, Filter, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import NotificationItem from '@/components/notifications/NotificationItem';
import type { Notification } from '@/types/notifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'unread' | 'comment' | 'reply' | 'reaction';

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.set('isRead', 'false');
      } else if (filter !== 'all') {
        params.set('types', filter);
      }

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      console.log('📬 Notifications API response:', data);
      console.log('📨 Notifications array:', data.notifications);
      console.log('🔢 Unread count:', data.unreadCount);
      console.log('🔍 Current filter:', filter);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      // Silently handle error - no need to show failure toast for empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filter]);

  // Mark notification as read
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

      // Update local state
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

  // Mark all as read
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

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Panel - Mobile optimized with smooth slide-in animation */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/10 bg-black shadow-2xl duration-300 animate-in slide-in-from-right sm:max-w-md">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/10 bg-black p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
              {unreadCount > 0 && <p className="text-sm text-gray-400">{unreadCount} unread</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              aria-label="Close notifications"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {(['all', 'unread', 'comment', 'reply', 'reaction'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-electric text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="mt-3 flex items-center gap-2 text-sm font-medium text-electric transition-opacity hover:opacity-80"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto bg-black p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-electric" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Filter className="mb-4 h-12 w-12 text-gray-600" />
              <p className="text-lg font-medium text-white">No notifications</p>
              <p className="text-sm text-gray-400">
                {filter === 'all' ? "You're all caught up!" : `No ${filter} notifications`}
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
