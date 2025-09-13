import { test, expect } from '@playwright/test';

test.describe('PublishActions Visual Snapshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the publish lab page
    await page.goto('/publish-lab');
    
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

  test('should match logged out idle state snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-logged-out-idle');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-logged-out-idle.png', { threshold: 0.1 });
  });

  test('should match logged in idle state snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-logged-in-idle');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-logged-in-idle.png', { threshold: 0.1 });
  });

  test('should match short content snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-short-content');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-short-content.png', { threshold: 0.1 });
  });

  test('should match long content snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-long-content');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-long-content.png', { threshold: 0.1 });
  });

  test('should match empty content snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-empty-content');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-empty-content.png', { threshold: 0.1 });
  });

  test('should match with signature snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-with-signature');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-with-signature.png', { threshold: 0.1 });
  });

  test('should match edit popup snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-edit-popup-shown');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-edit-popup.png', { threshold: 0.1 });
  });

  test('should match save popup snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-save-popup-shown');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-save-popup.png', { threshold: 0.1 });
  });

  test('should match disabled state snapshot', async ({ page }) => {
    const panel = page.getByTestId('publish-disabled-state');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-disabled-state.png', { threshold: 0.1 });
  });

  test('should match hover states snapshot', async ({ page }) => {
    const hoverPanel = page.getByTestId('hover-test');
    await expect(hoverPanel).toBeVisible();
    
    // Test edit button hover
    const editButton = hoverPanel.getByTestId('edit-button');
    await editButton.hover();
    await expect(hoverPanel).toHaveScreenshot('publish-edit-hover.png', { threshold: 0.1 });
    
    // Test copy button hover
    const copyButton = hoverPanel.getByTestId('copy-button');
    await copyButton.hover();
    await expect(hoverPanel).toHaveScreenshot('publish-copy-hover.png', { threshold: 0.1 });
    
    // Test save button hover
    const saveButton = hoverPanel.getByTestId('save-button');
    await saveButton.hover();
    await expect(hoverPanel).toHaveScreenshot('publish-save-hover.png', { threshold: 0.1 });
    
    // Test share button hover (special electric styling)
    const shareButton = hoverPanel.getByTestId('share-button');
    await shareButton.hover();
    await expect(hoverPanel).toHaveScreenshot('publish-share-hover.png', { threshold: 0.1 });
  });

  test('should match mobile viewport snapshot', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobilePanel = page.getByTestId('mobile-test');
    await expect(mobilePanel).toBeVisible();
    await expect(mobilePanel).toHaveScreenshot('publish-mobile.png', { threshold: 0.1 });
  });

  test('should match tablet viewport snapshot', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const panel = page.getByTestId('publish-logged-out-idle');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('publish-tablet.png', { threshold: 0.1 });
  });

  test('should verify button functionality and interactions', async ({ page }) => {
    const panel = page.getByTestId('publish-logged-out-idle');
    await expect(panel).toBeVisible();
    
    // Test edit button click (should show popup)
    const editButton = panel.getByTestId('edit-button');
    await editButton.click();
    
    // Wait for popup to appear
    await page.waitForSelector('.fixed.inset-0', { state: 'visible' });
    await expect(page.getByText('Login Required')).toBeVisible();
    await expect(page.getByText('Please sign in to edit your content')).toBeVisible();
    
    // Take snapshot of popup
    await expect(page.locator('.fixed.inset-0')).toHaveScreenshot('publish-edit-popup-interaction.png', { threshold: 0.1 });
    
    // Close popup
    await page.getByText('Maybe Later').click();
    await expect(page.getByText('Login Required')).not.toBeVisible();
    
    // Test save button click (should show popup)
    const saveButton = panel.getByTestId('save-button');
    await saveButton.click();
    
    await page.waitForSelector('.fixed.inset-0', { state: 'visible' });
    await expect(page.getByText('Sign In to Save')).toBeVisible();
    
    // Take snapshot of save popup
    await expect(page.locator('.fixed.inset-0')).toHaveScreenshot('publish-save-popup-interaction.png', { threshold: 0.1 });
  });

  test('should verify logged in user behavior', async ({ page }) => {
    const panel = page.getByTestId('publish-logged-in-idle');
    await expect(panel).toBeVisible();
    
    // For logged in users, buttons should work without popups
    const editButton = panel.getByTestId('edit-button');
    await editButton.click();
    
    // Should not show login popup
    await page.waitForTimeout(500); // Wait briefly
    await expect(page.getByText('Login Required')).not.toBeVisible();
    
    // Check that action was logged in debug info
    await expect(panel.getByText(/Last action: edit/)).toBeVisible();
  });

  test('should verify button focus states', async ({ page }) => {
    const panel = page.getByTestId('publish-logged-out-idle');
    await expect(panel).toBeVisible();
    
    // Test keyboard navigation
    const editButton = panel.getByTestId('edit-button');
    await editButton.focus();
    await expect(editButton).toBeFocused();
    await expect(panel).toHaveScreenshot('publish-edit-focus.png', { threshold: 0.1 });
    
    // Tab to next button
    await page.keyboard.press('Tab');
    const copyButton = panel.getByTestId('copy-button');
    await expect(copyButton).toBeFocused();
    await expect(panel).toHaveScreenshot('publish-copy-focus.png', { threshold: 0.1 });
    
    // Tab to save button
    await page.keyboard.press('Tab');
    const saveButton = panel.getByTestId('save-button');
    await expect(saveButton).toBeFocused();
    await expect(panel).toHaveScreenshot('publish-save-focus.png', { threshold: 0.1 });
    
    // Tab to share button
    await page.keyboard.press('Tab');
    const shareButton = panel.getByTestId('share-button');
    await expect(shareButton).toBeFocused();
    await expect(panel).toHaveScreenshot('publish-share-focus.png', { threshold: 0.1 });
  });

  test('should verify button active states', async ({ page }) => {
    const panel = page.getByTestId('publish-logged-out-idle');
    await expect(panel).toBeVisible();
    
    // Test active state by pressing and holding
    const editButton = panel.getByTestId('edit-button');
    await editButton.focus();
    
    // Simulate mousedown for active state
    await editButton.hover();
    await page.mouse.down();
    await expect(panel).toHaveScreenshot('publish-edit-active.png', { threshold: 0.1 });
    await page.mouse.up();
    
    // Test share button active state (different styling)
    const shareButton = panel.getByTestId('share-button');
    await shareButton.hover();
    await page.mouse.down();
    await expect(panel).toHaveScreenshot('publish-share-active.png', { threshold: 0.1 });
    await page.mouse.up();
  });

  test('should verify responsive button layout', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 414, height: 896, name: 'mobile-large' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop-small' },
      { width: 1440, height: 900, name: 'desktop-large' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      const panel = page.getByTestId('publish-logged-out-idle');
      await expect(panel).toBeVisible();
      
      await expect(panel).toHaveScreenshot(`publish-responsive-${viewport.name}.png`, { threshold: 0.1 });
    }
  });

  test('should verify accessibility indicators', async ({ page }) => {
    const panel = page.getByTestId('publish-logged-out-idle');
    await expect(panel).toBeVisible();
    
    // Check that all buttons are properly labeled
    const editButton = panel.getByTestId('edit-button');
    const copyButton = panel.getByTestId('copy-button');
    const saveButton = panel.getByTestId('save-button');
    const shareButton = panel.getByTestId('share-button');
    
    await expect(editButton).toContainText('Edit');
    await expect(copyButton).toContainText('Copy');
    await expect(saveButton).toContainText('Save');
    await expect(shareButton).toContainText('Share');
    
    // Verify icons are present
    await expect(editButton.locator('[data-testid="edit-icon"]')).toBeVisible();
    await expect(copyButton.locator('[data-testid="copy-icon"]')).toBeVisible();
    await expect(saveButton.locator('[data-testid="save-icon"]')).toBeVisible();
    await expect(shareButton.locator('[data-testid="share-icon"]')).toBeVisible();
  });
});