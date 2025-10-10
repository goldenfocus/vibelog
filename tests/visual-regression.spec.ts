import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Homepage visual regression', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Take screenshot of the entire page
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('MicRecorder component states', async ({ page }) => {
    // Test idle state
    await expect(page.locator('[data-testid="mic-recorder"]')).toHaveScreenshot(
      'mic-recorder-idle.png'
    );

    // Test recording state
    await page.click('[data-testid="start-recording"]');
    await page.waitForTimeout(100); // Wait for animation
    await expect(page.locator('[data-testid="mic-recorder"]')).toHaveScreenshot(
      'mic-recorder-recording.png'
    );

    // Test processing state
    await page.click('[data-testid="stop-recording"]');
    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="mic-recorder"]')).toHaveScreenshot(
      'mic-recorder-processing.png'
    );
  });

  test('Waveform component', async ({ page }) => {
    // Test waveform with different levels
    const waveform = page.locator('[data-testid="waveform"]');

    // Test empty waveform
    await expect(waveform).toHaveScreenshot('waveform-empty.png');

    // Test active waveform (simulate recording)
    await page.evaluate(() => {
      // Simulate audio levels
      const event = new CustomEvent('audioLevels', {
        detail: [0.8, 0.6, 0.9, 0.7, 0.5, 0.8, 0.6, 0.4, 0.7, 0.5, 0.3, 0.6, 0.4, 0.2, 0.5],
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(waveform).toHaveScreenshot('waveform-active.png');
  });

  test('Transcription panel', async ({ page }) => {
    // Test empty state
    await expect(page.locator('[data-testid="transcription-panel"]')).toHaveScreenshot(
      'transcription-empty.png'
    );

    // Test with content
    await page.evaluate(() => {
      const event = new CustomEvent('transcriptionUpdate', {
        detail: 'This is a sample transcription text that should be displayed in the panel.',
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="transcription-panel"]')).toHaveScreenshot(
      'transcription-content.png'
    );
  });

  test('Blog content display', async ({ page }) => {
    // Test with sample blog content
    await page.evaluate(() => {
      const event = new CustomEvent('blogContentUpdate', {
        detail: {
          title: 'Sample Blog Post',
          content: 'This is a sample blog post content that should be displayed properly.',
          coverImage: 'https://example.com/image.jpg',
        },
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="blog-content"]')).toHaveScreenshot('blog-content.png');
  });

  test('Mobile responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('mobile-homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet responsive design', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('tablet-homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Dark mode visual regression', async ({ page }) => {
    // Ensure dark mode is active
    await page.addInitScript(() => {
      document.documentElement.classList.add('dark');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dark-mode-homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Loading states', async ({ page }) => {
    // Test loading spinner
    await page.evaluate(() => {
      const event = new CustomEvent('showLoading', { detail: 'Processing...' });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="loading-spinner"]')).toHaveScreenshot(
      'loading-spinner.png'
    );
  });

  test('Error states', async ({ page }) => {
    // Test error message
    await page.evaluate(() => {
      const event = new CustomEvent('showError', {
        detail: { message: 'Something went wrong. Please try again.' },
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="error-message"]')).toHaveScreenshot(
      'error-message.png'
    );
  });

  test('Toast notifications', async ({ page }) => {
    // Test success toast
    await page.evaluate(() => {
      const event = new CustomEvent('showToast', {
        detail: { message: 'Vibelog saved successfully!', type: 'success' },
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="toast"]')).toHaveScreenshot('toast-success.png');

    // Test error toast
    await page.evaluate(() => {
      const event = new CustomEvent('showToast', {
        detail: { message: 'Failed to save vibelog', type: 'error' },
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="toast"]')).toHaveScreenshot('toast-error.png');
  });

  test('Accessibility focus states', async ({ page }) => {
    // Test focus ring on mic button
    await page.focus('[data-testid="start-recording"]');
    await expect(page.locator('[data-testid="start-recording"]')).toHaveScreenshot(
      'mic-button-focused.png'
    );

    // Test focus ring on other buttons
    await page.focus('[data-testid="play-button"]');
    await expect(page.locator('[data-testid="play-button"]')).toHaveScreenshot(
      'play-button-focused.png'
    );
  });

  test('Animation states', async ({ page }) => {
    // Test recording animation
    await page.click('[data-testid="start-recording"]');

    // Capture multiple frames of the animation
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(200);
      await expect(page.locator('[data-testid="mic-recorder"]')).toHaveScreenshot(
        `recording-animation-${i}.png`
      );
    }
  });
});
