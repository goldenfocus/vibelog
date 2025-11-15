'use client';

import { MessageCircle, Bot, Share2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
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
            <h1 className="mb-8 text-4xl font-bold leading-tight tracking-tight sm:mb-12 sm:text-6xl md:text-7xl lg:text-8xl">
              {t('hero.title.part1')}{' '}
              <span className="bg-gradient-electric bg-clip-text text-transparent">
                {t('hero.title.part2')}
              </span>
            </h1>
            <p className="mx-auto max-w-3xl px-4 text-lg font-normal leading-relaxed text-muted-foreground sm:text-xl md:text-2xl">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Main Mic Interface */}
          <div className="mb-20 flex justify-center">
            <MicRecorder remixContent={remixContent} />
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
        </div>
      </main>
    </div>
  );
}
