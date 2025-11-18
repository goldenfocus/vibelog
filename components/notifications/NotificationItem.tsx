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
      className={`flex gap-3 rounded-lg border p-4 transition-all hover:border-electric/50 hover:bg-electric/5 ${
        notification.is_read ? 'border-border/30 bg-background' : 'border-electric/30 bg-electric/5'
      }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
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
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-electric/10">
                <User className="h-3 w-3 text-electric" />
              </div>
            )}
            <span className="text-xs text-muted-foreground">@{notification.actor_username}</span>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-electric"></div>
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
