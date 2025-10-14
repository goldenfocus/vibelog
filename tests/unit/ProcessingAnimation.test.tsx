import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import ProcessingAnimation from '@/components/mic/ProcessingAnimation';

// Mock the I18n provider
vi.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
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
        'components.micRecorder.symphony.imageTitle': 'Generating Image',
        'components.micRecorder.symphony.imageDesc': 'Creating cover image',
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
        'components.micRecorder.symphony.polishDesc': 'Adding final touches',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ProcessingAnimation', () => {
  let mockOnTranscribeComplete: ReturnType<typeof vi.fn>;
  let mockOnGenerateComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock API functions
    mockOnTranscribeComplete = vi.fn().mockResolvedValue('Mock transcription result');
    mockOnGenerateComplete = vi.fn().mockResolvedValue('Mock blog content');

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility and Initial State', () => {
    it('should not render when isVisible is false', () => {
      render(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.queryByTestId('timeline-stream')).not.toBeInTheDocument();
    });

    it('should render when isVisible is true', () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByTestId('timeline-stream')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should show loading spinner and header', () => {
      render(
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
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should show processing status line', () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for processing status line
      const statusLine = screen.getByTestId('processing-now-line');
      expect(statusLine).toBeInTheDocument();
    });
  });

  describe('Component Structure and Visual Elements', () => {
    it('should display processing steps in timeline', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Wait for steps to be initialized - timeline shows recent steps only
      await waitFor(() => {
        // Check that at least some steps are visible in the timeline
        const visibleSteps = ['Capturing Audio', 'Transcribing', 'Cleaning', 'Expanding'];

        // At least one step should be visible
        const hasVisibleStep = visibleSteps.some(stepTitle => {
          return screen.queryByText(stepTitle) !== null;
        });

        expect(hasVisibleStep).toBe(true);
      });
    });

    it('should show descriptions for visible steps', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      await waitFor(() => {
        // Timeline shows only recent steps, so check for at least some descriptions
        const visibleDescriptions = [
          'Securing your audio recording',
          'Converting speech to text',
          'Removing noise and artifacts',
          'Enhancing content structure',
        ];

        // At least one description should be visible
        const hasVisibleDescription = visibleDescriptions.some(description => {
          return screen.queryByText(description) !== null;
        });

        expect(hasVisibleDescription).toBe(true);
      });
    });

    it('should apply timeline-stream testid to container', () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      const timelineStream = screen.getByTestId('timeline-stream');
      expect(timelineStream).toBeInTheDocument();
    });

    it('should show timeline steps with proper structure', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      await waitFor(() => {
        // Check that timeline steps exist
        const timelineSteps = document.querySelectorAll('[data-testid^="timeline-step-"]');
        expect(timelineSteps.length).toBeGreaterThan(0);
      });
    });

    it('should show metallic progress indicator for active step', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      await waitFor(() => {
        // Check for metallic-strike class
        const metallicStrike = document.querySelector('.metallic-strike');
        expect(metallicStrike).toBeInTheDocument();
      });
    });
  });

  describe('Props and Configuration', () => {
    it('should apply custom className', () => {
      render(
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

    it('should handle different recording times', () => {
      const { rerender } = render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={15}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('Processing')).toBeInTheDocument();

      rerender(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={180}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should handle missing onAnimationComplete gracefully', () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
          // No onAnimationComplete prop
        />
      );

      expect(screen.getByText('Processing')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should reset state when becoming invisible', () => {
      const { rerender } = render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('Processing')).toBeInTheDocument();

      // Make invisible
      rerender(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Component should not be visible
      expect(screen.queryByTestId('timeline-stream')).not.toBeInTheDocument();
    });

    it('should trigger animation when isVisible changes from false to true', async () => {
      const { rerender } = render(
        <ProcessingAnimation
          isVisible={false}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.queryByTestId('timeline-stream')).not.toBeInTheDocument();

      rerender(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('Processing')).toBeInTheDocument();

      // Steps should be rendered
      await waitFor(() => {
        expect(screen.getByText('Capturing Audio')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle transcription API errors gracefully', async () => {
      const mockErrorTranscribe = vi.fn().mockRejectedValue(new Error('Transcription failed'));

      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockErrorTranscribe}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Component should render despite potential API errors
      expect(screen.getByText('Processing')).toBeInTheDocument();

      // Steps should still be visible
      await waitFor(() => {
        expect(screen.getByText('Capturing Audio')).toBeInTheDocument();
      });
    });

    it('should handle blog generation API errors gracefully', async () => {
      const mockErrorGenerate = vi.fn().mockRejectedValue(new Error('Blog generation failed'));

      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockErrorGenerate}
        />
      );

      // Component should render despite potential API errors
      expect(screen.getByText('Processing')).toBeInTheDocument();

      // Timeline should still be visible
      await waitFor(() => {
        expect(screen.getByTestId('timeline-stream')).toBeInTheDocument();
      });
    });
  });

  describe('Visual States and CSS Classes', () => {
    it('should show different visual states for step progression', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check that steps have text color classes indicating different states
      await waitFor(() => {
        // Should have slate color classes for step states
        const slateTextElements = document.querySelectorAll('[class*="text-slate"]');
        expect(slateTextElements.length).toBeGreaterThan(0);
      });
    });

    it('should show active step indicator elements', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for gradient elements that serve as indicators
      await waitFor(() => {
        const gradientElements = document.querySelectorAll('.bg-gradient-to-r');
        expect(gradientElements.length).toBeGreaterThan(0);
      });
    });

    it('should apply electric styling classes', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for electric-themed styling
      await waitFor(() => {
        const electricElements = document.querySelectorAll('[class*="electric"]');
        expect(electricElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Function Calls and Integration', () => {
    it('should not call API functions immediately when rendered', () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // API functions should not be called immediately upon render
      expect(mockOnTranscribeComplete).not.toHaveBeenCalled();
      expect(mockOnGenerateComplete).not.toHaveBeenCalled();
    });

    it('should store recording time for timing calculations', async () => {
      const shortTime = 15;
      const longTime = 180;

      const { rerender } = render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={shortTime}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('Processing')).toBeInTheDocument();

      rerender(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={longTime}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Component should handle different recording times
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });
  });

  describe('UI Elements and Accessibility', () => {
    it('should contain proper heading structure', () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for main heading
      const headings = document.querySelectorAll('h3');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have proper container structure', () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for main container with backdrop blur
      const mainContainer = document.querySelector('.backdrop-blur-xl');
      expect(mainContainer).toBeInTheDocument();

      // Check for timeline container
      const timelineStream = screen.getByTestId('timeline-stream');
      expect(timelineStream).toBeInTheDocument();
    });

    it('should have consistent spacing and layout', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check for space-y-6 classes for consistent spacing between timeline steps
      await waitFor(() => {
        const spacedElements = document.querySelectorAll('.space-y-6');
        expect(spacedElements.length).toBeGreaterThan(0);
      });
    });
  });
});
