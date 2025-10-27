import '@testing-library/jest-dom';

// Mock next-intl for testing
vi.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      // Simple mock translations
      const translations: Record<string, string> = {
        'recorder.idle': 'Tap to start recording',
        'recorder.recording': 'Recording...',
        'recorder.processing': 'Processing your vibe...',
        'recorder.done': 'Complete! Tap to start over',
        'components.micRecorder.freePlanLimit': 'Free plan: {timeLimit} limit',
        'components.micRecorder.timeRemaining': '{seconds} seconds remaining',
      };

      let result = translations[key] || key;

      // Simple parameter replacement
      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          result = result.replace(`{${paramKey}}`, String(value));
        });
      }

      return result;
    },
  }),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Mic: vi.fn(() => null),
  Circle: vi.fn(() => null),
  Square: vi.fn(() => null),
  Loader2: vi.fn(() => null),
  Sparkles: vi.fn(() => null),
  Send: vi.fn(() => null),
  AlertTriangle: vi.fn(() => null),
}));

// Mock Supabase for testing
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  createServerAdminClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));
