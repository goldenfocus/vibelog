import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import ProcessingAnimation from '@/components/mic/ProcessingAnimation';
import { I18nProvider } from '@/components/providers/I18nProvider';

// Mock the i18n provider and translations
const mockTranslations = {
  'components.micRecorder.symphony.captureTitle': 'Capturing Audio',
  'components.micRecorder.symphony.captureDesc': 'Securing your audio recording',
  'components.micRecorder.symphony.transcribeTitle': 'Transcribing',
  'components.micRecorder.symphony.transcribeDesc': 'Converting speech to text',
  'components.micRecorder.symphony.cleanTitle': 'Cleaning',
  'components.micRecorder.symphony.cleanDesc': 'Removing noise and artifacts',
  'components.micRecorder.symphony.expandTitle': 'Expanding',
  'components.micRecorder.symphony.expandDesc': 'Enhancing content structure',
  'components.micRecorder.symphony.structureTitle': 'Structuring',
  'components.micRecorder.symphony.structureDesc': 'Organizing into sections',
  'components.micRecorder.symphony.formatTitle': 'Formatting',
  'components.micRecorder.symphony.formatDesc': 'Applying blog formatting',
  'components.micRecorder.symphony.optimizeTitle': 'Optimizing',
  'components.micRecorder.symphony.optimizeDesc': 'Enhancing readability',
  'components.micRecorder.symphony.socialTitle': 'Social Ready',
  'components.micRecorder.symphony.socialDesc': 'Preparing for social media',
  'components.micRecorder.symphony.seoTitle': 'SEO Boost',
  'components.micRecorder.symphony.seoDesc': 'Optimizing for search',
  'components.micRecorder.symphony.rssTitle': 'RSS Ready',
  'components.micRecorder.symphony.rssDesc': 'Preparing RSS feed',
  'components.micRecorder.symphony.htmlTitle': 'HTML Perfect',
  'components.micRecorder.symphony.htmlDesc': 'Generating clean HTML',
  'components.micRecorder.symphony.polishTitle': 'Final Polish',
  'components.micRecorder.symphony.polishDesc': 'Adding final touches'
};

const MockI18nProvider = ({ children }: { children: React.ReactNode }) => {
  const mockT = (key: string) => mockTranslations[key as keyof typeof mockTranslations] || key;
  
  return (
    <I18nProvider locale="en" translations={mockTranslations}>
      {children}
    </I18nProvider>
  );
};

// Helper to render with I18n context
const renderWithI18n = (component: React.ReactElement) => {
  return render(
    <MockI18nProvider>
      {component}
    </MockI18nProvider>
  );
};

