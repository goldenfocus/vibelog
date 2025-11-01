import { test, expect } from '@playwright/test';

test.describe('ProcessingAnimation Visual Snapshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the processing lab page
    await page.goto('/processing-lab');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Pause animations for consistent snapshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test('should match short recording fast timing snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-short-recording-fast.png', { threshold: 0.1 });
  });

  test('should match medium recording moderate timing snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-medium-recording-moderate');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-medium-recording-moderate.png', {
      threshold: 0.1,
    });
  });

  test('should match long recording slow timing snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-long-recording-slow');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-long-recording-slow.png', { threshold: 0.1 });
  });

  test('should match transcription error state snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-transcription-error');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-transcription-error.png', { threshold: 0.1 });
  });

  test('should match vibelog generation error state snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-vibelog-generation-error');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-vibelog-generation-error.png', {
      threshold: 0.1,
    });
  });

  test('should match both errors state snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-both-errors');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-both-errors.png', { threshold: 0.1 });
  });

  test('should match custom styling snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-custom-class');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-custom-styling.png', { threshold: 0.1 });
  });

  test('should match invisible state snapshot', async ({ page }) => {
    const panel = page.getByTestId('processing-invisible-state');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-invisible-state.png', { threshold: 0.1 });
  });

  test('should match timing comparison snapshot', async ({ page }) => {
    const shortTiming = page.getByTestId('timing-short');
    const mediumTiming = page.getByTestId('timing-medium');
    const longTiming = page.getByTestId('timing-long');

    await expect(shortTiming).toBeVisible();
    await expect(mediumTiming).toBeVisible();
    await expect(longTiming).toBeVisible();

    await expect(shortTiming).toHaveScreenshot('processing-timing-short.png', { threshold: 0.1 });
    await expect(mediumTiming).toHaveScreenshot('processing-timing-medium.png', { threshold: 0.1 });
    await expect(longTiming).toHaveScreenshot('processing-timing-long.png', { threshold: 0.1 });
  });

  test('should match error handling testing snapshot', async ({ page }) => {
    const transcriptionError = page.getByTestId('error-transcription');
    const vibelogError = page.getByTestId('error-vibelog');

    await expect(transcriptionError).toBeVisible();
    await expect(vibelogError).toBeVisible();

    await expect(transcriptionError).toHaveScreenshot('processing-error-transcription.png', {
      threshold: 0.1,
    });
    await expect(vibelogError).toHaveScreenshot('processing-error-vibelog.png', { threshold: 0.1 });
  });

  test('should match mobile viewport snapshot', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const mobilePanel = page.getByTestId('mobile-test');
    await expect(mobilePanel).toBeVisible();
    await expect(mobilePanel).toHaveScreenshot('processing-mobile.png', { threshold: 0.1 });
  });

  test('should match tablet viewport snapshot', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('processing-tablet.png', { threshold: 0.1 });
  });

  test('should verify Star Wars crawl visual effects', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();

    // Check for Star Wars crawl container
    const crawlContainer = panel.locator('.star-wars-crawl');
    await expect(crawlContainer).toBeVisible();

    // Check for perspective container
    const perspectiveContainer = panel.locator('.perspective-1000');
    await expect(perspectiveContainer).toBeVisible();

    // Check for crawl steps
    const crawlSteps = panel.locator('.crawl-step');
    await expect(crawlSteps.first()).toBeVisible();

    // Take snapshot of crawl effect
    await expect(crawlContainer).toHaveScreenshot('processing-crawl-effect.png', {
      threshold: 0.1,
    });
  });

  test('should verify particle animation effects', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();

    // Check for particle effects
    const particles = panel.locator('.animate-pulse, .animate-ping');
    await expect(particles.first()).toBeVisible();

    // Check for main animation container with particles
    const mainContainer = panel.locator('.backdrop-blur-xl').first();
    await expect(mainContainer).toBeVisible();
    await expect(mainContainer).toHaveScreenshot('processing-particles.png', { threshold: 0.1 });
  });

  test('should verify electric styling and gradients', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();

    // Check for electric gradient elements
    const electricElements = panel.locator('[class*="electric"]');
    await expect(electricElements.first()).toBeVisible();

    // Check for gradient backgrounds
    const gradientElements = panel.locator('.bg-gradient-electric');
    await expect(gradientElements.first()).toBeVisible();

    // Take snapshot focusing on electric styling
    await expect(panel).toHaveScreenshot('processing-electric-styling.png', { threshold: 0.1 });
  });

  test('should verify loading spinner and header', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();

    // Check for spinning loader
    const spinner = panel.locator('.animate-spin');
    await expect(spinner).toBeVisible();

    // Check for header text
    await expect(panel.getByText('⚡ Vibelogging your content...')).toBeVisible();

    // Take snapshot of header area
    const headerArea = panel.locator('.text-center').first();
    await expect(headerArea).toHaveScreenshot('processing-header.png', { threshold: 0.1 });
  });

  test('should verify all 12 processing steps are visible', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();

    // Check for all expected step titles
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
      'Final Polish',
    ];

    for (const stepTitle of expectedSteps) {
      await expect(panel.getByText(stepTitle)).toBeVisible();
    }

    // Take snapshot of all steps
    const stepsContainer = panel.locator('.star-wars-crawl');
    await expect(stepsContainer).toHaveScreenshot('processing-all-steps.png', { threshold: 0.1 });
  });

  test('should verify step descriptions are visible', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();

    // Check for step descriptions
    const expectedDescriptions = [
      'Securing your audio recording',
      'Converting speech to text',
      'Removing noise and artifacts',
      'Enhancing content structure',
      'Organizing into sections',
      'Applying vibelog formatting',
      'Enhancing readability',
      'Preparing for social media',
      'Optimizing for search',
      'Preparing RSS feed',
      'Generating clean HTML',
      'Adding final touches',
    ];

    for (const description of expectedDescriptions) {
      await expect(panel.getByText(description)).toBeVisible();
    }
  });

  test('should verify responsive behavior across viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 414, height: 896, name: 'mobile-large' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop-small' },
      { width: 1440, height: 900, name: 'desktop-large' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const panel = page.getByTestId('processing-short-recording-fast');
      await expect(panel).toBeVisible();

      await expect(panel).toHaveScreenshot(`processing-responsive-${viewport.name}.png`, {
        threshold: 0.1,
      });
    }
  });

  test('should verify debug info functionality', async ({ page }) => {
    const panel = page.getByTestId('processing-short-recording-fast');
    await expect(panel).toBeVisible();

    // Check for debug info display
    await expect(panel.getByText(/Last action:/)).toBeVisible();
    await expect(panel.getByText(/Recording time:/)).toBeVisible();
    await expect(panel.getByText(/Animation completed:/)).toBeVisible();

    // Take snapshot of debug area
    const debugInfo = panel.locator('.bg-muted\\/10');
    await expect(debugInfo).toHaveScreenshot('processing-debug-info.png', { threshold: 0.1 });
  });

  test('should verify visual state differences between error and normal states', async ({
    page,
  }) => {
    const normalPanel = page.getByTestId('processing-short-recording-fast');
    const errorPanel = page.getByTestId('processing-transcription-error');

    await expect(normalPanel).toBeVisible();
    await expect(errorPanel).toBeVisible();

    // Both should show the same visual structure
    await expect(normalPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();
    await expect(errorPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();

    // Take comparison snapshots
    await expect(normalPanel).toHaveScreenshot('processing-normal-state.png', { threshold: 0.1 });
    await expect(errorPanel).toHaveScreenshot('processing-error-state.png', { threshold: 0.1 });
  });

  test('should verify consistent visual styling across all states', async ({ page }) => {
    const allStates = [
      'processing-short-recording-fast',
      'processing-medium-recording-moderate',
      'processing-long-recording-slow',
      'processing-transcription-error',
      'processing-vibelog-generation-error',
    ];

    for (const stateId of allStates) {
      const panel = page.getByTestId(stateId);
      await expect(panel).toBeVisible();

      // Verify consistent elements across all states
      await expect(panel.getByText('⚡ Vibelogging your content...')).toBeVisible();
      await expect(panel.locator('.star-wars-crawl')).toBeVisible();
      await expect(panel.locator('.animate-spin')).toBeVisible();
      await expect(panel.locator('.backdrop-blur-xl')).toBeVisible();
    }
  });
});
