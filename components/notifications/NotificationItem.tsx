'use client';

import { Bell, Heart, MessageCircle, Sparkles, TrendingUp, User } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { formatRelativeTimeI18n } from '@/lib/date-utils';
import type { Notification, NotificationType } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  onMarkRead?: (notificationId: string) => void;
}

// Map notification types to their corresponding icons
const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  comment: MessageCircle,
  reply: MessageCircle,
  reaction: Heart,
  mention: Bell,
  follow: User,
  vibelog_like: Heart,
  mini_vibelog_promoted: Sparkles,
  comment_promoted: TrendingUp,
  system: Bell,
};

// Map notification types to their corresponding colors
const typeColors: Record<NotificationType, string> = {
  comment: 'text-blue-500',
  reply: 'text-blue-500',
  reaction: 'text-pink-500',
  mention: 'text-yellow-500',
  follow: 'text-purple-500',
  vibelog_like: 'text-pink-500',
  mini_vibelog_promoted: 'text-electric',
  comment_promoted: 'text-electric',
  system: 'text-gray-500',
};

/**
 * NotificationItemComponent - Renders a single notification with i18n support
 *
 * Performance optimizations applied:
 * - Wrapped in React.memo with custom comparator to prevent unnecessary re-renders
 * - Only re-renders when notification.id or notification.is_read changes
 */
function NotificationItemComponent({
  notification,
  onClick,
  onMarkRead,
}: NotificationItemProps) {
  const { t } = useI18n();

  const Icon = typeIcons[notification.type];
  const colorClass = typeColors[notification.type];

  // Get translated title based on notification type
  // Falls back to original title if translation key doesn't exist
  const getTranslatedTitle = () => {
    const translatedTitle = t(`notifications.types.${notification.type}`);
    // If translation returns the key itself, fall back to original title
    return translatedTitle.startsWith('notifications.types.')
      ? notification.title
      : translatedTitle;
  };

  // Get translated message with actor name interpolation
  const getTranslatedMessage = () => {
    const actorName = notification.actor_display_name || notification.actor_username;
    if (!actorName) {
      return notification.message;
    }

    // Check if message follows pattern "Name commented: "text""
    const commentMatch = notification.message?.match(/commented:\s*"(.+)"$/);
    if (commentMatch) {
      const commentPreview = commentMatch[1];
      return `${actorName} ${t('notifications.commented')} "${commentPreview}"`;
    }

    return notification.message;
  };

  // Safety check for unknown notification types
  if (!Icon) {
    console.error('Unknown notification type:', notification.type);
    return null;
  }

  const handleClick = () => {
    // Mark as read when clicked (if not already read)
    if (!notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }

    // Execute custom onClick handler if provided
    if (onClick) {
      onClick(notification);
    }
  };

  const content = (
    <div
      className={`flex gap-4 rounded-xl border p-4 transition-all duration-200 hover:border-primary/50 active:scale-[0.99] ${
        notification.is_read
          ? 'border-border/30 bg-card/30'
          : 'border-primary/30 bg-primary/5 shadow-sm'
      }`}
    >
      {/* Icon - visual indicator of notification type */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
          notification.is_read ? 'bg-muted' : 'bg-primary/10'
        }`}
      >
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Title - translated based on notification type */}
        <h4 className="font-medium text-foreground">{getTranslatedTitle()}</h4>

        {/* Message - may include actor name interpolation */}
        <p className="text-sm text-muted-foreground">{getTranslatedMessage()}</p>

        {/* Actor info - shows who triggered the notification */}
        {notification.actor_username && (
          <div className="flex items-center gap-2 pt-1">
            {notification.actor_avatar_url ? (
              <img
                src={notification.actor_avatar_url}
                alt={notification.actor_display_name || notification.actor_username}
                className="h-5 w-5 rounded-full ring-1 ring-border/50"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                <User className="h-3 w-3 text-primary" />
              </div>
            )}
            <span className="text-xs text-muted-foreground">@{notification.actor_username}</span>
          </div>
        )}

        {/* Timestamp - i18n-aware relative time display */}
        <p className="text-xs text-muted-foreground/70">
          {formatRelativeTimeI18n(notification.created_at, t)}
        </p>
      </div>

      {/* Unread indicator - pulsing dot for unread notifications */}
      {!notification.is_read && (
        <div className="flex-shrink-0 self-start pt-1">
          <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/50"></div>
        </div>
      )}
    </div>
  );

  // If there's an action URL, wrap in Next.js Link for client-side navigation
  if (notification.action_url) {
    return (
      <Link href={notification.action_url} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  // Otherwise, just a clickable div
  return (
    <div onClick={handleClick} className="cursor-pointer">
      {content}
    </div>
  );
}

/**
 * Memoized NotificationItem to prevent re-renders when parent updates unrelated state.
 *
 * Custom comparator only checks:
 * - notification.id (identity)
 * - notification.is_read (the only field that changes after initial render)
 *
 * This prevents re-renders when:
 * - Parent component's state changes (e.g., loading, filter)
 * - Sibling notifications are marked as read
 * - Other unrelated state updates occur
 */
const NotificationItem = memo(NotificationItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.is_read === nextProps.notification.is_read
  );
});

export default NotificationItem;
