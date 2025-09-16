import { test, expect } from '@playwright/test';

// MicRecorder Visual Regression Test Suite
// This test suite captures screenshots of all MicRecorder states for visual regression testing

test.describe('MicRecorder Visual Regression Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to mic-lab page
    await page.goto('/mic-lab');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Wait for critical elements instead of arbitrary timeout
    await page.waitForSelector('[data-testid="mic-recorder"]', { timeout: 5000 });
  });

  // Test each MicRecorder state individually
  const micStates = [
    { id: 'idle', name: 'Idle State' },
    { id: 'permission-request', name: 'Permission Request' },
    { id: 'recording', name: 'Recording State' },
    { id: 'processing', name: 'Processing State' },
    { id: 'complete', name: 'Complete State' },
    { id: 'error', name: 'Error State' }
  ];

  for (const state of micStates) {
    test(`MicRecorder - ${state.name}`, async ({ page }) => {
      // Navigate to specific state
      await page.goto(`/mic-lab?state=${state.id}`);
      
      // Wait for page to load and settle
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Extra time for animations to settle
      
      // Wait for the specific mic component to be visible
      const micElement = page.locator(`[data-testid="mic-${state.id}"]`);
      await expect(micElement).toBeVisible();
      
      // For processing state, wait for initial animation phase
      if (state.id === 'processing') {
        await page.waitForTimeout(2000);
      }
      
      // For recording state, wait for waveform to initialize
      if (state.id === 'recording') {
        await page.waitForTimeout(1500);
      }
      
      // Take screenshot of the specific mic component
      await expect(micElement).toHaveScreenshot(`mic-${state.id}.png`, {
        animations: 'disabled',
        mask: [
          // Mask any elements that might have dynamic content
          page.locator('.animate-pulse'),
          page.locator('.animate-spin'),
          page.locator('[data-dynamic="true"]')
        ]
      });
    });
  }

  test('MicRecorder - All States Overview', async ({ page }) => {
    // Test the complete lab page showing all states
    await page.goto('/mic-lab');
    
    // Wait for all components to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take a full-page screenshot for overview
    await expect(page).toHaveScreenshot('mic-lab-overview.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        // Mask animated elements
        page.locator('.animate-pulse'),
        page.locator('.animate-spin'),
        page.locator('.star-wars-crawl')
      ]
    });
  });

  test('MicRecorder - Responsive Breakpoints', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },    // iPhone SE
      { width: 768, height: 1024, name: 'tablet' },   // iPad
      { width: 1920, height: 1080, name: 'desktop' }  // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Test idle state at this viewport
      await page.goto('/mic-lab?state=idle');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      const micElement = page.locator('[data-testid="mic-idle"]');
      await expect(micElement).toBeVisible();
      
      await expect(micElement).toHaveScreenshot(`mic-idle-${viewport.name}.png`, {
        animations: 'disabled'
      });
    }
  });

  test.skip('MicRecorder - Action Buttons', async ({ page }) => {
    // SKIP: This test requires proper state mocking in /mic-lab 
    // Will be fixed when we implement controllable MicRecorder states
    await page.goto('/mic-lab?state=complete');
  });

  test('MicRecorder - Processing Animation Frames', async ({ page }) => {
    // Test different frames of the processing animation
    await page.goto('/mic-lab?state=processing');
    await page.waitForLoadState('networkidle');
    
    const processingElement = page.locator('[data-testid="mic-processing"]');
    await expect(processingElement).toBeVisible();
    
    // Capture initial frame
    await expect(processingElement).toHaveScreenshot('mic-processing-frame-1.png', {
      animations: 'disabled'
    });
    
    // Wait and capture mid-animation frame
    await page.waitForTimeout(3000);
    await expect(processingElement).toHaveScreenshot('mic-processing-frame-2.png', {
      animations: 'disabled'
    });
  });

  test('MicRecorder - Focus States', async ({ page }) => {
    // Test keyboard focus states for accessibility
    await page.goto('/mic-lab?state=idle');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Find the main mic button and focus it
    const micButton = page.locator('[data-testid="mic-idle"] button').first();
    await micButton.focus();
    
    await expect(micButton).toHaveScreenshot('mic-button-focused.png', {
      animations: 'disabled'
    });
  });
});