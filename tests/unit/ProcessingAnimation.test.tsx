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
      return translations[key] || key;
    }
  })
}));

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

      expect(screen.queryByText('⚡ Vibelogging your content...')).not.toBeInTheDocument();
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

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
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
      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
    });

    it('should show background particles effects', () => {
      render(
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

  describe('Component Structure and Visual Elements', () => {
    it('should display all 12 processing steps', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Wait for steps to be initialized
      await waitFor(() => {
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

        expectedSteps.forEach(stepTitle => {
          expect(screen.getByText(stepTitle)).toBeInTheDocument();
        });
      });
    });

    it('should show descriptions for all steps', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      await waitFor(() => {
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

        expectedDescriptions.forEach(description => {
          expect(screen.getByText(description)).toBeInTheDocument();
        });
      });
    });

    it('should apply star-wars-crawl class to container', () => {
      render(
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
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      await waitFor(() => {
        const crawlSteps = document.querySelectorAll('.crawl-step');
        expect(crawlSteps.length).toBe(12); // All 12 processing steps
      });
    });

    it('should apply animation delays to steps', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
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

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();

      rerender(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={180}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
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

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
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

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();

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
      expect(screen.queryByText('⚡ Vibelogging your content...')).not.toBeInTheDocument();
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

      expect(screen.queryByText('⚡ Vibelogging your content...')).not.toBeInTheDocument();

      rerender(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
      
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
      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
      
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
      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
      
      // Steps should still be visible
      await waitFor(() => {
        expect(screen.getByText('Formatting')).toBeInTheDocument();
      });
    });
  });

  describe('Visual States and CSS Classes', () => {
    it('should apply correct opacity classes for different step states', async () => {
      render(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={30}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Check that steps have appropriate opacity classes
      await waitFor(() => {
        // Should have some steps with different opacities (active, completed, pending)
        const opacityElements = document.querySelectorAll('[class*="opacity-"]');
        expect(opacityElements.length).toBeGreaterThan(0);
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

      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();

      rerender(
        <ProcessingAnimation
          isVisible={true}
          recordingTime={longTime}
          onTranscribeComplete={mockOnTranscribeComplete}
          onGenerateComplete={mockOnGenerateComplete}
        />
      );

      // Component should handle different recording times
      expect(screen.getByText('⚡ Vibelogging your content...')).toBeInTheDocument();
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

      // Check for perspective container
      const perspectiveContainer = document.querySelector('.perspective-1000');
      expect(perspectiveContainer).toBeInTheDocument();
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

      // Check for space-y classes for consistent spacing
      await waitFor(() => {
        const spacedElements = document.querySelectorAll('.space-y-8');
        expect(spacedElements.length).toBeGreaterThan(0);
      });
    });
  });
});