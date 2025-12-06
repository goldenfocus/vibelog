'use client';

import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { PlanetCard, PlanetCardSkeleton } from '@/components/universe';
import type { ChannelSummary } from '@/lib/channels/types';

interface MyChannelsResponse {
  channels: ChannelSummary[];
  default_channel_id: string | null;
  total: number;
}

export default function UniversePage() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const router = useRouter();

  const [channels, setChannels] = useState<ChannelSummary[]>([]);
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
        console.error('[UniversePage] Error:', err);
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
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 text-center sm:text-left">
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <Sparkles className="h-8 w-8 text-electric" />
              <h1 className="text-3xl font-bold sm:text-4xl">
                {t('universe.title') || 'My Universe'}
              </h1>
            </div>
            <p className="mt-2 text-muted-foreground">
              {t('universe.description') || 'Your vibes, organized into worlds'}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <PlanetCardSkeleton key={i} />
              ))}
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
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-electric/20">
                <Sparkles className="h-12 w-12 text-electric" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold">
                {t('universe.emptyTitle') || 'Your Universe Awaits'}
              </h2>
              <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                {t('universe.emptyDescription') ||
                  'Create your first vibelog and watch your universe come to life'}
              </p>
              <Link href={`/${locale}`}>
                <Button size="lg" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('universe.createFirstVibelog') || 'Create Your First Vibe'}
                </Button>
              </Link>
            </div>
          )}

          {/* Planet Cards Grid */}
          {!isLoading && !error && channels.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map(channel => (
                <PlanetCard key={channel.id} channel={channel} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
