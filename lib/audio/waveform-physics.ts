/**
 * Waveform Physics Library
 * Spring animation calculations and volume-reactive bar heights
 * Shared by desktop and mobile waveform components
 */

/**
 * Spring animation configuration
 */
export interface SpringConfig {
  /**
   * Spring stiffness (how quickly it responds)
   * @default 170
   */
  stiffness?: number;

  /**
   * Spring damping (how much it oscillates)
   * @default 26
   */
  damping?: number;

  /**
   * Mass of the spring
   * @default 1
   */
  mass?: number;
}

/**
 * Calculate spring physics for smooth animations
 * Based on critically damped spring equation
 */
export function calculateSpring(
  current: number,
  target: number,
  velocity: number,
  deltaTime: number,
  config: SpringConfig = {}
): { value: number; velocity: number } {
  const { stiffness = 170, damping = 26, mass = 1 } = config;

  // Spring force
  const springForce = -stiffness * (current - target);

  // Damping force
  const dampingForce = -damping * velocity;

  // Total acceleration
  const acceleration = (springForce + dampingForce) / mass;

  // Update velocity
  const newVelocity = velocity + acceleration * deltaTime;

  // Update position
  const newValue = current + newVelocity * deltaTime;

  // Stop when close enough (performance optimization)
  if (Math.abs(newValue - target) < 0.001 && Math.abs(newVelocity) < 0.001) {
    return { value: target, velocity: 0 };
  }

  return {
    value: newValue,
    velocity: newVelocity,
  };
}

/**
 * Normalize audio volume to 0-1 range
 * Applies logarithmic scaling for better visual representation
 */
export function normalizeVolume(value: number, min: number = 0, max: number = 255): number {
  // Clamp value
  const clamped = Math.max(min, Math.min(max, value));

  // Linear normalization
  const linear = (clamped - min) / (max - min);

  // Logarithmic scaling (makes quiet sounds more visible)
  // y = log(1 + x * 9) / log(10)
  // This maps 0->0, 0.5->0.35, 1->1
  const logarithmic = Math.log10(1 + linear * 9);

  return logarithmic;
}

/**
 * Calculate bar height from volume with scaling
 * Returns height value between minScale and maxScale
 */
export function calculateBarHeight(
  volume: number,
  baseHeight: number,
  minScale: number = 0.2,
  maxScale: number = 1.5
): number {
  // Normalize volume to 0-1
  const normalized = normalizeVolume(volume);

  // Map to scale range
  const scale = minScale + normalized * (maxScale - minScale);

  return baseHeight * scale;
}

/**
 * Interpolate between current and target heights
 * Used for smooth transitions between bar states
 */
export function interpolateHeight(current: number, target: number, speed: number = 0.2): number {
  return current + (target - current) * speed;
}

/**
 * Generate random bar heights for idle animation
 * Creates subtle movement when no audio input
 */
export function generateIdleHeights(
  barCount: number,
  baseHeight: number,
  varianceAmount: number = 0.1
): number[] {
  return Array.from({ length: barCount }, (_, i) => {
    // Use sine wave for smooth, organic movement
    const phase = (i / barCount) * Math.PI * 2;
    const time = Date.now() / 1000; // Current time in seconds

    // Slow wave movement
    const wave = Math.sin(phase + time * 0.5) * varianceAmount;

    // Random variance for each bar
    const random = (Math.random() - 0.5) * varianceAmount * 0.5;

    return baseHeight * (1 + wave + random);
  });
}

/**
 * Smooth out audio data to reduce jitter
 * Applies moving average filter
 */
export function smoothAudioData(data: Uint8Array, windowSize: number = 3): Uint8Array {
  const smoothed = new Uint8Array(data.length);
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < data.length) {
        sum += data[index];
        count++;
      }
    }

    smoothed[i] = sum / count;
  }

  return smoothed;
}

/**
 * Downsample audio data to match bar count
 * Averages values in each bucket
 */
export function downsampleAudioData(data: Uint8Array, targetCount: number): number[] {
  const result: number[] = [];
  const bucketSize = data.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);

    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += data[j];
    }

    result.push(sum / (end - start));
  }

  return result;
}

/**
 * Apply easing function to bar heights
 * Makes animations feel more natural
 */
export function applyEasing(
  value: number,
  easingFunction: 'easeIn' | 'easeOut' | 'easeInOut' = 'easeOut'
): number {
  switch (easingFunction) {
    case 'easeIn':
      return value * value;
    case 'easeOut':
      return 1 - (1 - value) * (1 - value);
    case 'easeInOut':
      return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
    default:
      return value;
  }
}

/**
 * Calculate waveform bar positions with perspective effect
 * Creates 3D-like depth on mobile
 */
export function calculatePerspectiveScale(
  index: number,
  totalBars: number,
  centerScale: number = 1.2
): number {
  // Distance from center (0 at center, 1 at edges)
  const normalizedPosition = Math.abs(index - totalBars / 2) / (totalBars / 2);

  // Scale is larger at center, smaller at edges
  return 1 + (centerScale - 1) * (1 - normalizedPosition);
}
