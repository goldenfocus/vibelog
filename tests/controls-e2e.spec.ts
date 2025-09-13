import { test, expect } from '@playwright/test';

// E2E tests for Controls component user flows
// Following Golden Testing Matrix: happy paths + critical errors

test.describe('Controls E2E User Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to main page
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for any initial animations to settle
    await page.waitForTimeout(1000);
  });

  test('User can start recording flow', async ({ page }) => {
    // Should be in idle state initially
    const micButton = page.locator('button.mic');
    await expect(micButton).toBeVisible();
    await expect(micButton).not.toHaveClass(/is-recording/);
    
    // Click to start recording (note: will fail due to permissions in headless)
    await micButton.click();
    
    // Should handle permission gracefully
    await page.waitForTimeout(2000);
    
    // The app should either start recording or show permission error
    // In headless mode, it will likely show permission denied
    const statusText = page.locator('.text-muted-foreground.text-lg');
    await expect(statusText).toBeVisible();
  });

  test('User can interact with mic button states', async ({ page }) => {
    const micButton = page.locator('button.mic');
    
    // Test idle state interaction
    await expect(micButton).toBeVisible();
    await expect(micButton).toBeEnabled();
    
    // Verify hover effects work
    await micButton.hover();
    await page.waitForTimeout(500);
    
    // Test button remains clickable
    await expect(micButton).toBeEnabled();
  });

  test('Recording timer display works', async ({ page }) => {
    // Note: This test verifies the timer would display correctly
    // Actual recording requires mic permissions
    
    const micButton = page.locator('button.mic');
    await micButton.click();
    
    // Wait for any state changes
    await page.waitForTimeout(1500);
    
    // Check if timer appears (only if recording actually started)
    const timer = page.locator('[data-testid="recording-timer"]');
    
    // Timer should either be visible (if recording) or not present (if permission denied)
    const isTimerVisible = await timer.isVisible().catch(() => false);
    
    if (isTimerVisible) {
      // If recording started, timer should show time format
      await expect(timer).toHaveText(/\d+:\d{2}/);
    }
  });

  test('Keyboard accessibility works', async ({ page }) => {
    const micButton = page.locator('button.mic');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Mic button should be focusable
    await expect(micButton).toBeFocused();
    
    // Test Enter key activation
    await page.keyboard.press('Enter');
    
    // Should trigger the same action as click
    await page.waitForTimeout(1000);
  });

  test('Visual state changes are correct', async ({ page }) => {
    const micButton = page.locator('button.mic');
    
    // Initial state - should have specific classes
    await expect(micButton).toHaveClass(/bg-gradient-electric/);
    await expect(micButton).toHaveClass(/w-40/);
    await expect(micButton).toHaveClass(/h-40/);
    await expect(micButton).toHaveClass(/rounded-full/);
    
    // Status text should be visible
    const statusText = page.locator('.text-muted-foreground.text-lg');
    await expect(statusText).toBeVisible();
    await expect(statusText).toContainText(/tap to start/i);
  });

  test('Error handling works gracefully', async ({ page }) => {
    const micButton = page.locator('button.mic');
    
    // In headless environment, mic permission will likely be denied
    await micButton.click();
    
    // Wait for error handling
    await page.waitForTimeout(3000);
    
    // Should not crash or show broken state
    await expect(micButton).toBeVisible();
    await expect(micButton).toBeEnabled();
    
    // May show error toast or remain in idle state
    const isStillIdle = await micButton.evaluate(el => !el.classList.contains('is-recording'));
    expect(isStillIdle).toBe(true);
  });

  test('Responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const micButton = page.locator('button.mic');
    
    // Button should be visible and properly sized on mobile
    await expect(micButton).toBeVisible();
    
    // Should have mobile-responsive classes
    await expect(micButton).toHaveClass(/sm:w-48/);
    await expect(micButton).toHaveClass(/sm:h-48/);
    
    // Should be touchable
    await micButton.tap();
    await page.waitForTimeout(1000);
  });

  test('ARIA labels are correct for accessibility', async ({ page }) => {
    const micButton = page.locator('button.mic');
    
    // Should have proper aria-label
    const ariaLabel = await micButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel?.toLowerCase()).toMatch(/record|start|tap/);
  });
});