describe('ProcessingAnimation', () => {
  let mockOnTranscribeComplete: ReturnType<typeof vi.fn>;
  let mockOnGenerateComplete: ReturnType<typeof vi.fn>;
  let mockOnAnimationComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock API functions
    mockOnTranscribeComplete = vi.fn().mockResolvedValue('Mock transcription result');
    mockOnGenerateComplete = vi.fn().mockResolvedValue('Mock blog content');
    mockOnAnimationComplete = vi.fn();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock timers for controlled testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Visibility and Initial State', () => {
    it('should not render when isVisible is false', () => {
      renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.queryByText('⚡ Vibelogging your content...')).not.toBeInTheDocument();
    });

    it('should render when isVisible is true', () => {
      renderWithI18n(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
    });

    it('should show loading spinner and header', () => {
      renderWithI18n(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for spinner (by its CSS classes)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Check for header text
      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
    });

    it('should show background particles effects', () => {
      renderWithI18n(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for particle elements with specific classes
      const particles = document.querySelectorAll('.animate-pulse, .animate-ping');
      expect(particles.length).toBeGreaterThan(0);
    });
  });

  describe('Animation Timing Based on Recording Duration', () => {
    it('should use fast timing for short recordings (< 30s)', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={15}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
          onAnimationComplete={mockOnAnimationComplete}
        />
      );

      // Make visible to start animation
      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={15}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
            onAnimationComplete={mockOnAnimationComplete}
          />
        </MockI18nProvider>
      );

      // Fast forward first step (800ms for short recordings)
      await act(async () => {
        vi.advanceTimersByTime(800);
      });

      // Should have progressed to first step
      await waitFor(() => {
        expect(screen.getByText('Capturing Audio')).toBeInTheDocument();
      });
    });

    it('should use medium timing for medium recordings (30-120s)', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={60}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
          onAnimationComplete={mockOnAnimationComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={60}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
            onAnimationComplete={mockOnAnimationComplete}
          />
        </MockI18nProvider>
      );

      // Medium timing (1200ms)
      await act(async () => {
        vi.advanceTimersByTime(1200);
      });

      await waitFor(() => {
        expect(screen.getByText('Capturing Audio')).toBeInTheDocument();
      });
    });

    it('should use slow timing for long recordings (> 120s)', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={180}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
          onAnimationComplete={mockOnAnimationComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={180}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
            onAnimationComplete={mockOnAnimationComplete}
          />
        </MockI18nProvider>
      );

      // Slow timing (1800ms)
      await act(async () => {
        vi.advanceTimersByTime(1800);
      });

      await waitFor(() => {
        expect(screen.getByText('Capturing Audio')).toBeInTheDocument();
      });
    });
  });

  describe('Step Progression and API Calls', () => {
    it('should trigger transcription API call at transcribe step', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Progress through capture step (index 0) to transcribe step (index 1)
      await act(async () => {
        vi.advanceTimersByTime(800); // First step
        vi.advanceTimersByTime(800); // Second step (transcribe)
      });

      await waitFor(() => {
        expect(mockOnTranscribeComplete).toHaveBeenCalled();
      });
    });

    it('should trigger blog generation API call at format step', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Progress to format step (index 5)
      await act(async () => {
        for (let i = 0; i <= 5; i++) {
          vi.advanceTimersByTime(800);
        }
      });

      await waitFor(() => {
        expect(mockOnTranscribeComplete).toHaveBeenCalled();
        expect(mockOnGenerateComplete).toHaveBeenCalled();
      });
    });

    it('should show completed steps with checkmarks', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Complete first step
      await act(async () => {
        vi.advanceTimersByTime(800);
      });

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument();
      });
    });

    it('should call onAnimationComplete when finished', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
          onAnimationComplete={mockOnAnimationComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
            onAnimationComplete={mockOnAnimationComplete}
          />
        </MockI18nProvider>
      );

      // Complete all 12 steps plus final transitions
      await act(async () => {
        for (let i = 0; i < 12; i++) {
          vi.advanceTimersByTime(800);
        }
        vi.advanceTimersByTime(400); // Half step duration for final transition
      });

      await waitFor(() => {
        expect(mockOnAnimationComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle transcription API errors gracefully', async () => {
      const mockErrorTranscribe = vi.fn().mockRejectedValue(new Error('Transcription failed'));
      
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockErrorTranscribe}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockErrorTranscribe}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Progress to transcribe step
      await act(async () => {
        vi.advanceTimersByTime(800);
        vi.advanceTimersByTime(800);
      });

      await waitFor(() => {
        expect(mockErrorTranscribe).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('❌ Transcription failed:', expect.any(Error));
      });
    });

    it('should handle blog generation API errors gracefully', async () => {
      const mockErrorGenerate = vi.fn().mockRejectedValue(new Error('Blog generation failed'));
      
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockErrorGenerate}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockErrorGenerate}
          />
        </MockI18nProvider>
      );

      // Progress to format step (index 5)
      await act(async () => {
        for (let i = 0; i <= 5; i++) {
          vi.advanceTimersByTime(800);
        }
      });

      await waitFor(() => {
        expect(mockOnTranscribeComplete).toHaveBeenCalled();
        expect(mockErrorGenerate).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('❌ Blog generation failed:', expect.any(Error));
      });
    });
  });

  describe('Visual States and CSS Classes', () => {
    it('should apply correct classes for active steps', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // The first incomplete step should be active
      await waitFor(() => {
        const activeElements = document.querySelectorAll('.opacity-100.scale-110');
        expect(activeElements.length).toBeGreaterThan(0);
      });
    });

    it('should apply correct classes for completed steps', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Complete first step
      await act(async () => {
        vi.advanceTimersByTime(800);
      });

      await waitFor(() => {
        const completedElements = document.querySelectorAll('.opacity-60');
        expect(completedElements.length).toBeGreaterThan(0);
      });
    });

    it('should show active step indicator', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Check for active step indicator (pulse bar)
      await waitFor(() => {
        const activeIndicator = document.querySelector('.bg-gradient-to-r.from-transparent.via-electric.to-transparent');
        expect(activeIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Star Wars Crawl Effect', () => {
    it('should apply star-wars-crawl class to container', () => {
      renderWithI18n(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      const crawlContainer = document.querySelector('.star-wars-crawl');
      expect(crawlContainer).toBeInTheDocument();
    });

    it('should apply crawl-step class to each step', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      await waitFor(() => {
        const crawlSteps = document.querySelectorAll('.crawl-step');
        expect(crawlSteps.length).toBe(12); // All 12 processing steps
      });
    });

    it('should apply animation delays to steps', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      await waitFor(() => {
        const crawlSteps = document.querySelectorAll('.crawl-step');
        crawlSteps.forEach((step, index) => {
          const expectedDelay = `${index * 0.2}s`;
          expect(step).toHaveStyle(`animation-delay: ${expectedDelay}`);
        });
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should reset state when becoming invisible', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Let animation start
      await act(async () => {
        vi.advanceTimersByTime(800);
      });

      // Make invisible
      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={false}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Component should not be visible
      expect(screen.queryByText('⚡ Vibelogging your content...')).not.toBeInTheDocument();
    });

    it('should not start animation twice if already animating', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Make visible
      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Re-render with same props (should not restart animation)
      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Only one set of API calls should be made
      await act(async () => {
        vi.advanceTimersByTime(1600); // Two steps
      });

      expect(mockOnTranscribeComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      renderWithI18n(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
          className="custom-test-class"
        />
      );

      const container = document.querySelector('.custom-test-class');
      expect(container).toBeInTheDocument();
    });

    it('should handle missing onAnimationComplete gracefully', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
          // No onAnimationComplete prop
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      // Complete all steps - should not throw error
      await act(async () => {
        for (let i = 0; i < 12; i++) {
          vi.advanceTimersByTime(800);
        }
        vi.advanceTimersByTime(400);
      });

      // Should complete without errors
      await waitFor(() => {
        expect(mockOnTranscribeComplete).toHaveBeenCalled();
        expect(mockOnGenerateComplete).toHaveBeenCalled();
      });
    });
  });

  describe('All Processing Steps', () => {
    it('should display all 12 processing steps in correct order', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      const expectedSteps = [
        'Capturing Audio',
        'Transcribing',
        'Cleaning',
        'Expanding',
        'Structuring',
        'Formatting',
        'Optimizing',
        'Social Ready',
        'SEO Boost',
        'RSS Ready',
        'HTML Perfect',
        'Final Polish'
      ];

      await waitFor(() => {
        expectedSteps.forEach(stepTitle => {
          expect(screen.getByText(stepTitle)).toBeInTheDocument();
        });
      });
    });

    it('should show descriptions for all steps', async () => {
      const { rerender } = renderWithI18n(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      rerender(
        <MockI18nProvider>
          <ProcessingAnimation
            isVisible={true}
            recordingTime={30}
            onTranscribeComplete={mockOnTranscribeComplete}
            onGenerateComplete={mockOnGenerateComplete}
          />
        </MockI18nProvider>
      );

      const expectedDescriptions = [
        'Securing your audio recording',
        'Converting speech to text',
        'Removing noise and artifacts',
        'Enhancing content structure',
        'Organizing into sections',
        'Applying blog formatting',
        'Enhancing readability',
        'Preparing for social media',
        'Optimizing for search',
        'Preparing RSS feed',
        'Generating clean HTML',
        'Adding final touches'
      ];

      await waitFor(() => {
        expectedDescriptions.forEach(description => {
          expect(screen.getByText(description)).toBeInTheDocument();
        });
      });
    });
  });
});