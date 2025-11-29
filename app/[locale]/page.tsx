'use client';

import { MessageCircle, Bot, Share2, FileText, Mic, Video } from 'lucide-react';
// [OUT OF SCOPE] Screen share feature commented out
// import { Monitor } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

// [OUT OF SCOPE] Screen share feature commented out
// import { ScreenShareCreator } from '@/components/creation/ScreenShareCreator';
import { TextCreator } from '@/components/creation/TextCreator';
import { VideoCreator } from '@/components/creation/VideoCreator';
import HomeCommunityShowcase from '@/components/home/HomeCommunityShowcase';
import MicRecorder from '@/components/MicRecorder';
import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';

function RemixHandler({ onRemixContent }: { onRemixContent: (content: string | null) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for remix parameter in URL
    const remix = searchParams.get('remix');
    if (remix) {
      onRemixContent(decodeURIComponent(remix));
    }
  }, [searchParams, onRemixContent]);

  return null;
}

export default function Home() {
  const { t, isLoading } = useI18n();
  const [remixContent, setRemixContent] = useState<string | null>(null);
  // [OUT OF SCOPE] Screen mode removed - was: 'text' | 'audio' | 'video' | 'screen'
  const [creationMode, setCreationMode] = useState<'text' | 'audio' | 'video'>('audio');
  const [refreshFeed, setRefreshFeed] = useState<(() => void) | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <RemixHandler onRemixContent={setRemixContent} />
      </Suspense>
      <Navigation />

      {/* Hero Section */}
      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center sm:mb-24">
            <h1
              className="mb-8 text-4xl font-bold leading-tight tracking-tight sm:mb-12 sm:text-6xl md:text-7xl lg:text-8xl"
              style={{ minHeight: '120px' }}
            >
              {t('hero.title.part1')}{' '}
              <span className="bg-gradient-electric bg-clip-text text-transparent">
                {t('hero.title.part2')}
              </span>
            </h1>
            <p
              className="mx-auto max-w-3xl px-4 text-lg font-normal leading-relaxed text-muted-foreground sm:text-xl md:text-2xl"
              style={{ minHeight: '80px' }}
            >
              {t('hero.subtitle')}
            </p>
          </div>

          {/* 4-Icon Mode Selector */}
          <div className="mb-8 flex justify-center gap-4 sm:gap-6">
            <button
              onClick={() => setCreationMode('text')}
              className={`group flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all sm:h-20 sm:w-20 ${
                creationMode === 'text'
                  ? 'border-purple-600 bg-purple-50 shadow-lg dark:border-purple-400 dark:bg-purple-900/20'
                  : 'border-border/30 bg-card/50 hover:border-border hover:bg-card/80'
              }`}
              aria-label={t('home.modes.text')}
            >
              <FileText
                className={`h-8 w-8 sm:h-10 sm:w-10 ${
                  creationMode === 'text'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                }`}
                strokeWidth={1.5}
              />
            </button>

            <button
              onClick={() => setCreationMode('audio')}
              className={`group flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all sm:h-20 sm:w-20 ${
                creationMode === 'audio'
                  ? 'border-purple-600 bg-purple-50 shadow-lg dark:border-purple-400 dark:bg-purple-900/20'
                  : 'border-border/30 bg-card/50 hover:border-border hover:bg-card/80'
              }`}
              aria-label={t('home.modes.audio')}
            >
              <Mic
                className={`h-8 w-8 sm:h-10 sm:w-10 ${
                  creationMode === 'audio'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                }`}
                strokeWidth={1.5}
              />
            </button>

            <button
              onClick={() => setCreationMode('video')}
              className={`group flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all sm:h-20 sm:w-20 ${
                creationMode === 'video'
                  ? 'border-purple-600 bg-purple-50 shadow-lg dark:border-purple-400 dark:bg-purple-900/20'
                  : 'border-border/30 bg-card/50 hover:border-border hover:bg-card/80'
              }`}
              aria-label={t('home.modes.video')}
            >
              <Video
                className={`h-8 w-8 sm:h-10 sm:w-10 ${
                  creationMode === 'video'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                }`}
                strokeWidth={1.5}
              />
            </button>

{/* [OUT OF SCOPE] Screen share mode button commented out */}
            {/* <button
              onClick={() => setCreationMode('screen')}
              className={`group flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all sm:h-20 sm:w-20 ${
                creationMode === 'screen'
                  ? 'border-blue-600 bg-blue-50 shadow-lg dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-border/30 bg-card/50 hover:border-border hover:bg-card/80'
              }`}
              aria-label={t('home.modes.screen')}
            >
              <Monitor
                className={`h-8 w-8 sm:h-10 sm:w-10 ${
                  creationMode === 'screen'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                }`}
                strokeWidth={1.5}
              />
            </button> */}
          </div>

          {/* Creation Interface - Conditional Rendering */}
          <div className="mb-20 flex justify-center">
            {creationMode === 'text' && (
              <TextCreator remixContent={remixContent} onSaveSuccess={refreshFeed} />
            )}
            {creationMode === 'audio' && (
              <MicRecorder remixContent={remixContent} onSaveSuccess={refreshFeed} />
            )}
            {creationMode === 'video' && <VideoCreator />}
            {/* [OUT OF SCOPE] Screen share creator commented out */}
            {/* {creationMode === 'screen' && (
              <ScreenShareCreator remixContent={remixContent} onSaveSuccess={refreshFeed} />
            )} */}
          </div>

          {/* Features Preview */}
          <h2 className="sr-only">Features</h2>
          <div className="mx-auto mb-20 grid max-w-4xl grid-cols-3 gap-3 sm:gap-6 md:gap-8">
            <div className="rounded-xl border border-border/50 bg-card/80 p-3 text-center backdrop-blur-sm transition-all duration-300 hover:bg-card/90 sm:rounded-2xl sm:p-6 md:p-8">
              <div className="mb-3 flex items-center justify-center sm:mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 sm:h-16 sm:w-16 sm:rounded-2xl">
                  <MessageCircle className="h-6 w-6 text-primary sm:h-8 sm:w-8" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground sm:mb-3 sm:text-lg">
                {t('features.input.title')}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {t('features.input.description')}
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/80 p-3 text-center backdrop-blur-sm transition-all duration-300 hover:bg-card/90 sm:rounded-2xl sm:p-6 md:p-8">
              <div className="mb-3 flex items-center justify-center sm:mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 sm:h-16 sm:w-16 sm:rounded-2xl">
                  <Bot className="h-6 w-6 text-primary sm:h-8 sm:w-8" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground sm:mb-3 sm:text-lg">
                {t('features.aiMagic.title')}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {t('features.aiMagic.description')}
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/80 p-3 text-center backdrop-blur-sm transition-all duration-300 hover:bg-card/90 sm:rounded-2xl sm:p-6 md:p-8">
              <div className="mb-3 flex items-center justify-center sm:mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 sm:h-16 sm:w-16 sm:rounded-2xl">
                  <Share2 className="h-6 w-6 text-primary sm:h-8 sm:w-8" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground sm:mb-3 sm:text-lg">
                {t('features.share.title')}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {t('features.share.description')}
              </p>
            </div>
          </div>

          <HomeCommunityShowcase onRemix={setRemixContent} onRefreshRequest={setRefreshFeed} />
        </div>
      </main>

      {/* Organization Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'VibeLog',
            url: 'https://vibelog.io',
            logo: 'https://vibelog.io/og-image.png',
            description:
              'Transform your voice into polished stories in seconds. Create and publish content naturally with AI-powered voice technology.',
            sameAs: ['https://twitter.com/vibelog_io'],
          }),
        }}
      />

      {/* WebApplication Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'VibeLog',
            applicationCategory: 'ContentManagementApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            featureList:
              'Voice to text, AI content generation, Multi-platform publishing, Audio recording, Video creation',
          }),
        }}
      />
    </div>
  );
}
