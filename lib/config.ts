import { env, isDev, isProd } from './env';

// Check if we're on the server
const isServer = typeof window === 'undefined';

// Application configuration
export const config = {
  // App settings
  app: {
    name: 'VibeLog',
    url: env.NEXT_PUBLIC_APP_URL || 'https://vibelog.io',
    description: 'Voice-to-content that turns your thoughts into beautiful posts—instantly.',
  },

  // Database
  database: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: (isServer ? (env as any).SUPABASE_SERVICE_ROLE_KEY : undefined) as
      | string
      | undefined,
  },

  // AI Services (server-only)
  ai: {
    openai: {
      apiKey: (isServer ? (env as any).OPENAI_API_KEY : undefined) as string | undefined,
      model: 'gpt-4o-mini', // Upgraded from gpt-3.5-turbo: 3-4x faster, better quality, cheaper
      whisperModel: 'whisper-1',
    },
    anthropic: {
      apiKey: (isServer ? (env as any).ANTHROPIC_API_KEY : undefined) as string | undefined,
    },
    elevenlabs: {
      apiKey: (isServer ? (env as any).ELEVENLABS_API_KEY : undefined) as string | undefined,
      apiUrl: 'https://api.elevenlabs.io/v1',
    },
    google: {
      apiKey: (isServer ? (env as any).GOOGLE_API_KEY : undefined) as string | undefined,
      model: 'imagen-3.0-generate-002', // Google Imagen 3 (correct model name)
    },
  },

  // Rate limiting - AGGRESSIVE COST PROTECTION
  // Limits are per-user per-day to prevent cost spikes ($50/day circuit breaker)
  // TODO: Lower these after testing! Currently set high for testing.
  rateLimits: {
    transcription: {
      anonymous: { limit: 100, window: '24 h' }, // TESTING: was 10
      authenticated: { limit: 1000, window: '24 h' }, // TESTING: was 100
    },
    generation: {
      anonymous: { limit: 100, window: '24 h' }, // TESTING: was 5
      authenticated: { limit: 1000, window: '24 h' }, // TESTING: was 50
    },
    tts: {
      anonymous: { limit: 100, window: '24 h' }, // TESTING: was 3
      authenticated: { limit: 1000, window: '24 h' }, // TESTING: was 20
    },
    images: {
      anonymous: { limit: 100, window: '24 h' }, // TESTING: was 2
      authenticated: { limit: 1000, window: '24 h' }, // TESTING: was 10
    },
  },

  // Features
  features: {
    analytics: isProd,
    errorReporting: isProd,
    monitoring: isProd,
    debugMode: isDev,
  },

  // File constraints
  files: {
    audio: {
      maxSize: 500 * 1024 * 1024, // 500MB (enough for 30min recordings via direct storage upload)
      maxDuration: 30 * 60, // 30 minutes in seconds
      allowedTypes: [
        'audio/webm',
        'audio/wav',
        'audio/mpeg',
        'audio/mp4',
        'audio/ogg',
        'audio/x-wav',
        'audio/ogg; codecs=opus',
        'video/webm', // Support video recordings
        'video/mp4',
        'video/quicktime',
      ],
      minSize: 1024, // 1KB
    },
    transcript: {
      maxLength: 10000, // 10k characters
    },
  },

  // Voice cloning constraints
  voiceCloning: {
    // Lower than 512KB so ~30s low-bitrate recordings still qualify
    minBytes: 300 * 1024, // 300KB
    minDuration: 3, // 3 seconds (lowered for anonymous users)
  },

  // UI constraints
  ui: {
    recording: {
      maxDuration: 300, // 5 minutes for free plan
      warningThreshold: 20, // Show warning 20 seconds before limit
    },
  },
} as const;

// Type-safe config access
export type Config = typeof config;
