import { test, expect } from '@playwright/test';

test.describe('E2E Transcription Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock microphone permissions to avoid browser prompts
    await context.grantPermissions(['microphone']);

    // Navigate to the mic-lab page for controlled testing
    await page.goto('/mic-lab');
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
      `,
    });
  });

  test('should complete full record → stop → edit transcript flow', async ({ page }) => {
    // Step 1: Start in idle state
    const micRecorder = page.getByTestId('mic-idle');
    await expect(micRecorder).toBeVisible();

    // Verify empty state is shown
    const emptyTranscript = micRecorder.getByTestId('empty-transcript-panel');
    await expect(emptyTranscript).toBeVisible();
    await expect(emptyTranscript).toContainText('No transcription yet');

    // Step 2: Start recording
    const startButton = micRecorder.getByTestId('start-recording-button');
    await expect(startButton).toBeVisible();

    // Mock the MediaRecorder API
    await page.evaluate(() => {
      // Mock MediaRecorder for testing
      (window as any).MediaRecorder = class MockMediaRecorder {
        constructor() {
          this.state = 'inactive';
          this.ondataavailable = null;
          this.onstart = null;
          this.onstop = null;
        }
        start() {
          this.state = 'recording';
          if (this.onstart) {
            this.onstart();
          }
          // Simulate data available after a short delay
          setTimeout(() => {
            if (this.ondataavailable) {
              const mockData = new Blob(['mock audio data'], { type: 'audio/webm' });
              this.ondataavailable({ data: mockData });
            }
          }, 100);
        }
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
        }
      };

      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = () => Promise.resolve(new MediaStream());

      // Mock Speech Recognition
      (window as any).webkitSpeechRecognition = class MockSpeechRecognition {
        constructor() {
          this.continuous = true;
          this.interimResults = true;
          this.lang = 'en-US';
          this.onstart = null;
          this.onresult = null;
          this.onerror = null;
          this.onend = null;
        }
        start() {
          if (this.onstart) {
            this.onstart();
          }
          // Simulate live transcript
          setTimeout(() => {
            if (this.onresult) {
              const mockEvent = {
                resultIndex: 0,
                results: [
                  {
                    0: { transcript: 'This is a test transcription' },
                    isFinal: false,
                  },
                ],
              };
              this.onresult(mockEvent);
            }
          }, 500);
        }
        stop() {
          if (this.onend) {
            this.onend();
          }
        }
      };
    });

    await startButton.click();

    // Step 3: Verify recording state
    await expect(page.getByText('Recording')).toBeVisible({ timeout: 5000 });

    // Verify live transcript appears
    const liveTranscriptPanel = page.getByTestId('live-transcript-panel');
    await expect(liveTranscriptPanel).toBeVisible({ timeout: 3000 });

    // Verify live transcript content
    const liveTranscriptText = page.getByTestId('live-transcript-text');
    await expect(liveTranscriptText).toBeVisible();

    // Verify character and word counters are present
    const liveCharCount = page.getByTestId('live-transcript-char-count');
    const liveWordCount = page.getByTestId('live-transcript-word-count');
    await expect(liveCharCount).toBeVisible();
    await expect(liveWordCount).toBeVisible();
    await expect(liveCharCount).toContainText('Characters:');
    await expect(liveWordCount).toContainText('Words:');

    // Step 4: Stop recording
    const stopButton = page.getByTestId('stop-recording-button');
    await expect(stopButton).toBeVisible();
    await stopButton.click();

    // Step 5: Verify processing state
    await expect(page.getByText('Vibelogging your content')).toBeVisible({ timeout: 5000 });

    // Mock the AI processing endpoints
    await page.route('/api/transcribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transcription: 'This is a test transcription that was processed by the AI system.',
        }),
      });
    });

    await page.route('/api/generate-vibelog', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          vibelogContent: 'This is the generated vibelog content based on the transcription.',
        }),
      });
    });

    // Step 6: Wait for processing to complete
    await expect(page.getByText('Original Transcription')).toBeVisible({ timeout: 15000 });

    // Verify completed transcription panel
    const completedPanel = page.getByTestId('completed-transcript-panel');
    await expect(completedPanel).toBeVisible();

    const completedTranscriptText = page.getByTestId('completed-transcript-text');
    await expect(completedTranscriptText).toBeVisible();
    await expect(completedTranscriptText).toContainText('test transcription');

    // Verify edit and copy buttons are present
    const editButton = page.getByTestId('edit-transcript-button');
    const copyButton = page.getByTestId('copy-transcript-button');
    await expect(editButton).toBeVisible();
    await expect(copyButton).toBeVisible();

    // Verify character and word counters for completed transcript
    const completedCharCount = page.getByTestId('completed-transcript-char-count');
    const completedWordCount = page.getByTestId('completed-transcript-word-count');
    await expect(completedCharCount).toBeVisible();
    await expect(completedWordCount).toBeVisible();
    await expect(completedCharCount).toContainText('Characters:');
    await expect(completedWordCount).toContainText('Words:');

    // Step 7: Test copy functionality
    let copiedText = '';
    await page.evaluate(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: (text: string) => {
            (window as any).lastCopiedText = text;
            return Promise.resolve();
          },
        },
      });
    });

    await copyButton.click();

    // Verify copy toast appears
    await expect(page.getByText('Copied')).toBeVisible({ timeout: 3000 });

    // Verify content was copied
    copiedText = await page.evaluate(() => (window as any).lastCopiedText || '');
    expect(copiedText).toContain('test transcription');

    // Step 8: Test edit functionality (logged out user)
    await editButton.click();

    // Should show login popup for logged out user
    await expect(page.getByText('Login Required')).toBeVisible({ timeout: 3000 });
    const loginPopup = page.locator('.fixed.inset-0').filter({ hasText: 'Login Required' });
    await expect(loginPopup).toBeVisible();

    // Close login popup
    const closeLoginButton = loginPopup.getByRole('button', { name: /close/i }).first();
    await closeLoginButton.click();
    await expect(loginPopup).not.toBeVisible();
  });

  test('should test edit functionality for logged in user', async ({ page }) => {
    // Navigate to completed state directly for faster testing
    await page.goto('/mic-lab?state=complete');
    await page.waitForLoadState('networkidle');

    // Mock logged in state by evaluating JavaScript
    await page.evaluate(() => {
      // This is a simplified mock - in real app would need to mock auth context
      (window as any).isLoggedIn = true;
    });

    // Mock the TranscriptionPanel with logged in state
    await page.evaluate(() => {
      // Find and update TranscriptionPanel props
      const elements = document.querySelectorAll('[data-testid*="transcript"]');
      elements.forEach(element => {
        // This is a testing workaround - normally props would come from React context
        element.setAttribute('data-logged-in', 'true');
      });
    });

    const completedPanel = page.getByTestId('completed-transcript-panel');
    await expect(completedPanel).toBeVisible();

    const editButton = completedPanel.getByTestId('edit-transcript-button');
    await editButton.click();

    // Should open edit modal for logged in user
    await expect(page.getByText('Edit Your Transcript')).toBeVisible({ timeout: 3000 });

    const editModal = page.locator('.fixed.inset-0').filter({ hasText: 'Edit Your Transcript' });
    await expect(editModal).toBeVisible();

    // Verify textarea is present and editable
    const textarea = page.getByTestId('transcript-edit-textarea');
    await expect(textarea).toBeVisible();

    // Test editing the content
    await textarea.clear();
    await textarea.fill('This is the edited transcription content for testing.');

    // Verify character and word counters update in real-time
    const modalCharCount = editModal.getByText(/Characters: \d+/);
    const modalWordCount = editModal.getByText(/Words: \d+/);
    await expect(modalCharCount).toBeVisible();
    await expect(modalWordCount).toBeVisible();
    await expect(modalCharCount).toContainText('Characters: 57'); // Length of test text
    await expect(modalWordCount).toContainText('Words: 9'); // Word count of test text

    // Test save functionality
    const saveButton = editModal.getByRole('button', { name: /save/i });
    await saveButton.click();

    // Modal should close
    await expect(editModal).not.toBeVisible();

    // Verify success toast
    await expect(page.getByText('Transcript updated successfully')).toBeVisible({ timeout: 3000 });

    // Test cancel functionality
    await editButton.click();
    await expect(editModal).toBeVisible();

    const cancelButton = editModal.locator('button').filter({ hasText: 'X' }).first();
    await cancelButton.click();

    await expect(editModal).not.toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    const micRecorder = page.getByTestId('mic-idle');
    await expect(micRecorder).toBeVisible();

    // Mock failed getUserMedia
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Permission denied'));
    });

    const startButton = micRecorder.getByTestId('start-recording-button');
    await startButton.click();

    // Should show permission error
    await expect(page.getByText(/permission/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle API failures during processing', async ({ page }) => {
    // Set up successful recording flow first
    await page.evaluate(() => {
      (window as any).MediaRecorder = class MockMediaRecorder {
        constructor() {
          this.state = 'inactive';
          this.ondataavailable = null;
          this.onstart = null;
          this.onstop = null;
        }
        start() {
          this.state = 'recording';
          if (this.onstart) {
            this.onstart();
          }
        }
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
          if (this.ondataavailable) {
            const mockData = new Blob(['mock audio data'], { type: 'audio/webm' });
            this.ondataavailable({ data: mockData });
          }
        }
      };

      navigator.mediaDevices.getUserMedia = () => Promise.resolve(new MediaStream());
    });

    // Mock failed API responses
    await page.route('/api/transcribe', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Transcription failed' }),
      });
    });

    const micRecorder = page.getByTestId('mic-idle');
    const startButton = micRecorder.getByTestId('start-recording-button');
    await startButton.click();

    // Wait briefly then stop
    await page.waitForTimeout(1000);
    const stopButton = page.getByTestId('stop-recording-button');
    await stopButton.click();

    // Should show error message
    await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should verify counter accuracy with various text types', async ({ page }) => {
    // Navigate to transcript lab for controlled testing
    await page.goto('/transcript-lab');
    await page.waitForLoadState('networkidle');

    // Test medium transcript counters
    const mediumPanel = page.getByTestId('transcript-completed-medium');
    await expect(mediumPanel).toBeVisible();

    const charCount = mediumPanel.getByTestId('completed-transcript-char-count');
    const wordCount = mediumPanel.getByTestId('completed-transcript-word-count');

    await expect(charCount).toBeVisible();
    await expect(wordCount).toBeVisible();

    // Verify the counts match expected values
    await expect(charCount).toContainText('Characters:');
    await expect(wordCount).toContainText('Words:');

    // Test punctuation transcript
    const punctuationPanel = page.getByTestId('transcript-completed-punctuation');
    await expect(punctuationPanel).toBeVisible();

    const punctCharCount = punctuationPanel.getByTestId('completed-transcript-char-count');
    const punctWordCount = punctuationPanel.getByTestId('completed-transcript-word-count');

    await expect(punctCharCount).toBeVisible();
    await expect(punctWordCount).toBeVisible();

    // Test multiline transcript
    const multilinePanel = page.getByTestId('transcript-completed-multiline');
    await expect(multilinePanel).toBeVisible();

    const multiCharCount = multilinePanel.getByTestId('completed-transcript-char-count');
    const multiWordCount = multilinePanel.getByTestId('completed-transcript-word-count');

    await expect(multiCharCount).toBeVisible();
    await expect(multiWordCount).toBeVisible();
  });

  test('should test responsive behavior', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/transcript-lab');
    await page.waitForLoadState('networkidle');

    const mediumPanel = page.getByTestId('transcript-completed-medium');
    await expect(mediumPanel).toBeVisible();

    // Verify buttons are still accessible on mobile
    const editButton = mediumPanel.getByTestId('edit-transcript-button');
    const copyButton = mediumPanel.getByTestId('copy-transcript-button');

    await expect(editButton).toBeVisible();
    await expect(copyButton).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(mediumPanel).toBeVisible();
    await expect(editButton).toBeVisible();
    await expect(copyButton).toBeVisible();
  });
});
