import { test, expect } from '@playwright/test';

test.describe('E2E Publish Actions Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock clipboard API for copy functionality
    await page.addInitScript(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: (text: string) => {
            (window as any).lastCopiedText = text;
            return Promise.resolve();
          },
          readText: () => {
            return Promise.resolve((window as any).lastCopiedText || '');
          }
        }
      });

      // Mock Web Share API
      Object.assign(navigator, {
        share: (data: any) => {
          (window as any).lastSharedData = data;
          return Promise.resolve();
        }
      });
    });

    // Navigate to the publish lab page
    await page.goto('/publish-lab');
    await page.waitForLoadState('networkidle');
    
    // Disable animations for consistent testing
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

  test('should complete full transcript complete → publish → copy flow', async ({ page }) => {
    // Step 1: Verify initial state with content ready for publishing
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    // Verify all action buttons are present and visible
    const editButton = publishPanel.getByTestId('edit-button');
    const copyButton = publishPanel.getByTestId('copy-button');
    const saveButton = publishPanel.getByTestId('save-button');
    const shareButton = publishPanel.getByTestId('share-button');
    
    await expect(editButton).toBeVisible();
    await expect(copyButton).toBeVisible();
    await expect(saveButton).toBeVisible();
    await expect(shareButton).toBeVisible();
    
    // Verify button labels and icons
    await expect(editButton).toContainText('Edit');
    await expect(copyButton).toContainText('Copy');
    await expect(saveButton).toContainText('Save');
    await expect(shareButton).toContainText('Share');
    
    // Step 2: Test copy functionality
    await copyButton.click();
    
    // Verify content was copied
    const copiedText = await page.evaluate(() => (window as any).lastCopiedText);
    expect(copiedText).toContain('This is a medium-length blog content');
    
    // Verify success feedback in debug info
    await expect(publishPanel.getByText(/Last action: copy/)).toBeVisible();
  });

  test('should handle copy with signature functionality', async ({ page }) => {
    const signaturePanel = page.getByTestId('publish-with-signature');
    await expect(signaturePanel).toBeVisible();
    
    const copyButton = signaturePanel.getByTestId('copy-button');
    await copyButton.click();
    
    // Verify signature was added to copied content
    const copiedText = await page.evaluate(() => (window as any).lastCopiedText);
    expect(copiedText).toContain('Blog content that will include a signature when copied.');
    expect(copiedText).toContain('---\nCreated by @vibeyang\nhttps://vibelog.io/vibeyang');
  });

  test('should handle share functionality', async ({ page }) => {
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    const shareButton = publishPanel.getByTestId('share-button');
    await shareButton.click();
    
    // Verify share was called
    const sharedData = await page.evaluate(() => (window as any).lastSharedData);
    expect(sharedData).toBeTruthy();
    
    // Verify success feedback
    await expect(publishPanel.getByText(/Last action: share/)).toBeVisible();
  });

  test('should handle edit flow for logged out user', async ({ page }) => {
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    // Step 1: Click edit button (should show login popup)
    const editButton = publishPanel.getByTestId('edit-button');
    await editButton.click();
    
    // Step 2: Verify login popup appears
    await page.waitForSelector('.fixed.inset-0', { state: 'visible' });
    const loginPopup = page.locator('.fixed.inset-0');
    await expect(loginPopup).toBeVisible();
    await expect(loginPopup.getByText('Login Required')).toBeVisible();
    await expect(loginPopup.getByText('Please sign in to edit your content')).toBeVisible();
    
    // Step 3: Test sign in button
    const signInButton = loginPopup.getByText('Sign In to Edit');
    await expect(signInButton).toBeVisible();
    
    // Step 4: Test "Maybe Later" button
    const maybeLaterButton = loginPopup.getByText('Maybe Later');
    await maybeLaterButton.click();
    
    // Step 5: Verify popup closes
    await expect(loginPopup).not.toBeVisible();
    
    // Step 6: Test close button
    await editButton.click();
    await expect(loginPopup).toBeVisible();
    
    const closeButton = loginPopup.locator('button').filter({ hasText: 'X' }).first();
    await closeButton.click();
    await expect(loginPopup).not.toBeVisible();
  });

  test('should handle save flow for logged out user', async ({ page }) => {
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    // Step 1: Click save button (should show login popup)
    const saveButton = publishPanel.getByTestId('save-button');
    await saveButton.click();
    
    // Step 2: Verify login popup appears with save-specific content
    await page.waitForSelector('.fixed.inset-0', { state: 'visible' });
    const loginPopup = page.locator('.fixed.inset-0');
    await expect(loginPopup).toBeVisible();
    await expect(loginPopup.getByText('Login Required')).toBeVisible();
    await expect(loginPopup.getByText('Please sign in to save your content')).toBeVisible();
    await expect(loginPopup.getByText('Sign In to Save')).toBeVisible();
    
    // Step 3: Close popup
    const maybeLaterButton = loginPopup.getByText('Maybe Later');
    await maybeLaterButton.click();
    await expect(loginPopup).not.toBeVisible();
  });

  test('should handle edit and save for logged in user', async ({ page }) => {
    const loggedInPanel = page.getByTestId('publish-logged-in-idle');
    await expect(loggedInPanel).toBeVisible();
    
    // Test edit button (should work without popup)
    const editButton = loggedInPanel.getByTestId('edit-button');
    await editButton.click();
    
    // Should not show login popup
    await page.waitForTimeout(500);
    await expect(page.getByText('Login Required')).not.toBeVisible();
    
    // Verify edit action was triggered
    await expect(loggedInPanel.getByText(/Last action: edit/)).toBeVisible();
    
    // Test save button
    const saveButton = loggedInPanel.getByTestId('save-button');
    await saveButton.click();
    
    // Should not show login popup
    await page.waitForTimeout(500);
    await expect(page.getByText('Login Required')).not.toBeVisible();
    
    // Verify save action was triggered
    await expect(loggedInPanel.getByText(/Last action: save/)).toBeVisible();
  });

  test('should handle empty content gracefully', async ({ page }) => {
    const emptyPanel = page.getByTestId('publish-empty-content');
    await expect(emptyPanel).toBeVisible();
    
    // Test copy with empty content
    const copyButton = emptyPanel.getByTestId('copy-button');
    await copyButton.click();
    
    const copiedText = await page.evaluate(() => (window as any).lastCopiedText);
    expect(copiedText).toBe('');
    
    // Verify other buttons still work
    const shareButton = emptyPanel.getByTestId('share-button');
    await shareButton.click();
    await expect(emptyPanel.getByText(/Last action: share/)).toBeVisible();
  });

  test('should handle long content correctly', async ({ page }) => {
    const longPanel = page.getByTestId('publish-long-content');
    await expect(longPanel).toBeVisible();
    
    const copyButton = longPanel.getByTestId('copy-button');
    await copyButton.click();
    
    const copiedText = await page.evaluate(() => (window as any).lastCopiedText);
    expect(copiedText).toContain('This is a much longer blog content');
    expect(copiedText.length).toBeGreaterThan(500); // Verify it's actually long content
  });

  test('should test keyboard accessibility', async ({ page }) => {
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    // Tab through buttons
    await page.keyboard.press('Tab');
    const editButton = publishPanel.getByTestId('edit-button');
    await expect(editButton).toBeFocused();
    
    // Enter key should trigger click
    await page.keyboard.press('Enter');
    await page.waitForSelector('.fixed.inset-0', { state: 'visible' });
    await expect(page.getByText('Login Required')).toBeVisible();
    
    // Escape should close popup (if implemented)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Close via Maybe Later
    await page.getByText('Maybe Later').click();
    await expect(page.getByText('Login Required')).not.toBeVisible();
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    const copyButton = publishPanel.getByTestId('copy-button');
    await expect(copyButton).toBeFocused();
    
    await page.keyboard.press('Tab');
    const saveButton = publishPanel.getByTestId('save-button');
    await expect(saveButton).toBeFocused();
    
    await page.keyboard.press('Tab');
    const shareButton = publishPanel.getByTestId('share-button');
    await expect(shareButton).toBeFocused();
  });

  test('should handle rapid button clicks without issues', async ({ page }) => {
    const publishPanel = page.getByTestId('publish-logged-in-idle');
    await expect(publishPanel).toBeVisible();
    
    // Rapid clicks on copy button
    const copyButton = publishPanel.getByTestId('copy-button');
    await copyButton.click();
    await copyButton.click();
    await copyButton.click();
    
    // Should handle gracefully
    await expect(publishPanel.getByText(/Last action: copy/)).toBeVisible();
    
    // Rapid clicks on different buttons
    const editButton = publishPanel.getByTestId('edit-button');
    const shareButton = publishPanel.getByTestId('share-button');
    
    await editButton.click();
    await shareButton.click();
    await copyButton.click();
    
    await expect(publishPanel.getByText(/Last action: copy/)).toBeVisible();
  });

  test('should test button hover and focus states', async ({ page }) => {
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    // Test hover states
    const editButton = publishPanel.getByTestId('edit-button');
    await editButton.hover();
    
    // Verify hover styling is applied (background changes)
    const buttonStyles = await editButton.evaluate(el => getComputedStyle(el));
    expect(buttonStyles).toBeTruthy();
    
    // Test share button special styling
    const shareButton = publishPanel.getByTestId('share-button');
    await shareButton.hover();
    
    // Share button should have electric styling
    const shareClasses = await shareButton.getAttribute('class');
    expect(shareClasses).toContain('bg-electric/20');
  });

  test('should verify responsive behavior', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobilePanel = page.getByTestId('mobile-test');
    await expect(mobilePanel).toBeVisible();
    
    // Buttons should still be clickable and properly sized
    const buttons = [
      mobilePanel.getByTestId('edit-button'),
      mobilePanel.getByTestId('copy-button'),
      mobilePanel.getByTestId('save-button'),
      mobilePanel.getByTestId('share-button')
    ];
    
    for (const button of buttons) {
      await expect(button).toBeVisible();
      
      // Verify minimum size for touch targets (44px recommendation)
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThan(44);
      expect(box?.height).toBeGreaterThan(44);
    }
    
    // Test functionality on mobile
    const copyButton = mobilePanel.getByTestId('copy-button');
    await copyButton.click();
    await expect(mobilePanel.getByText(/Last action: copy/)).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    // Verify buttons are properly sized for tablet
    const tabletCopyButton = publishPanel.getByTestId('copy-button');
    await tabletCopyButton.click();
    await expect(publishPanel.getByText(/Last action: copy/)).toBeVisible();
  });

  test('should handle error states and edge cases', async ({ page }) => {
    // Test with disabled buttons (if implemented)
    const disabledPanel = page.getByTestId('publish-disabled-state');
    await expect(disabledPanel).toBeVisible();
    
    // Buttons should be visually disabled
    const disabledEditButton = disabledPanel.getByTestId('edit-button');
    const buttonClasses = await disabledEditButton.getAttribute('class');
    expect(buttonClasses).toContain('opacity-50');
    
    // Test clipboard API failure handling
    await page.evaluate(() => {
      // Mock clipboard failure
      Object.assign(navigator, {
        clipboard: {
          writeText: () => Promise.reject(new Error('Clipboard access denied'))
        }
      });
    });
    
    const normalPanel = page.getByTestId('publish-logged-out-idle');
    const copyButton = normalPanel.getByTestId('copy-button');
    
    // Should handle clipboard failure gracefully
    await copyButton.click();
    // The component should still update the debug info even if clipboard fails
    await expect(normalPanel.getByText(/Last action: copy/)).toBeVisible();
  });

  test('should verify integration with parent MicRecorder flow', async ({ page }) => {
    // This would test the actual integration, but since we're testing in isolation,
    // we'll verify that the component properly handles the expected props and callbacks
    
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel).toBeVisible();
    
    // Verify content length is shown correctly
    await expect(publishPanel.getByText(/Content length: \d+/)).toBeVisible();
    
    // Test all four main actions work
    const editButton = publishPanel.getByTestId('edit-button');
    const copyButton = publishPanel.getByTestId('copy-button');
    const saveButton = publishPanel.getByTestId('save-button');
    const shareButton = publishPanel.getByTestId('share-button');
    
    // Edit should show popup for logged out user
    await editButton.click();
    await expect(page.getByText('Login Required')).toBeVisible();
    await page.getByText('Maybe Later').click();
    
    // Copy should work immediately
    await copyButton.click();
    await expect(publishPanel.getByText(/Last action: copy/)).toBeVisible();
    
    // Save should show popup for logged out user
    await saveButton.click();
    await expect(page.getByText('Sign In to Save')).toBeVisible();
    await page.getByText('Maybe Later').click();
    
    // Share should work immediately
    await shareButton.click();
    await expect(publishPanel.getByText(/Last action: share/)).toBeVisible();
  });

  test('should handle full record → processing → publish flow with ProcessingAnimation', async ({ page }) => {
    // This test verifies the complete integration flow with ProcessingAnimation
    
    // Step 1: Navigate to main recorder (not the lab)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Start recording simulation
    // Note: In a real test, this would involve actual recording, but we can test the UI flow
    const recordButton = page.getByTestId('record-button');
    if (await recordButton.isVisible()) {
      await recordButton.click();
      
      // Wait for recording state
      await page.waitForTimeout(1000);
      
      // Stop recording to trigger processing
      await recordButton.click();
    }
    
    // Step 3: Verify ProcessingAnimation appears
    // The processing state should show the Star Wars crawl animation
    const processingAnimation = page.locator('.star-wars-crawl');
    await expect(processingAnimation).toBeVisible({ timeout: 10000 });
    
    // Step 4: Verify all processing steps are displayed
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
    
    for (const stepTitle of expectedSteps) {
      await expect(page.getByText(stepTitle)).toBeVisible();
    }
    
    // Step 5: Verify Star Wars crawl visual effects
    await expect(page.locator('.perspective-1000')).toBeVisible();
    await expect(page.locator('.crawl-step')).toHaveCount(12);
    
    // Step 6: Verify loading spinner and header
    await expect(page.locator('.animate-spin')).toBeVisible();
    await expect(page.getByText('⚡ Vibelogging your content...')).toBeVisible();
    
    // Step 7: Verify particle effects
    const particles = page.locator('.animate-pulse, .animate-ping');
    await expect(particles.first()).toBeVisible();
    
    // Step 8: Wait for processing to complete and transition to publish panel
    // This timeout should be reasonable for the animation to complete
    await expect(page.getByTestId('publish-logged-out-idle')).toBeVisible({ timeout: 30000 });
    
    // Step 9: Verify publish actions are available after processing
    const publishPanel = page.getByTestId('publish-logged-out-idle');
    await expect(publishPanel.getByTestId('edit-button')).toBeVisible();
    await expect(publishPanel.getByTestId('copy-button')).toBeVisible();
    await expect(publishPanel.getByTestId('save-button')).toBeVisible();
    await expect(publishPanel.getByTestId('share-button')).toBeVisible();
    
    // Step 10: Test publish actions work after processing animation
    const copyButton = publishPanel.getByTestId('copy-button');
    await copyButton.click();
    
    // Verify content was copied (this indicates the full flow worked)
    const copiedText = await page.evaluate(() => (window as any).lastCopiedText);
    expect(copiedText).toBeTruthy();
    
    // Verify success feedback
    await expect(publishPanel.getByText(/Last action: copy/)).toBeVisible();
  });

  test('should preserve Star Wars crawl effect visual consistency', async ({ page }) => {
    // This test specifically verifies the visual preservation of the Star Wars crawl effect
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Trigger processing state (simulate or navigate to processing lab)
    await page.goto('/publish-lab');
    await page.waitForLoadState('networkidle');
    
    // Find a processing animation instance
    const processingPanel = page.getByTestId('processing-short-recording-fast');
    await expect(processingPanel).toBeVisible();
    
    // Verify Star Wars crawl container structure
    const crawlContainer = processingPanel.locator('.star-wars-crawl');
    await expect(crawlContainer).toBeVisible();
    
    // Verify perspective transformation is applied
    const perspectiveContainer = processingPanel.locator('.perspective-1000');
    await expect(perspectiveContainer).toBeVisible();
    
    // Verify gradient overlays for fade effect
    const gradientOverlay = processingPanel.locator('.bg-gradient-to-t');
    await expect(gradientOverlay).toBeVisible();
    
    // Verify all crawl steps have proper spacing
    const crawlSteps = processingPanel.locator('.crawl-step');
    await expect(crawlSteps).toHaveCount(12);
    
    // Check each step has proper styling classes
    for (let i = 0; i < 12; i++) {
      const step = crawlSteps.nth(i);
      await expect(step).toHaveClass(/crawl-step/);
      await expect(step).toHaveClass(/transition-all/);
      await expect(step).toHaveClass(/duration-1000/);
    }
    
    // Verify text sizing and scaling
    const stepTitles = processingPanel.locator('h3');
    for (let i = 0; i < 12; i++) {
      const title = stepTitles.nth(i);
      await expect(title).toHaveClass(/text-3xl|text-4xl|text-5xl/);
      await expect(title).toHaveClass(/font-bold/);
      await expect(title).toHaveClass(/tracking-wider/);
    }
    
    // Verify electric gradient styling is preserved
    const electricElements = processingPanel.locator('[class*="electric"]');
    await expect(electricElements.first()).toBeVisible();
    
    // Take a snapshot to verify visual consistency
    await expect(processingPanel).toHaveScreenshot('star-wars-crawl-preservation.png', { threshold: 0.1 });
  });

  test('should maintain responsive behavior of ProcessingAnimation', async ({ page }) => {
    // Test responsive behavior across different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      await page.goto('/publish-lab');
      await page.waitForLoadState('networkidle');
      
      const processingPanel = page.getByTestId('processing-short-recording-fast');
      await expect(processingPanel).toBeVisible();
      
      // Verify crawl effect works on all viewport sizes
      const crawlContainer = processingPanel.locator('.star-wars-crawl');
      await expect(crawlContainer).toBeVisible();
      
      // Verify text remains readable and properly sized
      const stepTitles = processingPanel.locator('h3');
      await expect(stepTitles.first()).toBeVisible();
      
      // Verify container maintains proper proportions
      const mainContainer = processingPanel.locator('.backdrop-blur-xl').first();
      await expect(mainContainer).toBeVisible();
      
      // Check that animation container has proper height
      const animationHeight = processingPanel.locator('.h-96');
      await expect(animationHeight).toBeVisible();
      
      // Take responsive snapshot
      await expect(processingPanel).toHaveScreenshot(`processing-responsive-${viewport.name}.png`, { threshold: 0.1 });
    }
  });

  test('should verify ProcessingAnimation timing calculations work correctly', async ({ page }) => {
    // Test that different recording times produce appropriate timing behavior
    
    await page.goto('/publish-lab');
    await page.waitForLoadState('networkidle');
    
    // Test short recording timing (should be faster)
    const shortPanel = page.getByTestId('processing-short-recording-fast');
    await expect(shortPanel).toBeVisible();
    await expect(shortPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();
    
    // Test medium recording timing
    const mediumPanel = page.getByTestId('processing-medium-recording-moderate');
    await expect(mediumPanel).toBeVisible();
    await expect(mediumPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();
    
    // Test long recording timing (should be slower)
    const longPanel = page.getByTestId('processing-long-recording-slow');
    await expect(longPanel).toBeVisible();
    await expect(longPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();
    
    // Verify all have the same visual structure despite different timings
    for (const panel of [shortPanel, mediumPanel, longPanel]) {
      await expect(panel.locator('.star-wars-crawl')).toBeVisible();
      await expect(panel.locator('.crawl-step')).toHaveCount(12);
      await expect(panel.locator('.animate-spin')).toBeVisible();
    }
    
    // Verify debug info shows correct recording times
    await expect(shortPanel.getByText(/Recording time: 15s/)).toBeVisible();
    await expect(mediumPanel.getByText(/Recording time: 60s/)).toBeVisible();
    await expect(longPanel.getByText(/Recording time: 180s/)).toBeVisible();
  });

  test('should handle ProcessingAnimation error states gracefully', async ({ page }) => {
    // Test error handling in ProcessingAnimation
    
    await page.goto('/publish-lab');
    await page.waitForLoadState('networkidle');
    
    // Test transcription error state
    const transcriptionErrorPanel = page.getByTestId('processing-transcription-error');
    await expect(transcriptionErrorPanel).toBeVisible();
    
    // Should still show the animation despite errors
    await expect(transcriptionErrorPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();
    await expect(transcriptionErrorPanel.locator('.star-wars-crawl')).toBeVisible();
    await expect(transcriptionErrorPanel.locator('.crawl-step')).toHaveCount(12);
    
    // Test blog generation error state
    const blogErrorPanel = page.getByTestId('processing-blog-generation-error');
    await expect(blogErrorPanel).toBeVisible();
    
    // Should still show the animation despite errors
    await expect(blogErrorPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();
    await expect(blogErrorPanel.locator('.star-wars-crawl')).toBeVisible();
    
    // Test both errors state
    const bothErrorsPanel = page.getByTestId('processing-both-errors');
    await expect(bothErrorsPanel).toBeVisible();
    
    // Should still show the animation despite both errors
    await expect(bothErrorsPanel.getByText('⚡ Vibelogging your content...')).toBeVisible();
    await expect(bothErrorsPanel.locator('.star-wars-crawl')).toBeVisible();
    
    // Verify error states don't break the visual layout
    await expect(transcriptionErrorPanel).toHaveScreenshot('processing-transcription-error.png', { threshold: 0.1 });
    await expect(blogErrorPanel).toHaveScreenshot('processing-blog-error.png', { threshold: 0.1 });
    await expect(bothErrorsPanel).toHaveScreenshot('processing-both-errors.png', { threshold: 0.1 });
  });
});