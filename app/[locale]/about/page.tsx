'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import Comments from '@/components/comments/Comments';
import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';
import { createClient } from '@/lib/supabase';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  header_image: string | null;
  bio: string | null;
}

export default function About() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aboutVibelogId, setAboutVibelogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = await createClient();

      // Fetch @vibeyang profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, header_image, bio')
        .eq('username', 'vibeyang')
        .single();

      setProfile(profileData);

      // Fetch or create the About page vibelog for comments
      const { data: vibelog } = await supabase
        .from('vibelogs')
        .select('id')
        .eq('slug', 'about-page-comments')
        .eq('is_published', true)
        .single();

      setAboutVibelogId(vibelog?.id || null);
      setLoading(false);
    }

    fetchData();
  }, []);

  const displayName = profile?.display_name || profile?.full_name || t('pages.about.founder.name');
  const username = profile?.username || 'vibeyang';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h1 className="mb-6 text-4xl font-bold sm:text-5xl">{t('pages.about.title')}</h1>
          </div>

          {/* Founder Video Placeholder */}
          <div className="mb-16 text-center">
            <div className="mb-6 rounded-2xl border border-border/20 bg-card p-8">
              <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-electric">
                    <span className="text-2xl">▶️</span>
                  </div>
                  <p className="text-muted-foreground">
                    {t('pages.about.founderVideo.placeholder')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('pages.about.founderVideo.subtitle')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* The Problem */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">{t('pages.about.problem.title')}</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>{t('pages.about.problem.paragraphs.0')}</p>
              <p>{t('pages.about.problem.paragraphs.1')}</p>
              <p>{t('pages.about.problem.paragraphs.2')}</p>
            </div>
          </section>

          {/* The Spark */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">{t('pages.about.spark.title')}</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>{t('pages.about.spark.paragraphs.0')}</p>
              <p>{t('pages.about.spark.paragraphs.1')}</p>
              <p>{t('pages.about.spark.paragraphs.2')}</p>
            </div>
          </section>

          {/* The Solution */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">{t('pages.about.solution.title')}</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>{t('pages.about.solution.paragraphs.0')}</p>
              <p>{t('pages.about.solution.paragraphs.1')}</p>
            </div>
          </section>

          {/* The Mission */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">{t('pages.about.mission.title')}</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>{t('pages.about.mission.paragraphs.0')}</p>
              <p className="text-xl font-semibold text-foreground">
                {t('pages.about.mission.tagline')}
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="mb-16 flex items-center justify-center">
            <div className="h-px flex-1 bg-border"></div>
            <div className="px-4 text-muted-foreground">⸻</div>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          {/* Community Engagement Section */}
          <div className="mb-16 rounded-3xl border border-border/20 bg-gradient-subtle p-8">
            {/* Profile Section */}
            <div className="mb-8 text-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="mx-auto mb-4 h-20 w-20 rounded-full border-4 border-electric/20 object-cover"
                />
              ) : (
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <h3 className="mb-1 text-xl font-bold">{displayName}</h3>
              <p className="mb-2 text-muted-foreground">{t('pages.about.founder.role')}</p>
              <Link
                href={`/@${username}`}
                className="text-electric transition-colors hover:text-electric-glow"
              >
                {t('pages.about.founder.handle')}
              </Link>
            </div>

            {/* Comments Section */}
            {aboutVibelogId && (
              <div className="mt-8">
                <Comments vibelogId={aboutVibelogId} />
              </div>
            )}

            {!aboutVibelogId && (
              <div className="mt-8 text-center text-muted-foreground">
                <p>{t('common.comingSoon')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
