'use client';

import { Bell, Heart, MessageCircle, Sparkles, TrendingUp, User } from 'lucide-react';
import Link from 'next/link';

import { formatRelativeTime } from '@/lib/date-utils';
import type { Notification, NotificationType } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  onMarkRead?: (notificationId: string) => void;
}

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

export default function NotificationItem({
  notification,
  onClick,
  onMarkRead,
}: NotificationItemProps) {
  console.log('🔔 Rendering notification:', notification);

  const Icon = typeIcons[notification.type];
  const colorClass = typeColors[notification.type];

  // Safety check
  if (!Icon) {
    console.error('❌ Unknown notification type:', notification.type);
    return null;
  }

  const handleClick = () => {
    // Mark as read when clicked
    if (!notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }

    // Execute custom onClick
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
      {/* Icon */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
          notification.is_read ? 'bg-muted' : 'bg-primary/10'
        }`}
      >
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Title */}
        <h4 className="font-medium text-foreground">{notification.title}</h4>

        {/* Message */}
        <p className="text-sm text-muted-foreground">{notification.message}</p>

        {/* Actor info */}
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

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground/70">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="flex-shrink-0 self-start pt-1">
          <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/50"></div>
        </div>
      )}
    </div>
  );

  // If there's an action URL, wrap in Link
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
