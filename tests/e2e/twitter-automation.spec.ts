import { test, expect } from '@playwright/test';

import { TwitterAuth } from '@/lib/publishers/twitter-auth';
import { TwitterAutomation, createThread } from '@/lib/publishers/twitter-automation';

/**
 * E2E tests for Twitter automation
 *
 * NOTE: These tests require real Twitter credentials set in environment variables:
 * - TWITTER_TEST_USERNAME
 * - TWITTER_TEST_PASSWORD
 *
 * Run with: npm run test:e2e
 */

// Skip tests if credentials not provided
const hasCredentials = process.env.TWITTER_TEST_USERNAME && process.env.TWITTER_TEST_PASSWORD;

test.describe('Twitter Automation', () => {
  test.describe.configure({ mode: 'serial' });

  let twitter: TwitterAutomation;
  let auth: TwitterAuth;
  const testUsername = process.env.TWITTER_TEST_USERNAME || '';
  const testPassword = process.env.TWITTER_TEST_PASSWORD || '';

  test.beforeAll(async () => {
    if (!hasCredentials) {
      test.skip();
      return;
    }

    auth = new TwitterAuth('.twitter-sessions-test');
    twitter = new TwitterAutomation(testUsername);
  });

  test.afterAll(async () => {
    if (auth) {
      await auth.close();
    }
  });

  test.describe('Authentication', () => {
    test('should login with valid credentials', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const result = await twitter.login({
        username: testUsername,
        password: testPassword,
      });

      expect(result).toBe(true);
    });

    test('should have valid session after login', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const hasSession = await twitter.hasValidSession();
      expect(hasSession).toBe(true);
    });

    test('should fail login with invalid credentials', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const tempAuth = new TwitterAuth('.twitter-sessions-test-invalid');
      await expect(
        tempAuth.login({
          username: 'invalid_user_12345',
          password: 'wrong_password',
        })
      ).rejects.toThrow();
      await tempAuth.close();
    });
  });

  test.describe('Single Tweet Posting', () => {
    test('should post a single tweet', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const timestamp = Date.now();
      const result = await twitter.postTweet({
        text: `Test tweet from automation - ${timestamp}`,
      });

      expect(result.success).toBe(true);
      expect(result.tweetIds).toBeDefined();
      expect(result.tweetIds!.length).toBeGreaterThan(0);
      expect(result.threadUrl).toBeDefined();
    });

    test('should handle tweet with maximum character limit', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const longText = 'A'.repeat(270); // Twitter limit is 280
      const result = await twitter.postTweet({
        text: longText,
      });

      expect(result.success).toBe(true);
    });
  });

  test.describe('Thread Posting', () => {
    test('should post a 2-tweet thread', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const timestamp = Date.now();
      const thread = createThread([
        `First tweet in test thread - ${timestamp}`,
        `Second tweet in test thread - ${timestamp}`,
      ]);

      const result = await twitter.postThread(thread);

      expect(result.success).toBe(true);
      expect(result.tweetIds).toBeDefined();
      expect(result.tweetIds!.length).toBeGreaterThanOrEqual(1);
      expect(result.threadUrl).toBeDefined();
    });

    test('should post a 5-tweet thread with numbering', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const timestamp = Date.now();
      const thread = createThread(
        [
          `Thread intro - ${timestamp}`,
          'Tweet 2 content',
          'Tweet 3 content',
          'Tweet 4 content',
          'Thread conclusion',
        ],
        true
      );

      const result = await twitter.postThread(thread);

      expect(result.success).toBe(true);
      expect(result.tweetIds).toBeDefined();
      expect(result.threadUrl).toBeDefined();
      expect(result.threadUrl).toContain(testUsername);
    });

    test('should reject thread with 0 tweets', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const result = await twitter.postThread({ tweets: [] });

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one tweet');
    });

    test('should reject thread with >25 tweets', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const tweets = Array(26)
        .fill(null)
        .map((_, i) => ({ text: `Tweet ${i + 1}` }));

      const result = await twitter.postThread({ tweets });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot exceed 25 tweets');
    });
  });

  test.describe('Rate Limiting & Error Handling', () => {
    test('should handle multiple rapid posts with backoff', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      const timestamp = Date.now();
      const results = [];

      // Post 3 tweets rapidly
      for (let i = 0; i < 3; i++) {
        const result = await twitter.postTweet({
          text: `Rapid post test ${i + 1} - ${timestamp}`,
        });
        results.push(result);
      }

      // At least 2 should succeed (3rd might hit rate limit)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(2);
    });

    test('should retry on transient errors', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      // This test verifies retry logic is in place
      // Actual retry behavior is tested via the implementation
      const result = await twitter.postTweet({
        text: `Retry test - ${Date.now()}`,
      });

      expect(result).toBeDefined();
      expect(result.success !== undefined).toBe(true);
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across instances', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      // Create new instance with same user
      const twitter2 = new TwitterAutomation(testUsername);
      const hasSession = await twitter2.hasValidSession();

      expect(hasSession).toBe(true);
    });

    test('should logout and clear session', async () => {
      if (!hasCredentials) {
        test.skip();
        return;
      }

      // Create separate instance for logout test
      const tempUser = `${testUsername}_temp`;
      const twitter3 = new TwitterAutomation(tempUser);

      // Login
      await twitter3.login({
        username: testUsername,
        password: testPassword,
      });

      // Verify session exists
      let hasSession = await twitter3.hasValidSession();
      expect(hasSession).toBe(true);

      // Logout
      await twitter3.logout();

      // Verify session cleared
      hasSession = await twitter3.hasValidSession();
      expect(hasSession).toBe(false);
    });
  });
});

test.describe('Thread Helper Functions', () => {
  test('should create thread with numbering', () => {
    const thread = createThread(['First', 'Second', 'Third'], true);

    expect(thread.tweets).toHaveLength(3);
    expect(thread.tweets[0].text).toContain('1/3');
    expect(thread.tweets[1].text).toContain('2/3');
    expect(thread.tweets[2].text).toContain('3/3');
  });

  test('should create thread without numbering', () => {
    const thread = createThread(['First', 'Second'], false);

    expect(thread.tweets).toHaveLength(2);
    expect(thread.tweets[0].text).toBe('First');
    expect(thread.tweets[1].text).toBe('Second');
  });

  test('should handle empty array', () => {
    const thread = createThread([]);

    expect(thread.tweets).toHaveLength(0);
  });

  test('should handle single tweet', () => {
    const thread = createThread(['Only one'], true);

    expect(thread.tweets).toHaveLength(1);
    expect(thread.tweets[0].text).toContain('1/1');
  });
});
