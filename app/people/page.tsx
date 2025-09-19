'use client';

import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';

export default function People() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl">{t('pages.people.title')}</h1>
            <p className="text-xl text-muted-foreground">{t('pages.people.subtitle')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border/20 bg-card p-6">
                <div className="mb-4 h-16 w-16 rounded-full bg-muted" />
                <h3 className="text-lg font-semibold">@creator{i}</h3>
                <p className="text-sm text-muted-foreground">{t('pages.people.creatorBio')}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
