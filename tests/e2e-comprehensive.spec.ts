import { test, expect } from '@playwright/test';

test.describe('VibeLog E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Recording Flow', () => {
    test('Complete recording workflow', async ({ page }) => {
      // Start recording
      await page.click('[data-testid="start-recording"]');
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

      // Wait for recording to process
      await page.waitForTimeout(2000);

      // Stop recording
      await page.click('[data-testid="stop-recording"]');
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();

      // Wait for processing to complete
      await page.waitForSelector('[data-testid="transcription-panel"]', { timeout: 30000 });

      // Verify transcription appears
      await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible();

      // Wait for blog generation
      await page.waitForSelector('[data-testid="blog-content"]', { timeout: 30000 });

      // Verify blog content appears
      await expect(page.locator('[data-testid="blog-content"]')).toBeVisible();
    });

    test('Recording with different quality settings', async ({ page }) => {
      // Test low quality
      await page.click('[data-testid="quality-settings"]');
      await page.click('[data-testid="quality-low"]');

      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Test medium quality
      await page.click('[data-testid="quality-settings"]');
      await page.click('[data-testid="quality-medium"]');

      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Test high quality
      await page.click('[data-testid="quality-settings"]');
      await page.click('[data-testid="quality-high"]');

      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');
    });

    test('Recording error handling', async ({ page }) => {
      // Mock microphone permission denial
      await page.route('**/getUserMedia', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Permission denied' }),
        });
      });

      await page.click('[data-testid="start-recording"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Content Management', () => {
    test('Edit transcription', async ({ page }) => {
      // Complete recording flow first
      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Wait for transcription
      await page.waitForSelector('[data-testid="transcription-text"]', { timeout: 30000 });

      // Edit transcription
      await page.click('[data-testid="edit-transcription"]');
      await page.fill('[data-testid="transcription-editor"]', 'Edited transcription text');
      await page.click('[data-testid="save-transcription"]');

      // Verify edit was saved
      await expect(page.locator('[data-testid="transcription-text"]')).toContainText(
        'Edited transcription text'
      );
    });

    test('Edit blog content', async ({ page }) => {
      // Complete recording flow
      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Wait for blog content
      await page.waitForSelector('[data-testid="blog-content"]', { timeout: 30000 });

      // Edit blog content
      await page.click('[data-testid="edit-blog"]');
      await page.fill(
        '[data-testid="blog-editor"]',
        '# Edited Blog Title\n\nThis is edited blog content.'
      );
      await page.click('[data-testid="save-blog"]');

      // Verify edit was saved
      await expect(page.locator('[data-testid="blog-content"]')).toContainText('Edited Blog Title');
    });

    test('Save and load vibelog', async ({ page }) => {
      // Complete recording flow
      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Wait for content
      await page.waitForSelector('[data-testid="blog-content"]', { timeout: 30000 });

      // Save vibelog
      await page.click('[data-testid="save-vibelog"]');
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

      // Navigate to dashboard
      await page.click('[data-testid="dashboard-link"]');
      await page.waitForLoadState('networkidle');

      // Verify vibelog appears in dashboard
      await expect(page.locator('[data-testid="vibelog-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="vibelog-item"]')).toHaveCount(1);
    });
  });

  test.describe('Publishing Features', () => {
    test('Copy to clipboard', async ({ page }) => {
      // Complete recording flow
      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Wait for content
      await page.waitForSelector('[data-testid="blog-content"]', { timeout: 30000 });

      // Copy content
      await page.click('[data-testid="copy-content"]');
      await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();

      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('Created with VibeLog');
    });

    test('Share functionality', async ({ page }) => {
      // Complete recording flow
      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Wait for content
      await page.waitForSelector('[data-testid="blog-content"]', { timeout: 30000 });

      // Test share
      await page.click('[data-testid="share-content"]');
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();

      // Test different share options
      await page.click('[data-testid="share-twitter"]');
      await expect(page.locator('[data-testid="share-twitter"]')).toBeVisible();

      await page.click('[data-testid="share-linkedin"]');
      await expect(page.locator('[data-testid="share-linkedin"]')).toBeVisible();
    });

    test('Export functionality', async ({ page }) => {
      // Complete recording flow
      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Wait for content
      await page.waitForSelector('[data-testid="blog-content"]', { timeout: 30000 });

      // Test export as markdown
      await page.click('[data-testid="export-markdown"]');
      await expect(page.locator('[data-testid="export-success"]')).toBeVisible();

      // Test export as PDF
      await page.click('[data-testid="export-pdf"]');
      await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
    });
  });

  test.describe('User Authentication', () => {
    test('Sign up flow', async ({ page }) => {
      await page.click('[data-testid="sign-up-button"]');
      await expect(page.locator('[data-testid="sign-up-modal"]')).toBeVisible();

      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="sign-up-submit"]');

      await expect(page.locator('[data-testid="sign-up-success"]')).toBeVisible();
    });

    test('Sign in flow', async ({ page }) => {
      await page.click('[data-testid="sign-in-button"]');
      await expect(page.locator('[data-testid="sign-in-modal"]')).toBeVisible();

      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="sign-in-submit"]');

      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('Sign out flow', async ({ page }) => {
      // Sign in first
      await page.click('[data-testid="sign-in-button"]');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="sign-in-submit"]');

      // Sign out
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="sign-out-button"]');

      await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible();
    });
  });

  test.describe('Advanced Features', () => {
    test('Batch processing', async ({ page }) => {
      await page.click('[data-testid="advanced-features"]');
      await page.click('[data-testid="batch-processing"]');

      // Upload multiple files
      await page.setInputFiles('[data-testid="batch-upload"]', [
        'test-audio-1.webm',
        'test-audio-2.webm',
        'test-audio-3.webm',
      ]);

      await page.click('[data-testid="start-batch-processing"]');
      await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible();

      // Wait for completion
      await page.waitForSelector('[data-testid="batch-complete"]', { timeout: 60000 });
      await expect(page.locator('[data-testid="batch-results"]')).toBeVisible();
    });

    test('Team collaboration', async ({ page }) => {
      await page.click('[data-testid="advanced-features"]');
      await page.click('[data-testid="team-collaboration"]');

      // Invite team member
      await page.fill('[data-testid="invite-email"]', 'colleague@example.com');
      await page.click('[data-testid="send-invitation"]');

      await expect(page.locator('[data-testid="invitation-sent"]')).toBeVisible();
    });

    test('Scheduling', async ({ page }) => {
      await page.click('[data-testid="advanced-features"]');
      await page.click('[data-testid="scheduling"]');

      // Create scheduled post
      await page.fill('[data-testid="post-title"]', 'Scheduled Post');
      await page.fill('[data-testid="post-content"]', 'This is a scheduled post.');
      await page.fill('[data-testid="schedule-date"]', '2024-12-31T12:00');

      await page.click('[data-testid="schedule-post"]');
      await expect(page.locator('[data-testid="schedule-success"]')).toBeVisible();
    });
  });

  test.describe('Performance Tests', () => {
    test('Page load performance', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
    });

    test('Recording performance', async ({ page }) => {
      const startTime = Date.now();
      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      // Wait for processing to complete
      await page.waitForSelector('[data-testid="blog-content"]', { timeout: 30000 });
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(30000); // Should process in under 30 seconds
    });

    test('Memory usage', async ({ page }) => {
      const metrics = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as Record<string, unknown>).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as Record<string, unknown>).memory?.totalJSHeapSize || 0,
        };
      });

      expect(metrics.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  test.describe('Accessibility Tests', () => {
    test('Keyboard navigation', async ({ page }) => {
      // Tab through all interactive elements
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();

      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();

      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('Screen reader compatibility', async ({ page }) => {
      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="start-recording"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="play-button"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="volume-control"]')).toHaveAttribute('aria-label');
    });

    test('Color contrast', async ({ page }) => {
      // This would typically use a color contrast testing library
      // For now, we'll just verify that the page loads without errors
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('Network error handling', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('API timeout handling', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/transcribe', route => {
        setTimeout(() => route.fulfill({ status: 200, body: '{}' }), 35000);
      });

      await page.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="stop-recording"]');

      await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible();
    });
  });
});
