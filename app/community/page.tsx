'use client';

import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';

export default function Community() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl">{t('pages.community.title')}</h1>
            <p className="text-xl text-muted-foreground">{t('pages.community.subtitle')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border/20 bg-card p-6">
              <h2 className="mb-2 text-2xl font-semibold">
                {t('pages.community.announcements.title')}
              </h2>
              <p className="text-muted-foreground">
                {t('pages.community.announcements.description')}
              </p>
            </div>
            <div className="rounded-2xl border border-border/20 bg-card p-6">
              <h2 className="mb-2 text-2xl font-semibold">{t('pages.community.showcase.title')}</h2>
              <p className="text-muted-foreground">{t('pages.community.showcase.description')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
