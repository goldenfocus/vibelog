"use client";

import { Navigation } from "@/components/Navigation";
import { useI18n } from "@/components/providers/I18nProvider";

export default function Community() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {t('pages.community.title')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('pages.community.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card rounded-2xl border border-border/20 p-6">
              <h2 className="text-2xl font-semibold mb-2">{t('pages.community.announcements.title')}</h2>
              <p className="text-muted-foreground">{t('pages.community.announcements.description')}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border/20 p-6">
              <h2 className="text-2xl font-semibold mb-2">{t('pages.community.showcase.title')}</h2>
              <p className="text-muted-foreground">{t('pages.community.showcase.description')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
