'use client';

import { Mic, Video, Music } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';

import { VideoCreator } from '@/components/creation/VideoCreator';
import HomeCommunityShowcase from '@/components/home/HomeCommunityShowcase';
import { Portal } from '@/components/home/Portal';
import { MediaUploadZone } from '@/components/media';
import MicRecorder from '@/components/MicRecorder';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { BOTTOM_NAV_HEIGHT } from '@/lib/mobile/constants';
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
  const { t, isLoading, locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isLoggedIn = Boolean(user);

  // #region agent log
  // Debug: Log translation state to verify hypotheses
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/f4483eb0-cedb-4874-a476-130070d1c030', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/[locale]/page.tsx:Home',
        message: 'Translation debug info',
        data: {
          locale,
          isLoading,
          testTranslation: t('common.loading'),
          heroTitleKey: t('home.hero.title'),
          heroSubtitleKey: t('home.hero.subtitle'),
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'A,B,C',
      }),
    }).catch(() => {});
  }, [locale, isLoading, t]);
  // #endregion

  const [remixContent, setRemixContent] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'audio' | 'video' | 'music'>('audio');
  const [refreshFeed, setRefreshFeed] = useState<(() => void) | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAwakening, setIsAwakening] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  // Trigger entrance animations after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Callback for after vibelog is saved - redirect to community page
  const handleSaveSuccess = useCallback(() => {
    // Refresh the feed if available
    if (refreshFeed && typeof refreshFeed === 'function') {
      refreshFeed();
    }
    // Redirect to community page to see their vibelog
    router.push('/community');
  }, [refreshFeed, router]);

  const handlePortalClick = () => {
    setIsAwakening(true);
    // Delay showing the creator slightly to allow the "awakening" animation to play
    setTimeout(() => {
      setCreationMode('audio');
      setShowCreator(true);
    }, 800);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-1000',
        isAwakening ? 'bg-[#050510]' : 'bg-background'
      )}
    >
      <Suspense fallback={null}>
        <RemixHandler onRemixContent={setRemixContent} />
      </Suspense>

      {/* Navigation - fades out during awakening, or stays minimal */}
      <div
        className={cn(
          'transition-opacity duration-1000',
          isAwakening ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
      >
        <Navigation />
      </div>

      <main className="relative flex min-h-screen flex-col items-center px-4">
        {/* Cinematic Universe Background Effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={cn(
              'duration-[2000ms] absolute left-1/2 top-1/2 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/5 blur-[120px] transition-all',
              isAwakening ? 'scale-150 opacity-20' : 'scale-100 opacity-10'
            )}
          />
          {/* Stars / Particles could be added here */}
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center pt-24 sm:pt-32">
          {/* Main Cinematic Hero State */}
          <div
            className={cn(
              'flex flex-col items-center text-center transition-all duration-1000 ease-in-out',
              showCreator ? 'absolute -translate-y-[100vh] opacity-0' : 'translate-y-0 opacity-100'
            )}
          >
            {/* Headline */}
            <h1
              className={cn(
                'mb-6 text-4xl font-bold tracking-tight sm:mb-8 sm:text-6xl md:text-7xl',
                'bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent',
                'transition-all duration-1000 ease-out',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
                isAwakening && 'scale-105 opacity-80 blur-sm'
              )}
            >
              Your voice. Your universe.
            </h1>

            {/* Sub-headline */}
            <p
              className={cn(
                'mb-12 max-w-xl text-lg text-blue-100/60 sm:text-2xl',
                'transition-all delay-100 duration-1000 ease-out',
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
                isAwakening && 'opacity-0'
              )}
            >
              Speak → Share → Vibe
            </p>

            {/* THE PORTAL */}
            <div
              className={cn(
                'mb-8 transition-all duration-1000 ease-out',
                mounted ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
                isAwakening && 'scale-[3] opacity-0'
              )}
            >
              <Portal onClick={handlePortalClick} />
            </div>

            {/* Instruction text for non-logged-in users */}
            {!isLoggedIn && (
              <p
                className={cn(
                  'max-w-sm text-center text-sm leading-relaxed text-blue-100/50',
                  'transition-all delay-200 duration-1000 ease-out',
                  mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                  isAwakening && 'opacity-0'
                )}
              >
                {t('home.guestInstruction')}
              </p>
            )}
          </div>

          {/* Creation State (Awakened) */}
          <div
            className={cn(
              'flex w-full flex-col items-center transition-all delay-300 duration-1000',
              showCreator
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none absolute translate-y-20 opacity-0'
            )}
          >
            {/* Back button to return to portal state */}
            <button
              onClick={() => {
                setShowCreator(false);
                setIsAwakening(false);
              }}
              className="mb-8 text-sm text-muted-foreground transition-colors hover:text-white"
            >
              ← {t('home.returnToUniverse')}
            </button>

            {/* Mode Switcher - only for logged-in users */}
            {isLoggedIn && (
              <div className="mb-8 flex gap-4">
                {[
                  { mode: 'audio' as const, Icon: Mic, label: t('home.modes.audio') },
                  { mode: 'video' as const, Icon: Video, label: t('home.modes.video') },
                  { mode: 'music' as const, Icon: Music, label: 'Music' },
                ].map(({ mode, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setCreationMode(mode)}
                    className={cn(
                      'rounded-xl p-3 transition-all',
                      creationMode === mode
                        ? 'bg-electric/20 text-electric-glow'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </button>
                ))}
              </div>
            )}

            {/* Cool instruction text for guests in awakened state */}
            {!isLoggedIn && (
              <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-blue-100/60">
                {t('home.guestRecordingInstruction')}
              </p>
            )}

            <div className="w-full max-w-2xl">
              {creationMode === 'audio' && (
                <MicRecorder remixContent={remixContent} onSaveSuccess={handleSaveSuccess} />
              )}
              {creationMode === 'video' && isLoggedIn && <VideoCreator />}
              {creationMode === 'music' && isLoggedIn && (
                <MediaUploadZone
                  onSuccess={() => {
                    // MediaUploadZone handles its own navigation, just refresh the feed
                    if (refreshFeed && typeof refreshFeed === 'function') {
                      refreshFeed();
                    }
                  }}
                  onCancel={() => setCreationMode('audio')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Scroll Reveal Section (Optional / Light) */}
        {!isAwakening && (
          <div
            className={cn(
              'mt-32 w-full max-w-5xl opacity-0 transition-opacity delay-1000 duration-1000',
              mounted && 'opacity-100'
            )}
          >
            {/* We keep the community showcase but push it down significantly */}
            <div className="py-20 text-center text-sm uppercase tracking-widest text-muted-foreground/40">
              Scroll for more
            </div>
            <HomeCommunityShowcase onRemix={setRemixContent} onRefreshRequest={setRefreshFeed} />
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: BOTTOM_NAV_HEIGHT.BASE + 20 }} className="lg:hidden" />
      </main>

      {/* Global schemas (Organization, WebSite, WebApplication) are now injected
          in the locale layout for all pages. See lib/seo/global-schema.ts */}
    </div>
  );
}
