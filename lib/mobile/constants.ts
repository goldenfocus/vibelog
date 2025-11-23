/**
 * Mobile-First Design Constants
 * Single source of truth for all mobile design tokens
 */

// Touch Target Sizes (following Apple's Human Interface Guidelines)
export const TOUCH_TARGETS = {
  // Minimum recommended by Apple (44x44pt) and Android (48x48dp)
  MINIMUM: 48,

  // Comfortable for primary actions
  COMFORTABLE: 56,

  // Heroic size for critical actions (like mic button)
  HEROIC: 240,

  // Icon-only buttons
  ICON: 48,
} as const;

// Safe Area CSS Variables (iOS notch, Android gesture bars, etc)
export const SAFE_AREA = {
  top: 'env(safe-area-inset-top, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
} as const;

// Breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Haptic Feedback Patterns (milliseconds)
export const HAPTIC_PATTERNS = {
  // Light tap feedback (10ms)
  LIGHT: 10,

  // Medium action confirmation (25ms)
  MEDIUM: 25,

  // Heavy important action (50ms)
  HEAVY: 50,

  // Success pattern (vibrate, pause, vibrate)
  SUCCESS: [50, 30, 50],

  // Error pattern (short bursts)
  ERROR: [25, 15, 25, 15, 25],

  // Recording started (long press)
  RECORDING_START: 100,

  // Recording stopped (double tap)
  RECORDING_STOP: [50, 30, 50],
} as const;

// Bottom Navigation Height
export const BOTTOM_NAV_HEIGHT = {
  // Base height (without safe area)
  BASE: 64,

  // With safe area (computed at runtime)
  // Total = BASE + safe-area-inset-bottom
} as const;

// Mobile Recording UI
export const RECORDING_UI = {
  // Waveform heights
  WAVEFORM_HEIGHT: {
    MOBILE: 120,
    DESKTOP: 80,
  },

  // Transcription font sizes
  TRANSCRIPTION_FONT: {
    MOBILE: 24,
    DESKTOP: 16,
  },

  // Control button sizes in recording mode
  CONTROL_BUTTON_SIZE: 56,
} as const;

// Animation Durations (milliseconds)
export const ANIMATIONS = {
  // Quick interactions
  FAST: 150,

  // Standard transitions
  NORMAL: 250,

  // Slower, more dramatic
  SLOW: 400,

  // Page transitions
  PAGE: 300,

  // Bottom sheet slide
  SHEET: 350,
} as const;

// Z-Index Layers
export const Z_INDEX = {
  BOTTOM_NAV: 40,
  AUDIO_PLAYER: 50,
  MODAL: 60,
  FULLSCREEN: 70,
  TOAST: 80,
} as const;

// Gesture Thresholds
export const GESTURES = {
  // Minimum swipe distance (pixels)
  SWIPE_THRESHOLD: 50,

  // Maximum time for swipe (milliseconds)
  SWIPE_MAX_TIME: 300,

  // Long press duration
  LONG_PRESS_DURATION: 500,

  // Double tap max time between taps
  DOUBLE_TAP_MAX_DELAY: 300,

  // Pull to refresh threshold
  PULL_THRESHOLD: 80,
} as const;

// Audio Player Heights
export const AUDIO_PLAYER = {
  MINI_HEIGHT: 80,
  FULL_HEIGHT: 400,
} as const;

// Type exports for type safety
export type TouchTargetSize = (typeof TOUCH_TARGETS)[keyof typeof TOUCH_TARGETS];
export type HapticPattern = (typeof HAPTIC_PATTERNS)[keyof typeof HAPTIC_PATTERNS];
export type AnimationDuration = (typeof ANIMATIONS)[keyof typeof ANIMATIONS];
