'use client';

import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Share2,
  Download,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers/I18nProvider';

interface EnhancedUIProps {
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

export function EnhancedUI({
  isRecording,
  isPlaying,
  volume,
  onToggleRecording,
  onTogglePlayback,
  onVolumeChange,
  onShare,
  onDownload,
  onSettings,
}: EnhancedUIProps) {
  const { t } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const controls = useAnimation();
  const micRef = useRef<HTMLButtonElement>(null);

  // Animate mic button based on recording state
  useEffect(() => {
    if (isRecording) {
      controls.start({
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          repeatType: 'reverse',
        },
      });
    } else {
      controls.start({
        scale: 1,
        rotate: 0,
      });
    }
  }, [isRecording, controls]);

  // Haptic feedback for mobile
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleMicClick = () => {
    triggerHaptic();
    onToggleRecording();
  };

  const handlePlayClick = () => {
    triggerHaptic();
    onTogglePlayback();
  };

  return (
    <div className="relative">
      {/* Main Recording Interface */}
      <div className="flex flex-col items-center space-y-6">
        {/* Mic Button with Enhanced Animation */}
        <motion.button
          ref={micRef}
          onClick={handleMicClick}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          animate={controls}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
            isRecording
              ? 'bg-red-500 shadow-lg shadow-red-500/50'
              : 'bg-electric shadow-lg shadow-electric/50'
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
                <MicOff className="h-8 w-8 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="start"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.2 }}
              >
                <Mic className="h-8 w-8 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording Pulse Ring */}
          {isRecording && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 0.4, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Hover Effect */}
          {isHovered && !isRecording && (
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.button>

        {/* Status Text with Animation */}
        <motion.div
          key={isRecording ? 'recording' : 'idle'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold">
            {isRecording ? t('recorder.recording') : t('recorder.idle')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRecording ? t('recorder.recordingHint') : t('recorder.idleHint')}
          </p>
        </motion.div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          {/* Play/Pause Button */}
          <motion.button
            onClick={handlePlayClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
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
                  <Pause className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Play className="h-5 w-5" />
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
              className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              aria-label="Volume control"
            >
              {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </motion.button>

            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform rounded-lg border bg-card p-3 shadow-lg"
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={e => onVolumeChange(Number(e.target.value))}
                    className="h-2 w-24 cursor-pointer appearance-none rounded-lg bg-muted"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume}%, #e5e7eb ${volume}%, #e5e7eb 100%)`,
                    }}
                  />
                  <div className="mt-1 text-center text-xs">{volume}%</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <motion.button
              onClick={onShare}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </motion.button>

            <motion.button
              onClick={onDownload}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </motion.button>

            <motion.button
              onClick={onSettings}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Accessibility Features */}
      <div className="sr-only">
        <p>
          {isRecording
            ? 'Recording in progress. Press the microphone button to stop recording.'
            : 'Ready to record. Press the microphone button to start recording.'}
        </p>
        <p>Volume is set to {volume}%</p>
        <p>{isPlaying ? 'Audio is playing' : 'Audio is paused'}</p>
      </div>
    </div>
  );
}

// Enhanced Waveform Component
interface EnhancedWaveformProps {
  levels: number[];
  isActive: boolean;
  variant?: 'recording' | 'playback';
}

export function EnhancedWaveform({
  levels,
  isActive,
  variant = 'recording',
}: EnhancedWaveformProps) {
  return (
    <div className="flex h-16 items-center justify-center space-x-1">
      {levels.map((level, index) => (
        <motion.div
          key={`waveform-${Date.now()}-${index}`}
          className={`w-1 rounded-full ${variant === 'recording' ? 'bg-red-500' : 'bg-electric'}`}
          style={{ height: `${Math.max(4, level * 60)}px` }}
          animate={
            isActive
              ? {
                  height: `${Math.max(4, level * 60)}px`,
                  opacity: [0.6, 1, 0.6],
                }
              : {
                  height: '4px',
                  opacity: 0.3,
                }
          }
          transition={{
            duration: 0.1,
            repeat: isActive ? Infinity : 0,
            repeatType: 'reverse',
            delay: index * 0.02,
          }}
        />
      ))}
    </div>
  );
}

// Enhanced Loading Component
interface EnhancedLoadingProps {
  message?: string;
  progress?: number;
}

export function EnhancedLoading({ message = 'Loading...', progress }: EnhancedLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <motion.div
        className="h-12 w-12 rounded-full border-4 border-electric border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-muted-foreground"
      >
        {message}
      </motion.p>

      {progress !== undefined && (
        <div className="h-2 w-48 rounded-full bg-muted">
          <motion.div
            className="h-2 rounded-full bg-electric"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  );
}
