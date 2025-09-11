"use client";

import { Navigation } from "@/components/Navigation";
import { useI18n } from "@/components/providers/I18nProvider";

export default function About() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              {t('pages.about.title')}
            </h1>
          </div>

          {/* Founder Video Placeholder */}
          <div className="mb-16 text-center">
            <div className="bg-card rounded-2xl border border-border/20 p-8 mb-6">
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-electric rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">▶️</span>
                  </div>
                  <p className="text-muted-foreground">{t('pages.about.founderVideo.placeholder')}</p>
                  <p className="text-sm text-muted-foreground">{t('pages.about.founderVideo.subtitle')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* The Problem */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">{t('pages.about.problem.title')}</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              {(() => {
                try {
                  const paragraphs = t('pages.about.problem.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch (error) {
                  return <p>Loading...</p>;
                }
              })()}
            </div>
          </section>

          {/* The Spark */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">{t('pages.about.spark.title')}</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              {(() => {
                try {
                  const paragraphs = t('pages.about.spark.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch (error) {
                  return <p>Loading...</p>;
                }
              })()}
            </div>
          </section>

          {/* The Solution */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">{t('pages.about.solution.title')}</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              {(() => {
                try {
                  const paragraphs = t('pages.about.solution.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch (error) {
                  return <p>Loading...</p>;
                }
              })()}
            </div>
          </section>

          {/* The Mission */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">{t('pages.about.mission.title')}</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
              {(() => {
                try {
                  const paragraphs = t('pages.about.mission.paragraphs');
                  if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    return paragraphs.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ));
                  }
                  return <p>{String(paragraphs)}</p>;
                } catch (error) {
                  return <p>Loading...</p>;
                }
              })()}
              <p className="text-xl font-semibold text-foreground">
                {t('pages.about.mission.tagline')}
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="flex items-center justify-center mb-16">
            <div className="h-px bg-border flex-1"></div>
            <div className="px-4 text-muted-foreground">⸻</div>
            <div className="h-px bg-border flex-1"></div>
          </div>

          {/* Founder Section */}
          <div className="text-center bg-gradient-subtle rounded-3xl p-12 border border-border/20">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">👤</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('pages.about.founder.name')}</h3>
            <p className="text-muted-foreground mb-4">{t('pages.about.founder.role')}</p>
            <a 
              href="/yanlovez" 
              className="inline-flex items-center text-electric hover:text-electric-glow transition-colors"
            >
              {t('pages.about.founder.handle')}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}