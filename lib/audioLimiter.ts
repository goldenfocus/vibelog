/**
 * Audio Preview Limiter
 * Limits audio playback to a maximum duration for anonymous users
 */

import { toast } from 'sonner';

import { useAudioPlayerStore } from '@/state/audio-player-store';

const PREVIEW_LIMIT_SECONDS = 9; // Anonymous users can listen for 9 seconds
const FADE_OUT_DURATION = 3000; // 3 second fade out (from 6s to 9s)
const FADE_START_SECONDS = 6; // Start fading at 6 seconds

interface PreviewLimiterOptions {
  onLimitReached?: () => void;
  onSignInPrompt?: () => void;
  trackId: string;
  creatorDisplayName?: string;
  creatorUsername?: string;
}

export class AudioPreviewLimiter {
  private timeUpdateHandler: ((time: number) => void) | null = null;
  private limitReachTimeoutId: number | null = null;
  private fadeIntervalId: number | null = null;
  private originalVolume: number = 1.0;
  private isLimited: boolean = false;

  constructor(private options: PreviewLimiterOptions) {}

  /**
   * Start monitoring audio playback for preview limits
   */
  start() {
    const store = useAudioPlayerStore.getState();
    const audioElement = store.audioElement;

    if (!audioElement) {
      console.warn('[AudioLimiter] No audio element found');
      return;
    }

    this.originalVolume = store.volume;
    this.isLimited = false;

    // Listen to time updates
    this.timeUpdateHandler = (currentTime: number) => {
      if (this.isLimited) {
        return;
      }

      // Start fading out at 6 seconds
      if (currentTime >= FADE_START_SECONDS && currentTime < PREVIEW_LIMIT_SECONDS) {
        this.startFadeOut();
      }

      // Hard stop at 9 seconds
      if (currentTime >= PREVIEW_LIMIT_SECONDS) {
        this.stop();
        this.showSignInPrompt();
      }
    };

    // Use audio element's native timeupdate event for precise timing
    const nativeHandler = () => {
      if (this.timeUpdateHandler) {
        this.timeUpdateHandler(audioElement.currentTime);
      }
    };

    audioElement.addEventListener('timeupdate', nativeHandler);

    // Store handler for cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.timeUpdateHandler as any).__nativeHandler = nativeHandler;

    console.log('[AudioLimiter] Started monitoring playback (limit: 9s, fade at 6s)');
  }

  /**
   * Gradually fade out volume before stopping
   */
  private startFadeOut() {
    if (this.fadeIntervalId !== null) {
      return;
    } // Already fading

    const store = useAudioPlayerStore.getState();
    const audioElement = store.audioElement;
    if (!audioElement) {
      return;
    }

    const fadeSteps = 30; // More steps for smoother 3-second fade
    const fadeStepDuration = FADE_OUT_DURATION / fadeSteps;
    const volumeStep = this.originalVolume / fadeSteps;
    let currentStep = 0;

    this.fadeIntervalId = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, this.originalVolume - volumeStep * currentStep);

      if (audioElement) {
        audioElement.volume = newVolume;
      }

      if (currentStep >= fadeSteps) {
        if (this.fadeIntervalId !== null) {
          clearInterval(this.fadeIntervalId);
          this.fadeIntervalId = null;
        }
      }
    }, fadeStepDuration);

    console.log('[AudioLimiter] Started fade out at 6s');
  }

  /**
   * Stop playback and show sign-in prompt
   */
  private stop() {
    if (this.isLimited) {
      return;
    } // Already stopped
    this.isLimited = true;

    const store = useAudioPlayerStore.getState();
    const audioElement = store.audioElement;

    if (audioElement) {
      audioElement.pause();
      store.setIsPlaying(false);

      // Restore original volume
      audioElement.volume = this.originalVolume;
      store.setVolume(this.originalVolume);
    }

    this.cleanup();
    this.options.onLimitReached?.();

    console.log('[AudioLimiter] Playback stopped at preview limit');
  }

  /**
   * Show toast message encouraging sign-in with creator name
   */
  private showSignInPrompt() {
    const creatorName =
      this.options.creatorDisplayName || this.options.creatorUsername || 'this creator';

    toast(`Login to listen to the full VibeLog of ${creatorName}`, {
      duration: 5000,
      action: {
        label: 'Sign In',
        onClick: () => {
          this.options.onSignInPrompt?.();
          // Redirect to auth page
          window.location.href = '/auth/signin';
        },
      },
    });
  }

  /**
   * Cleanup listeners and timers
   */
  cleanup() {
    if (this.limitReachTimeoutId !== null) {
      clearTimeout(this.limitReachTimeoutId);
      this.limitReachTimeoutId = null;
    }

    if (this.fadeIntervalId !== null) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }

    if (this.timeUpdateHandler) {
      const store = useAudioPlayerStore.getState();
      const audioElement = store.audioElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (audioElement && (this.timeUpdateHandler as any).__nativeHandler) {
        audioElement.removeEventListener(
          'timeupdate',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.timeUpdateHandler as any).__nativeHandler
        );
      }

      this.timeUpdateHandler = null;
    }

    console.log('[AudioLimiter] Cleaned up');
  }
}

/**
 * Create and start an audio preview limiter for anonymous users
 */
export function createPreviewLimiter(options: PreviewLimiterOptions): AudioPreviewLimiter {
  const limiter = new AudioPreviewLimiter(options);
  limiter.start();
  return limiter;
}
