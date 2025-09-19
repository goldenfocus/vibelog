'use client';

import { Heart, MessageCircle, Share, User } from 'lucide-react';

import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';

export default function About() {
  const { t } = useI18n();

  const handleShare = async () => {
    const shareData = {
      title: 'vibelog.io - About Yang',
      text: 'Check out the story behind vibelog.io and how voice-first content creation is changing everything. Built with vibe coding! 🚀',
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`
        );
        // You could add a toast notification here
        console.log('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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
              {(() => {
                try {
                  const paragraphs = t('pages.about.problem.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch {
                  return <p>Loading...</p>;
                }
              })()}
            </div>
          </section>

          {/* The Spark */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">{t('pages.about.spark.title')}</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              {(() => {
                try {
                  const paragraphs = t('pages.about.spark.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch {
                  return <p>Loading...</p>;
                }
              })()}
            </div>
          </section>

          {/* The Solution */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">{t('pages.about.solution.title')}</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              {(() => {
                try {
                  const paragraphs = t('pages.about.solution.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch {
                  return <p>Loading...</p>;
                }
              })()}
            </div>
          </section>

          {/* The Mission */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">{t('pages.about.mission.title')}</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              {(() => {
                try {
                  const paragraphs = t('pages.about.mission.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch {
                  return <p>Loading...</p>;
                }
              })()}
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
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-xl font-bold">Yang</h3>
              <p className="mb-2 text-muted-foreground">Founder</p>
              <a
                href="/vibeyang"
                className="text-electric transition-colors hover:text-electric-glow"
              >
                @vibeyang
              </a>
            </div>

            {/* Engagement Stats */}
            <div className="mb-8 flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Heart className="h-5 w-5" />
                <span>247 likes</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MessageCircle className="h-5 w-5" />
                <span>43 comments</span>
              </div>
              <button
                onClick={handleShare}
                className="flex cursor-pointer items-center space-x-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Share className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Community Comments */}
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <span className="text-sm font-semibold text-white">A</span>
                </div>
                <div>
                  <div className="mb-1 flex items-center space-x-2">
                    <span className="font-medium">@alexchen</span>
                    <span className="text-sm text-muted-foreground">2h ago</span>
                  </div>
                  <p className="text-muted-foreground">
                    This is exactly what I needed! No more scattered notes
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink-500">
                  <span className="text-sm font-semibold text-white">S</span>
                </div>
                <div>
                  <div className="mb-1 flex items-center space-x-2">
                    <span className="font-medium">@sarahmiller</span>
                    <span className="text-sm text-muted-foreground">4h ago</span>
                  </div>
                  <p className="text-muted-foreground">
                    The &quot;vibe coding&quot; approach is genius. Building with AI tools is the
                    future.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-500">
                  <span className="text-sm font-semibold text-white">M</span>
                </div>
                <div>
                  <div className="mb-1 flex items-center space-x-2">
                    <span className="font-medium">@mikejohnson</span>
                    <span className="text-sm text-muted-foreground">6h ago</span>
                  </div>
                  <p className="text-muted-foreground">
                    Love the personal story behind this. Excited to try it out!
                  </p>
                </div>
              </div>

              {/* Add Comment Input */}
              <div className="flex items-center space-x-3 border-t border-border/20 pt-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="w-full bg-transparent text-muted-foreground placeholder-muted-foreground focus:outline-none"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
