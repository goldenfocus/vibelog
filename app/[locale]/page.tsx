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
import { cn } from '@/lib/utils';

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
  const [mounted, setMounted] = useState(false);

  // Trigger entrance animations after mount
  useEffect(() => {
    setMounted(true);
  }, []);

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

      {/* Hero Section - Mobile-optimized with staggered animations */}
      <main className="px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Hero Text - Compact on mobile */}
          <div className="mb-8 text-center sm:mb-16">
            <h1
              className={cn(
                'mb-4 text-3xl font-bold leading-tight tracking-tight sm:mb-8 sm:text-5xl md:text-6xl lg:text-7xl',
                'transition-all duration-700 ease-out',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              )}
            >
              {t('hero.title.part1')}{' '}
              <span className="bg-gradient-electric bg-clip-text text-transparent">
                {t('hero.title.part2')}
              </span>
            </h1>
            <p
              className={cn(
                'mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl',
                'transition-all duration-700 delay-100 ease-out',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              )}
            >
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Mode Selector - Animated entrance */}
          <div
            className={cn(
              'mb-6 flex justify-center gap-3 sm:mb-8 sm:gap-4',
              'transition-all duration-700 delay-200 ease-out',
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}
          >
            {[
              { mode: 'text' as const, Icon: FileText, label: t('home.modes.text') },
              { mode: 'audio' as const, Icon: Mic, label: t('home.modes.audio') },
              { mode: 'video' as const, Icon: Video, label: t('home.modes.video') },
            ].map(({ mode, Icon, label }, index) => (
              <button
                key={mode}
                onClick={() => setCreationMode(mode)}
                className={cn(
                  'group relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 sm:h-16 sm:w-16',
                  'transition-all duration-300 active:scale-95',
                  creationMode === mode
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                    : 'border-border/30 bg-card/50 hover:border-border hover:bg-card/80 hover:shadow-md'
                )}
                aria-label={label}
                style={{
                  transitionDelay: mounted ? `${200 + index * 50}ms` : '0ms',
                }}
              >
                <Icon
                  className={cn(
                    'h-6 w-6 sm:h-7 sm:w-7',
                    'transition-all duration-300',
                    creationMode === mode
                      ? 'scale-110 text-primary'
                      : 'text-muted-foreground group-hover:scale-105 group-hover:text-foreground'
                  )}
                  strokeWidth={1.5}
                />
                {creationMode === mode && (
                  <div className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Creation Interface - Animated container */}
          <div
            className={cn(
              'mb-12 flex justify-center sm:mb-16',
              'transition-all duration-700 delay-300 ease-out',
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}
          >
            {creationMode === 'text' && (
              <TextCreator remixContent={remixContent} onSaveSuccess={refreshFeed} />
            )}
            {creationMode === 'audio' && (
              <MicRecorder remixContent={remixContent} onSaveSuccess={refreshFeed} />
            )}
            {creationMode === 'video' && <VideoCreator />}
          </div>

          {/* Features Preview - Compact mobile cards with staggered animations */}
          <h2 className="sr-only">Features</h2>
          <div
            className={cn(
              'mx-auto mb-12 grid max-w-4xl grid-cols-3 gap-2 sm:mb-16 sm:gap-4 md:gap-6',
              'transition-all duration-700 delay-400 ease-out',
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}
          >
            {[
              { Icon: MessageCircle, title: t('features.input.title'), desc: t('features.input.description') },
              { Icon: Bot, title: t('features.aiMagic.title'), desc: t('features.aiMagic.description') },
              { Icon: Share2, title: t('features.share.title'), desc: t('features.share.description') },
            ].map(({ Icon, title, desc }, index) => (
              <div
                key={title}
                className={cn(
                  'group rounded-xl border border-border/50 bg-card/80 p-2.5 text-center backdrop-blur-sm sm:rounded-2xl sm:p-4 md:p-6',
                  'transition-all duration-300 hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg'
                )}
                style={{
                  transitionDelay: mounted ? `${400 + index * 100}ms` : '0ms',
                }}
              >
                <div className="mb-2 flex items-center justify-center sm:mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12 sm:rounded-2xl">
                    <Icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="mb-1 text-xs font-semibold text-foreground sm:mb-2 sm:text-sm md:text-base">
                  {title}
                </h3>
                <p className="hidden text-xs leading-relaxed text-muted-foreground sm:block sm:text-sm">
                  {desc}
                </p>
              </div>
            ))}
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
