import type { Page } from '@playwright/test';

import { getTwitterAuth, type TwitterCredentials } from './twitter-auth';

/**
 * Tweet content
 */
export interface Tweet {
  text: string;
  media?: string[]; // URLs to media files
}

/**
 * Thread of tweets
 */
export interface TwitterThread {
  tweets: Tweet[];
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

/**
 * Twitter automation result
 */
export interface TwitterPostResult {
  success: boolean;
  tweetIds?: string[];
  threadUrl?: string;
  error?: string;
}

/**
 * Twitter Automation Manager
 *
 * Handles posting single tweets and threads to Twitter using Playwright.
 * Includes rate limit handling, retries, and error recovery.
 *
 * @example
 * ```typescript
 * const twitter = new TwitterAutomation('username');
 * await twitter.postTweet({ text: 'Hello Twitter!' });
 * await twitter.postThread({
 *   tweets: [
 *     { text: 'Tweet 1/3' },
 *     { text: 'Tweet 2/3' },
 *     { text: 'Tweet 3/3' },
 *   ]
 * });
 * ```
 */
export class TwitterAutomation {
  private readonly userId: string;
  private readonly auth = getTwitterAuth();
  private readonly rateLimitConfig: RateLimitConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  };

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Exponential backoff delay
   */
  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(
      this.rateLimitConfig.initialDelayMs * Math.pow(2, attempt),
      this.rateLimitConfig.maxDelayMs
    );
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async retry<T>(fn: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.rateLimitConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await this.exponentialBackoff(attempt - 1);
        }
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `${operationName} failed (attempt ${attempt + 1}/${this.rateLimitConfig.maxRetries}):`,
          error instanceof Error ? error.message : error
        );

        // Don't retry on authentication errors
        if (error instanceof Error && error.message.includes('Session expired')) {
          throw error;
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.rateLimitConfig.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Wait for tweet composer to be ready
   */
  private async waitForComposer(page: Page): Promise<void> {
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', {
      state: 'visible',
      timeout: 10000,
    });
  }

  /**
   * Type text into tweet composer
   */
  private async typeIntoComposer(page: Page, text: string): Promise<void> {
    const textarea = await page.locator('[data-testid="tweetTextarea_0"]');
    await textarea.click();
    await textarea.fill(text);
  }

  /**
   * Click the tweet/post button
   */
  private async clickPostButton(page: Page): Promise<void> {
    await page.click('[data-testid="tweetButton"]');
  }

  /**
   * Wait for tweet to be posted successfully
   */
  private async waitForPostSuccess(page: Page): Promise<void> {
    // Wait for the composer to disappear (indicates success)
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', {
      state: 'hidden',
      timeout: 10000,
    });

    // Small delay to ensure tweet is fully posted
    await page.waitForTimeout(2000);
  }

  /**
   * Extract tweet ID from current page
   */
  private async extractTweetId(page: Page): Promise<string> {
    // Wait for navigation to tweet detail page
    await page.waitForTimeout(1000);

    const url = page.url();
    const match = url.match(/\/status\/(\d+)/);

    if (!match) {
      throw new Error('Could not extract tweet ID from URL');
    }

    return match[1];
  }

  /**
   * Post a single tweet
   *
   * @param tweet - Tweet content
   * @returns Result with tweet ID
   */
  async postTweet(tweet: Tweet): Promise<TwitterPostResult> {
    try {
      const page = await this.auth.getAuthenticatedPage(this.userId);

      await this.retry(async () => {
        // Navigate to Twitter home
        await page.goto('https://twitter.com/home', {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        // Wait for composer
        await this.waitForComposer(page);

        // Type tweet text
        await this.typeIntoComposer(page, tweet.text);

        // Click post button
        await this.clickPostButton(page);

        // Wait for success
        await this.waitForPostSuccess(page);
      }, 'Post tweet');

      // Navigate to user profile to get latest tweet
      await page.goto(`https://twitter.com/${this.userId}`, {
        waitUntil: 'networkidle',
      });

      // Get the first tweet (latest)
      const firstTweetLink = await page.locator('article a[href*="/status/"]').first();
      const href = await firstTweetLink.getAttribute('href');
      const tweetId = href?.match(/\/status\/(\d+)/)?.[1];

      await page.close();

      if (!tweetId) {
        return {
          success: true,
          tweetIds: [],
        };
      }

      return {
        success: true,
        tweetIds: [tweetId],
        threadUrl: `https://twitter.com/${this.userId}/status/${tweetId}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post a thread of tweets
   *
   * @param thread - Thread content with multiple tweets
   * @returns Result with all tweet IDs
   */
  async postThread(thread: TwitterThread): Promise<TwitterPostResult> {
    if (thread.tweets.length === 0) {
      return {
        success: false,
        error: 'Thread must contain at least one tweet',
      };
    }

    if (thread.tweets.length > 25) {
      return {
        success: false,
        error: 'Thread cannot exceed 25 tweets',
      };
    }

    try {
      const page = await this.auth.getAuthenticatedPage(this.userId);
      const tweetIds: string[] = [];

      // Navigate to home
      await page.goto('https://twitter.com/home', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Post first tweet
      await this.retry(async () => {
        await this.waitForComposer(page);
        await this.typeIntoComposer(page, thread.tweets[0].text);
        await this.clickPostButton(page);
        await this.waitForPostSuccess(page);
      }, 'Post first tweet in thread');

      // Navigate to profile to get first tweet ID
      await page.goto(`https://twitter.com/${this.userId}`, {
        waitUntil: 'networkidle',
      });

      const firstTweetLink = await page.locator('article a[href*="/status/"]').first();
      const firstHref = await firstTweetLink.getAttribute('href');
      const firstTweetId = firstHref?.match(/\/status\/(\d+)/)?.[1];

      if (!firstTweetId) {
        throw new Error('Could not get first tweet ID');
      }

      tweetIds.push(firstTweetId);

      // Navigate to first tweet to start replying
      await page.goto(`https://twitter.com/${this.userId}/status/${firstTweetId}`, {
        waitUntil: 'networkidle',
      });

      // Post remaining tweets as replies
      for (let i = 1; i < thread.tweets.length; i++) {
        await this.retry(
          async () => {
            // Click reply button
            const replyButton = page.locator('[data-testid="reply"]').first();
            await replyButton.click();

            // Wait for reply composer
            await page.waitForSelector('[data-testid="tweetTextarea_0"]', {
              state: 'visible',
              timeout: 5000,
            });

            // Type tweet text
            await this.typeIntoComposer(page, thread.tweets[i].text);

            // Click reply button
            await page.click('[data-testid="tweetButton"]');

            // Wait for reply to post
            await this.waitForPostSuccess(page);

            // Small delay between tweets
            await page.waitForTimeout(1000);
          },
          `Post tweet ${i + 1} in thread`
        );

        // Try to extract tweet ID (optional, may not always work)
        try {
          const latestReply = await page.locator('article a[href*="/status/"]').nth(i);
          const replyHref = await latestReply.getAttribute('href');
          const replyId = replyHref?.match(/\/status\/(\d+)/)?.[1];
          if (replyId && replyId !== firstTweetId) {
            tweetIds.push(replyId);
          }
        } catch {
          // Couldn't extract ID, continue anyway
        }
      }

      await page.close();

      return {
        success: true,
        tweetIds,
        threadUrl: `https://twitter.com/${this.userId}/status/${firstTweetId}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: TwitterCredentials): Promise<boolean> {
    return await this.auth.login(credentials);
  }

  /**
   * Check if has valid session
   */
  async hasValidSession(): Promise<boolean> {
    return await this.auth.hasValidSession(this.userId);
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.auth.logout(this.userId);
  }
}

/**
 * Helper function to create thread with automatic numbering
 *
 * @param tweets - Array of tweet texts
 * @param addNumbers - Whether to add "1/N" style numbering
 * @returns Thread object
 */
export function createThread(tweets: string[], addNumbers = true): TwitterThread {
  const total = tweets.length;

  return {
    tweets: tweets.map((text, index) => {
      const numbering = addNumbers ? `${index + 1}/${total}\n\n` : '';
      return {
        text: numbering + text,
      };
    }),
  };
}
