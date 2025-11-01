import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
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

// Parse and validate environment variables
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        issue => `❌ ${issue.path.join('.')}: ${issue.message}`
      );

      console.error('🚨 Environment validation failed:');
      console.error(errorMessages.join('\n'));

      // In development, show helpful tips
      if (process.env.NODE_ENV === 'development') {
        console.error('\n💡 Tips:');
        console.error('- Copy .env.example to .env.local');
        console.error('- Fill in required environment variables');
        console.error('- Check the README.md for setup instructions');
      }

      throw new Error(`Environment validation failed: ${errorMessages.join(', ')}`);
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
