'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Download,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';

interface MobileOptimizedProps {
  isRecording: boolean;
  isPlaying: boolean;
  volume: number;
  onToggleRecording: () => void;
  onTogglePlayback: () => void;
  onVolumeChange: (volume: number) => void;
  onShare: () => void;
  onDownload: () => void;
  onSettings: () => void;
}

export function MobileOptimized({
  isRecording,
  isPlaying,
  volume,
  onToggleRecording,
  onTogglePlayback,
  onVolumeChange,
  onShare,
  onDownload,
  onSettings,
}: MobileOptimizedProps) {
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const micRef = useRef<HTMLButtonElement>(null);

  // Touch handling for mobile gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      return;
    }

    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    const isDownSwipe = distance < -50;

    if (isUpSwipe) {
      setIsMenuOpen(true);
    } else if (isDownSwipe) {
      setIsMenuOpen(false);
    }
  };

  // Haptic feedback for mobile
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  };

  // Prevent zoom on double tap
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  const handleMicClick = () => {
    triggerHaptic();
    onToggleRecording();
  };

  const handlePlayClick = () => {
    triggerHaptic();
    onTogglePlayback();
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Main Interface */}
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex w-full items-center justify-between"
        >
          <h1 className="text-xl font-bold">VibeLog</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Main Recording Interface */}
        <div className="flex flex-col items-center space-y-8">
          {/* Mic Button - Larger for mobile */}
          <motion.button
            ref={micRef}
            onClick={handleMicClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300 ${
              isRecording
                ? 'bg-red-500 shadow-2xl shadow-red-500/50'
                : 'bg-electric shadow-2xl shadow-electric/50'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -180 }}
                  transition={{ duration: 0.2 }}
                >
                  <MicOff className="h-12 w-12 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="start"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Mic className="h-12 w-12 text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording Pulse Ring */}
            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-red-400"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.8, 0.2, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.button>

          {/* Status Text */}
          <motion.div
            key={isRecording ? 'recording' : 'idle'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <h2 className="mb-2 text-2xl font-bold">
              {isRecording ? t('recorder.recording') : t('recorder.idle')}
            </h2>
            <p className="text-muted-foreground">
              {isRecording ? t('recorder.recordingHint') : t('recorder.idleHint')}
            </p>
          </motion.div>

          {/* Control Buttons - Horizontal Layout for Mobile */}
          <div className="flex items-center space-x-6">
            {/* Play/Pause Button */}
            <motion.button
              onClick={handlePlayClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Pause className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Play className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Volume Control */}
            <div className="relative">
              <motion.button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                aria-label="Volume control"
              >
                {volume > 0 ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </motion.button>

              <AnimatePresence>
                {showVolumeSlider && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 transform rounded-lg border bg-card p-4 shadow-lg"
                  >
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={e => onVolumeChange(Number(e.target.value))}
                      className="h-3 w-32 cursor-pointer appearance-none rounded-lg bg-muted"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume}%, #e5e7eb ${volume}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="mt-2 text-center text-sm">{volume}%</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-0 left-0 right-0 border-t bg-card p-4"
        >
          <div className="flex items-center justify-around">
            <motion.button
              onClick={onShare}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center space-y-1 p-2"
              aria-label="Share"
            >
              <Share2 className="h-6 w-6" />
              <span className="text-xs">Share</span>
            </motion.button>

            <motion.button
              onClick={onDownload}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center space-y-1 p-2"
              aria-label="Download"
            >
              <Download className="h-6 w-6" />
              <span className="text-xs">Download</span>
            </motion.button>

            <motion.button
              onClick={onSettings}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center space-y-1 p-2"
              aria-label="Settings"
            >
              <Settings className="h-6 w-6" />
              <span className="text-xs">Settings</span>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-80 border-l bg-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Menu</h2>
                  <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accessibility Features */}
      <div className="sr-only">
        <p>
          {isRecording
            ? 'Recording in progress. Press the microphone button to stop recording.'
            : 'Ready to record. Press the microphone button to start recording.'}
        </p>
        <p>Volume is set to {volume}%</p>
        <p>{isPlaying ? 'Audio is playing' : 'Audio is paused'}</p>
        <p>Use swipe gestures to open and close the menu</p>
      </div>
    </div>
  );
}
