"use client";

import { Navigation } from "@/components/Navigation";
import { useI18n } from "@/components/providers/I18nProvider";

export default function People() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {t('pages.people.title')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('pages.people.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/20 p-6">
                <div className="w-16 h-16 bg-muted rounded-full mb-4" />
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
