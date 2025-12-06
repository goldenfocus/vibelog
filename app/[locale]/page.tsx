'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Video, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { VideoCreator } from '@/components/creation/VideoCreator';
import { Portal } from '@/components/home/Portal';
import MicRecorder from '@/components/MicRecorder';
import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';

function RemixHandler({ onRemixContent }: { onRemixContent: (content: string | null) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const remix = searchParams.get('remix');
    if (remix) {
      onRemixContent(decodeURIComponent(remix));
    }
  }, [searchParams, onRemixContent]);

  return null;
}

export default function Home() {
  const { isLoading } = useI18n();
  const [remixContent, setRemixContent] = useState<string | null>(null);
  const [isPortalActive, setIsPortalActive] = useState(false);
  const [creationMode, setCreationMode] = useState<'audio' | 'video'>('audio');

  const handlePortalClick = () => {
    setIsPortalActive(true);
    setCreationMode('audio');
  };

  const handleVideoInstead = () => {
    setIsPortalActive(true);
    setCreationMode('video');
  };

  const handleClose = () => {
    setIsPortalActive(false);
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background selection:bg-electric/30">
      <Suspense fallback={null}>
        <RemixHandler onRemixContent={setRemixContent} />
      </Suspense>

      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-electric/5 via-background to-background" />
        <div className="absolute left-0 right-0 top-0 h-[500px] bg-gradient-to-b from-electric/5 to-transparent opacity-50" />
      </div>

      {/* Minimal Navigation */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-electric/20" />
          <span className="text-lg font-bold tracking-tight">vibelog</span>
        </div>
        <Navigation />
      </header>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {!isPortalActive ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center"
            >
              {/* Portal */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 1, ease: 'easeOut' }}
                className="mb-12"
              >
                <Portal onClick={handlePortalClick} />
              </motion.div>

              {/* Text Content */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="max-w-xl space-y-6"
              >
                <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl md:text-7xl">
                  Your voice. <br />
                  <span className="bg-gradient-to-r from-electric via-electric-glow to-electric bg-clip-text text-transparent">
                    Your universe.
                  </span>
                </h1>

                <p className="text-lg text-muted-foreground sm:text-xl">
                  Speak or write your first vibe and watch your world come alive.
                </p>

                <button
                  onClick={handleVideoInstead}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Video className="h-4 w-4" />
                  <span>Record video</span>
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="creation"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full max-w-2xl"
            >
              <div className="relative rounded-3xl border border-white/10 bg-card/50 p-6 backdrop-blur-xl sm:p-10">
                <button
                  onClick={handleClose}
                  className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-8 flex justify-center gap-4">
                  <button
                    onClick={() => setCreationMode('audio')}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      creationMode === 'audio'
                        ? 'bg-electric/20 text-electric-glow ring-1 ring-electric/50'
                        : 'text-muted-foreground hover:text-white'
                    )}
                  >
                    <Mic className="h-4 w-4" />
                    Audio
                  </button>
                  <button
                    onClick={() => setCreationMode('video')}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      creationMode === 'video'
                        ? 'bg-electric/20 text-electric-glow ring-1 ring-electric/50'
                        : 'text-muted-foreground hover:text-white'
                    )}
                  >
                    <Video className="h-4 w-4" />
                    Video
                  </button>
                </div>

                <div className="min-h-[300px]">
                  {creationMode === 'audio' ? (
                    <MicRecorder remixContent={remixContent} onSaveSuccess={handleClose} />
                  ) : (
                    <VideoCreator />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
