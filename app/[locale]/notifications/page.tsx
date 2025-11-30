'use client';

import { Check, Filter, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import Navigation from '@/components/Navigation';
import NotificationItem from '@/components/notifications/NotificationItem';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import type { Notification } from '@/types/notifications';

type FilterType = 'all' | 'unread' | 'comment' | 'reply' | 'reaction';

export default function NotificationsPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  // Redirect anonymous users to sign-in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin');
    }
  }, [authLoading, user, router]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) {
      return;
    }

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
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user]);

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
      toast.success(t('toasts.notifications.allMarkedRead'));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(t('toasts.notifications.markReadFailed'));
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render content for anonymous users (redirect is happening)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Main content with proper top padding for fixed nav */}
      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  {t('notifications.title')}
                </h1>
                {unreadCount > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('notifications.unreadCount', { count: unreadCount })}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  {t('titles.markAllRead')}
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-wrap gap-2">
              {(['all', 'unread', 'comment', 'reply', 'reaction'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {t(`notifications.filters.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Notification list */}
          <div className="mt-8">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-border/30 bg-card/30 text-center backdrop-blur-sm">
                <Filter className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-lg font-medium text-foreground">
                  {t('notifications.empty.title')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filter === 'all'
                    ? t('notifications.empty.allCaughtUp')
                    : t('notifications.empty.noType', {
                        type: t(`notifications.filters.${filter}`),
                      })}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
