"use client";

import { Navigation } from "@/components/Navigation";
import { useI18n } from "@/components/providers/I18nProvider";
import { Heart, MessageCircle, Share, User } from "lucide-react";

export default function About() {
  const { t } = useI18n();

  const handleShare = async () => {
    const shareData = {
      title: 'vibelog.io - About Yang',
      text: 'Check out the story behind vibelog.io and how voice-first content creation is changing everything. Built with vibe coding! 🚀',
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
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

          {/* Community Engagement Section */}
          <div className="bg-gradient-subtle rounded-3xl p-8 border border-border/20 mb-16">
            {/* Profile Section */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-1">Yang</h3>
              <p className="text-muted-foreground mb-2">Founder</p>
              <a 
                href="/vibeyang" 
                className="text-electric hover:text-electric-glow transition-colors"
              >
                @vibeyang
              </a>
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center justify-center space-x-8 mb-8">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Heart className="w-5 h-5" />
                <span>247 likes</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MessageCircle className="w-5 h-5" />
                <span>43 comments</span>
              </div>
              <button 
                onClick={handleShare}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Share className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Community Comments */}
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">A</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">@alexchen</span>
                    <span className="text-sm text-muted-foreground">2h ago</span>
                  </div>
                  <p className="text-muted-foreground">This is exactly what I needed! No more scattered notes</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">S</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">@sarahmiller</span>
                    <span className="text-sm text-muted-foreground">4h ago</span>
                  </div>
                  <p className="text-muted-foreground">The "vibe coding" approach is genius. Building with AI tools is the future.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">M</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">@mikejohnson</span>
                    <span className="text-sm text-muted-foreground">6h ago</span>
                  </div>
                  <p className="text-muted-foreground">Love the personal story behind this. Excited to try it out!</p>
                </div>
              </div>

              {/* Add Comment Input */}
              <div className="flex items-center space-x-3 pt-4 border-t border-border/20">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
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