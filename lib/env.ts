import { z } from 'zod';

// Check if we're running on the server
const isServer = typeof window === 'undefined';

// Client-side environment validation (only NEXT_PUBLIC_ vars)
const clientEnvSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Database (public vars only)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

// Server-side environment validation (includes secrets)
const serverEnvSchema = clientEnvSchema.extend({
  // Database (server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters').optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // AI Services
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),

  // External Services
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_KEY: z.string().optional(),

  // Feature flags
  ANALYZE: z.string().optional(),
});

// Use appropriate schema based on environment
const envSchema = isServer ? serverEnvSchema : clientEnvSchema;

// Parse and validate environment variables
function validateEnv() {
  try {
    // On the client, Next.js replaces references like
    // process.env.NEXT_PUBLIC_... at build time, but process.env as an
    // object is not populated. Parsing process.env directly will fail and
    // produce scary console errors even though the values are inlined.
    // Build a minimal source object for client-side validation instead.
    const source = isServer
      ? process.env
      : {
          NODE_ENV: process.env.NODE_ENV as any,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        };

    const parsed = envSchema.parse(source);
    return parsed as any;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        issue => `❌ ${issue.path.join('.')}: ${issue.message}`
      );

      // On the server we keep errors loud; on the client we downgrade to a
      // single warn so we don't spam false negatives caused by bundling.
      if (isServer) {
        console.error('🚨 Environment validation failed:');
        console.error(errorMessages.join('\n'));
      } else {
        console.warn('⚠️  Client-side env check: some values missing.');
      }

      // In development, show helpful tips
      if (process.env.NODE_ENV === 'development') {
        console.error('\n💡 Tips:');
        console.error('- Copy .env.example to .env.local');
        console.error('- Fill in required environment variables');
        console.error('- Check the README.md for setup instructions');
      }

      // Only throw on server - on client, log and return process.env as-is
      // This prevents the app from crashing if env vars weren't bundled at build time
      if (isServer) {
        // In development, just warn instead of crashing to allow UI development
        if (process.env.NODE_ENV === 'development') {
          console.error('⚠️ Environment validation failed, but continuing for development...');
        } else {
          throw new Error(`Environment validation failed: ${errorMessages.join(', ')}`);
        }
      }
      // Client: return the minimal object we attempted to validate so
      // consumers still get the inlined values.
      return {
        NODE_ENV: (process.env.NODE_ENV as any) ?? 'production',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      } as z.infer<typeof envSchema>;
    }
    throw error;
  }
}

// Validated environment variables
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;

// Helper to check if we're in development
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Helper to safely get optional environment variables
export function getOptionalEnv(key: keyof Env): string | undefined {
  return env[key] as string | undefined;
}

// Helper to get required environment variables with better error messages
export function getRequiredEnv(key: keyof Env): string {
  const value = env[key] as string;
  if (!value) {
    throw new Error(`❌ Required environment variable ${key} is missing or empty`);
  }
  return value;
}
