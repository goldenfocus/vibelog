import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // Only run E2E/visual tests; ignore unit tests (Vitest)
  testIgnore: ['tests/unit/**'],
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Max speed: Use all available CPU cores in CI */
  workers: process.env.CI ? '75%' : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['line'],
    process.env.CI ? ['github'] : ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // High resolution for detailed visual comparisons
        viewport: { width: 1920, height: 1080 }
      },
    },

    // We'll focus on Chrome for visual regression testing to keep snapshots consistent
    // Can add other browsers later if needed
    
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  /* Global test timeout */
  timeout: 30 * 1000, // 30 seconds per test
  
  /* Global expect timeout */
  expect: {
    /* Timeout for expect() assertions */
    timeout: 10 * 1000, // 10 seconds
    
    /* Threshold for visual comparisons - balanced speed vs accuracy */
    toHaveScreenshot: {
      threshold: 0.005, // 0.5% threshold - still strict but faster
      animations: 'disabled', // Disable animations for consistent screenshots
    },
  },
});
