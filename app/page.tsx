"use client";

import { MessageCircle, Bot, Share2 } from "lucide-react";

import MicRecorder from "@/components/MicRecorder";
import Navigation from "@/components/Navigation";
import { useI18n } from "@/components/providers/I18nProvider";


export default function Home() {
  const { t, isLoading } = useI18n();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-electric border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <main className="pt-20 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 sm:mb-24">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-8 sm:mb-12 leading-tight tracking-tight">
              {t('hero.title.part1')}{" "}
              <span className="bg-gradient-electric bg-clip-text text-transparent">
                {t('hero.title.part2')}
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-normal px-4">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Main Mic Interface */}
          <div className="mb-20 flex justify-center">
            <MicRecorder />
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 mb-20 max-w-4xl mx-auto">
            <div className="text-center p-3 sm:p-6 md:p-8 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-border/50 hover:bg-card/90 transition-all duration-300">
              <div className="flex items-center justify-center mb-3 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground">{t('features.input.title')}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('features.input.description')}
              </p>
            </div>
            
            <div className="text-center p-3 sm:p-6 md:p-8 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-border/50 hover:bg-card/90 transition-all duration-300">
              <div className="flex items-center justify-center mb-3 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground">{t('features.aiMagic.title')}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('features.aiMagic.description')}
              </p>
            </div>
            
            <div className="text-center p-3 sm:p-6 md:p-8 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-border/50 hover:bg-card/90 transition-all duration-300">
              <div className="flex items-center justify-center mb-3 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Share2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-foreground">{t('features.share.title')}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('features.share.description')}
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
