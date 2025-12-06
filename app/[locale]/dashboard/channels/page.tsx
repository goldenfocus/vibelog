'use client';

import { Loader2, Plus, Radio, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import type { Channel } from '@/lib/channels/types';

interface MyChannelsResponse {
  channels: Channel[];
  default_channel_id: string | null;
  total: number;
}

export default function ChannelsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, isLoading: i18nLoading } = useI18n();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  // Fetch user's channels
  useEffect(() => {
    async function fetchChannels() {
      if (!user) {
        return;
      }

      try {
        const response = await fetch('/api/channels/me');
        if (!response.ok) {
          throw new Error('Failed to fetch channels');
        }

        const data: MyChannelsResponse = await response.json();
        setChannels(data.channels);
      } catch (err) {
        console.error('[ChannelsPage] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load channels');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchChannels();
    }
  }, [user]);

  if (authLoading || i18nLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-electric" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                {t('channels.myChannels') || 'My Channels'}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {t('channels.myChannelsDescription') || 'Create and manage your channels'}
              </p>
            </div>
            <Link href="/dashboard/channels/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('channels.createChannel') || 'Create Channel'}
                </span>
                <span className="sm:hidden">{t('common.new') || 'New'}</span>
              </Button>
            </Link>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-electric" />
                <p className="text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                {t('common.retry') || 'Try Again'}
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && channels.length === 0 && (
            <div className="rounded-2xl border border-border/30 bg-card/30 p-12 text-center backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Radio className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                {t('channels.noChannelsTitle') || 'No channels yet'}
              </h2>
              <p className="mb-6 text-muted-foreground">
                {t('channels.noChannelsDescription') ||
                  'Create your first channel to start publishing vibelogs'}
              </p>
              <Link href="/dashboard/channels/new">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('channels.createFirstChannel') || 'Create Your First Channel'}
                </Button>
              </Link>
            </div>
          )}

          {/* Channels List */}
          {!isLoading && !error && channels.length > 0 && (
            <div className="space-y-4">
              {channels.map(channel => (
                <Link
                  key={channel.id}
                  href={`/dashboard/channels/${channel.id}`}
                  className="group block"
                >
                  <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm transition-all hover:border-electric/50 hover:bg-card/50">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {channel.avatar_url ? (
                          <Image
                            src={channel.avatar_url}
                            alt={channel.name}
                            width={64}
                            height={64}
                            className="rounded-full border-2 border-border/50 transition-all group-hover:border-electric/50"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border/50 bg-primary/10 transition-all group-hover:border-electric/50">
                            <Radio className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        {channel.is_default && (
                          <div className="absolute -right-1 -top-1 rounded-full bg-yellow-500 p-1">
                            <Star className="h-3 w-3 text-white" fill="white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-lg font-semibold transition-colors group-hover:text-electric">
                            {channel.name}
                          </h3>
                          {channel.is_default && (
                            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                              {t('channels.default') || 'Default'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-electric">@{channel.handle}</p>
                        {channel.bio && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {channel.bio}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            <strong className="text-foreground">{channel.vibelog_count}</strong>{' '}
                            {t('channels.vibelogs') || 'vibelogs'}
                          </span>
                          <span>
                            <strong className="text-foreground">{channel.subscriber_count}</strong>{' '}
                            {t('channels.subscribers') || 'subscribers'}
                          </span>
                          {channel.total_views > 0 && (
                            <span>
                              <strong className="text-foreground">
                                {channel.total_views.toLocaleString()}
                              </strong>{' '}
                              {t('channels.views') || 'views'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                        <svg
                          className="h-5 w-5 text-electric"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
