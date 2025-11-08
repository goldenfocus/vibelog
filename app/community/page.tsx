'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';
import VibelogCard from '@/components/VibelogCard';

interface VibelogAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
  voice_clone_id?: string | null;
}

interface Vibelog {
  id: string;
  title: string;
  slug?: string | null;
  public_slug?: string | null;
  teaser: string;
  content: string;
  cover_image_url: string | null;
  audio_url?: string | null;
  voice_clone_id?: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;
  user_id?: string;
  author: VibelogAuthor;
}

export default function Community() {
  const { t } = useI18n();
  const router = useRouter();
  const [vibelogs, setVibelogs] = useState<Vibelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVibelogs();
  }, []);

  const fetchVibelogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-vibelogs?limit=50');

      if (!response.ok) {
        throw new Error('Failed to fetch vibelogs');
      }

      const data = await response.json();
      setVibelogs(data.vibelogs || []);
    } catch (err) {
      console.error('Error fetching vibelogs:', err);
      setError('Failed to load vibelogs');
    } finally {
      setLoading(false);
    }
  };

  const handleRemix = (content: string) => {
    // Navigate to home page with remix content
    router.push(`/?remix=${encodeURIComponent(content)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 bg-gradient-electric bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
              {t('pages.community.title')}
            </h1>
            <p className="text-xl text-muted-foreground">{t('pages.community.subtitle')}</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-electric border-t-transparent"></div>
              <span className="ml-3 text-muted-foreground">Loading vibelogs...</span>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchVibelogs}
                className="mt-4 rounded-lg bg-electric px-4 py-2 font-medium text-white transition-colors hover:bg-electric-glow"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && vibelogs.length === 0 && (
            <div className="rounded-2xl border border-border/20 bg-card p-12 text-center">
              <p className="text-xl text-muted-foreground">
                No vibelogs yet. Be the first to create one!
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-6 rounded-lg bg-electric px-6 py-3 font-medium text-white transition-colors hover:bg-electric-glow"
              >
                Create Vibelog
              </button>
            </div>
          )}

          {!loading && !error && vibelogs.length > 0 && (
            <div className="space-y-8">
              {vibelogs.map(vibelog => (
                <VibelogCard key={vibelog.id} vibelog={vibelog} onRemix={handleRemix} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
