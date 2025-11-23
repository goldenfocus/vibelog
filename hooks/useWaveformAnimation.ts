/**
 * useWaveformAnimation Hook
 * Manages smooth, spring-based waveform animations
 * Reacts to audio volume with physics-based movement
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import {
  calculateSpring,
  calculateBarHeight,
  downsampleAudioData,
  smoothAudioData,
  generateIdleHeights,
  SpringConfig,
} from '@/lib/audio/waveform-physics';

export interface WaveformAnimationOptions {
  /**
   * Number of bars to display
   * @default 40
   */
  barCount?: number;

  /**
   * Base height of bars (pixels)
   * @default 80
   */
  baseHeight?: number;

  /**
   * Minimum scale multiplier
   * @default 0.2
   */
  minScale?: number;

  /**
   * Maximum scale multiplier
   * @default 1.5
   */
  maxScale?: number;

  /**
   * Spring animation config
   */
  springConfig?: SpringConfig;

  /**
   * Enable idle animation when no audio
   * @default true
   */
  enableIdleAnimation?: boolean;
}

export interface WaveformBar {
  height: number;
  velocity: number;
}

/**
 * Animated waveform bars from audio data
 * Returns array of bar heights with smooth spring physics
 *
 * @example
 * const { bars, updateAudioData } = useWaveformAnimation({
 *   barCount: 40,
 *   baseHeight: 120,
 * });
 *
 * // Update with audio analyzer data
 * useEffect(() => {
 *   if (analyzerRef.current) {
 *     const update = () => {
 *       const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
 *       analyzerRef.current.getByteFrequencyData(dataArray);
 *       updateAudioData(dataArray);
 *       requestAnimationFrame(update);
 *     };
 *     update();
 *   }
 * }, [updateAudioData]);
 */
export function useWaveformAnimation(options: WaveformAnimationOptions = {}) {
  const {
    barCount = 40,
    baseHeight = 80,
    minScale = 0.2,
    maxScale = 1.5,
    springConfig = {},
    enableIdleAnimation = true,
  } = options;

  // Bar states (height + velocity for spring physics)
  const [bars, setBars] = useState<WaveformBar[]>(() =>
    Array.from({ length: barCount }, () => ({
      height: baseHeight * minScale,
      velocity: 0,
    }))
  );

  // Target heights from audio data
  const targetHeightsRef = useRef<number[]>(Array(barCount).fill(baseHeight * minScale));

  // Animation frame ID
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Last frame timestamp
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Is audio active (has input)
  const hasAudioRef = useRef(false);

  // Idle animation timer
  const idleTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * Update target heights from audio data
   */
  const updateAudioData = useCallback(
    (audioData: Uint8Array) => {
      hasAudioRef.current = true;

      // Clear idle timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      // Start idle animation after 1 second of no audio
      idleTimerRef.current = setTimeout(() => {
        hasAudioRef.current = false;
      }, 1000);

      // Smooth the data to reduce jitter
      const smoothed = smoothAudioData(audioData, 3);

      // Downsample to match bar count
      const downsampled = downsampleAudioData(smoothed, barCount);

      // Calculate target heights
      targetHeightsRef.current = downsampled.map(volume =>
        calculateBarHeight(volume, baseHeight, minScale, maxScale)
      );
    },
    [barCount, baseHeight, minScale, maxScale]
  );

  /**
   * Animation loop
   */
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastFrameTimeRef.current) / 1000, 0.1);
      lastFrameTimeRef.current = now;

      // If no audio and idle animation enabled, generate idle heights
      if (!hasAudioRef.current && enableIdleAnimation) {
        const idleHeights = generateIdleHeights(barCount, baseHeight, 0.15);
        targetHeightsRef.current = idleHeights;
      }

      // Update bars with spring physics
      setBars(prevBars =>
        prevBars.map((bar, index) => {
          const target = targetHeightsRef.current[index];
          const spring = calculateSpring(bar.height, target, bar.velocity, deltaTime, springConfig);

          return {
            height: spring.value,
            velocity: spring.velocity,
          };
        })
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [barCount, baseHeight, springConfig, enableIdleAnimation]);

  return {
    bars,
    updateAudioData,
  };
}
