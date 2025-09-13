import '@testing-library/jest-dom'

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
      }
      
      let result = translations[key] || key
      
      // Simple parameter replacement
      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          result = result.replace(`{${paramKey}}`, String(value))
        })
      }
      
      return result
    }
  })
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Mic: vi.fn(() => null),
  Circle: vi.fn(() => null),
}))