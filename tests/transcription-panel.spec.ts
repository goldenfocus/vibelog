import { test, expect } from '@playwright/test';

test.describe('TranscriptionPanel Visual Snapshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the transcript lab page
    await page.goto('/transcript-lab');
    
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
      `
    });
  });

  test('should match empty state snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-empty');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-empty-state.png', { threshold: 0.1 });
  });

  test('should match live transcript short snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-live-short');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-live-short.png', { threshold: 0.1 });
  });

  test('should match live transcript medium snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-live-medium');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-live-medium.png', { threshold: 0.1 });
  });

  test('should match live transcript long snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-live-long');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-live-long.png', { threshold: 0.1 });
  });

  test('should match live listening state snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-live-listening');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-live-listening.png', { threshold: 0.1 });
  });

  test('should match live blocked state snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-live-blocked');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-live-blocked.png', { threshold: 0.1 });
  });

  test('should match completed short transcript snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-short');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-completed-short.png', { threshold: 0.1 });
  });

  test('should match completed medium transcript snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-medium');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-completed-medium.png', { threshold: 0.1 });
  });

  test('should match completed long transcript snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-long');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-completed-long.png', { threshold: 0.1 });
  });

  test('should match completed transcript with punctuation snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-punctuation');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-completed-punctuation.png', { threshold: 0.1 });
  });

  test('should match completed transcript with numbers snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-numbers');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-completed-numbers.png', { threshold: 0.1 });
  });

  test('should match completed transcript with multiline snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-multiline');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-completed-multiline.png', { threshold: 0.1 });
  });

  test('should match completed transcript logged in snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-logged-in');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-completed-logged-in.png', { threshold: 0.1 });
  });

  test('should match both states snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-both-states');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('transcript-both-states.png', { threshold: 0.1 });
  });

  test('should match edit modal snapshot', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-logged-in');
    await expect(panel).toBeVisible();
    
    // Click the edit button to open the modal
    const editButton = panel.getByTestId('edit-transcript-button');
    await editButton.click();
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="transcript-edit-textarea"]', { state: 'visible' });
    
    // Take snapshot of the modal
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toHaveScreenshot('transcript-edit-modal.png', { threshold: 0.1 });
  });

  test('should verify character and word counts are visible and correct', async ({ page }) => {
    // Test medium transcript counts
    const mediumPanel = page.getByTestId('transcript-completed-medium');
    await expect(mediumPanel).toBeVisible();
    
    // Check that counters are visible
    const charCount = mediumPanel.getByTestId('completed-transcript-char-count');
    const wordCount = mediumPanel.getByTestId('completed-transcript-word-count');
    
    await expect(charCount).toBeVisible();
    await expect(wordCount).toBeVisible();
    
    // Verify they contain "Characters:" and "Words:" text
    await expect(charCount).toContainText('Characters:');
    await expect(wordCount).toContainText('Words:');
  });

  test('should verify live transcript counters are visible', async ({ page }) => {
    const livePanel = page.getByTestId('transcript-live-medium');
    await expect(livePanel).toBeVisible();
    
    // Check that live counters are visible
    const liveCharCount = livePanel.getByTestId('live-transcript-char-count');
    const liveWordCount = livePanel.getByTestId('live-transcript-word-count');
    
    await expect(liveCharCount).toBeVisible();
    await expect(liveWordCount).toBeVisible();
    
    // Verify they contain counter text
    await expect(liveCharCount).toContainText('Characters:');
    await expect(liveWordCount).toContainText('Words:');
  });

  test('should verify buttons are properly styled and interactive', async ({ page }) => {
    const panel = page.getByTestId('transcript-completed-medium');
    await expect(panel).toBeVisible();
    
    const editButton = panel.getByTestId('edit-transcript-button');
    const copyButton = panel.getByTestId('copy-transcript-button');
    
    // Verify buttons are visible and contain expected text
    await expect(editButton).toBeVisible();
    await expect(copyButton).toBeVisible();
    await expect(editButton).toContainText('Edit');
    await expect(copyButton).toContainText('Copy');
    
    // Test hover states by taking snapshots
    await editButton.hover();
    await expect(panel).toHaveScreenshot('transcript-edit-button-hover.png', { threshold: 0.1 });
    
    await copyButton.hover();
    await expect(panel).toHaveScreenshot('transcript-copy-button-hover.png', { threshold: 0.1 });
  });

  test('should verify responsive behavior on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const panel = page.getByTestId('transcript-completed-medium');
    await expect(panel).toBeVisible();
    
    await expect(panel).toHaveScreenshot('transcript-mobile-medium.png', { threshold: 0.1 });
    
    // Test edit modal on mobile
    const editButton = panel.getByTestId('edit-transcript-button');
    await editButton.click();
    
    await page.waitForSelector('[data-testid="transcript-edit-textarea"]', { state: 'visible' });
    
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toHaveScreenshot('transcript-edit-modal-mobile.png', { threshold: 0.1 });
  });
});