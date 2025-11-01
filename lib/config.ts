import { env, isDev, isProd } from './env';

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
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // AI Services
  ai: {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: 'gpt-4o-mini', // Upgraded from gpt-3.5-turbo: 3-4x faster, better quality, cheaper
      whisperModel: 'whisper-1',
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
    },
    elevenlabs: {
      apiKey: env.ELEVENLABS_API_KEY,
      apiUrl: 'https://api.elevenlabs.io/v1',
    },
  },

  // Rate limiting
  rateLimits: {
    transcription: {
      anonymous: { limit: isDev ? 10000 : 10000, window: '24 h' },
      authenticated: { limit: 10000, window: '15 m' },
    },
    generation: {
      anonymous: { limit: isDev ? 10000 : 10000, window: '24 h' },
      authenticated: { limit: 10000, window: '15 m' },
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
