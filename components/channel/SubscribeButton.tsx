'use client';

import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubscribeButtonProps {
  channelHandle: string;
  channelOwnerId?: string;
  initialSubscribed?: boolean;
  onSubscriptionChange?: (subscribed: boolean, count: number) => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}

/**
 * SubscribeButton - Subscribe/unsubscribe from a channel
 *
 * Shows "Subscribe" for non-subscribers, "Subscribed" for subscribers.
 * Handles auth redirect if user is not logged in.
 */
export function SubscribeButton({
  channelHandle,
  channelOwnerId,
  initialSubscribed = false,
  onSubscriptionChange,
  className,
  size = 'default',
}: SubscribeButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check subscription status on mount
  useEffect(() => {
    async function checkSubscription() {
      if (!user || !channelHandle) {
        setCheckingStatus(false);
        return;
      }

      try {
        const response = await fetch(`/api/channels/${channelHandle}/subscribe`);
        if (response.ok) {
          const data = await response.json();
          setSubscribed(data.subscribed);
        }
      } catch (err) {
        console.error('[SubscribeButton] Error checking status:', err);
      } finally {
        setCheckingStatus(false);
      }
    }

    checkSubscription();
  }, [user, channelHandle]);

  // Don't show button if viewing own channel
  if (user && channelOwnerId && user.id === channelOwnerId) {
    return null;
  }

  const handleClick = async () => {
    // Redirect to sign in if not logged in
    if (!user) {
      router.push(`/auth/signin?redirect=/@${channelHandle}`);
      return;
    }

    setLoading(true);

    try {
      const method = subscribed ? 'DELETE' : 'POST';
      const response = await fetch(`/api/channels/${channelHandle}/subscribe`, {
        method,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update subscription');
      }

      const data = await response.json();
      setSubscribed(data.subscribed);

      if (onSubscriptionChange) {
        onSubscriptionChange(data.subscribed, data.subscriber_count);
      }
    } catch (err) {
      console.error('[SubscribeButton] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth or subscription status
  if (authLoading || checkingStatus) {
    return (
      <Button variant="outline" size={size} disabled className={cn('min-w-[100px]', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={subscribed ? 'outline' : 'default'}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'min-w-[100px] transition-all',
        subscribed &&
          'border-electric/50 text-electric hover:border-red-500 hover:bg-red-500/10 hover:text-red-500',
        className
      )}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <>
          <Bell className="mr-2 h-4 w-4" fill="currentColor" />
          <span className="group-hover:hidden">{t('channels.subscribed') || 'Subscribed'}</span>
        </>
      ) : (
        <>
          <BellOff className="mr-2 h-4 w-4" />
          {t('channels.subscribe') || 'Subscribe'}
        </>
      )}
    </Button>
  );
}
