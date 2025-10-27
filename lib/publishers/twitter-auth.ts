import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { chromium, type Browser, type Page, type Cookie } from 'playwright';

/**
 * Twitter authentication credentials
 */
export interface TwitterCredentials {
  username: string;
  password: string;
}

/**
 * Encrypted session data
 */
interface EncryptedSession {
  iv: string;
  encryptedData: string;
  timestamp: number;
}

/**
 * Twitter authentication manager
 *
 * Handles Twitter login via Playwright and manages encrypted session cookies.
 *
 * @example
 * ```typescript
 * const auth = new TwitterAuth();
 * await auth.login({ username: 'user', password: 'pass' });
 * const page = await auth.getAuthenticatedPage();
 * ```
 */
export class TwitterAuth {
  private browser: Browser | null = null;
  private readonly sessionDir: string;
  private readonly encryptionKey: Buffer;

  constructor(sessionDir = '.twitter-sessions') {
    this.sessionDir = path.resolve(process.cwd(), sessionDir);
    // Use environment variable for encryption key, or generate one
    const key = process.env.TWITTER_SESSION_KEY || 'default-key-change-in-production';
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  /**
   * Initialize browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: process.env.NODE_ENV === 'production',
      });
    }
    return this.browser;
  }

  /**
   * Encrypt session cookies
   */
  private encrypt(data: string): EncryptedSession {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypt session cookies
   */
  private decrypt(session: EncryptedSession): string {
    const iv = Buffer.from(session.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);

    let decrypted = decipher.update(session.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Save encrypted session to disk
   */
  private async saveSession(userId: string, cookies: Cookie[]): Promise<void> {
    await fs.mkdir(this.sessionDir, { recursive: true });

    const sessionData = JSON.stringify(cookies);
    const encrypted = this.encrypt(sessionData);

    const sessionPath = path.join(this.sessionDir, `${userId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(encrypted, null, 2));
  }

  /**
   * Load encrypted session from disk
   */
  private async loadSession(userId: string): Promise<Cookie[] | null> {
    try {
      const sessionPath = path.join(this.sessionDir, `${userId}.json`);
      const fileContent = await fs.readFile(sessionPath, 'utf8');
      const encrypted: EncryptedSession = JSON.parse(fileContent);

      // Check if session is expired (7 days)
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - encrypted.timestamp > sevenDays) {
        await this.deleteSession(userId);
        return null;
      }

      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Delete session from disk
   */
  private async deleteSession(userId: string): Promise<void> {
    try {
      const sessionPath = path.join(this.sessionDir, `${userId}.json`);
      await fs.unlink(sessionPath);
    } catch {
      // Session doesn't exist, ignore
    }
  }

  /**
   * Login to Twitter with credentials
   *
   * @param credentials - Twitter username and password
   * @returns Success boolean
   */
  async login(credentials: TwitterCredentials): Promise<boolean> {
    const browser = await this.initBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to Twitter login
      await page.goto('https://twitter.com/login', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for username input
      await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
      await page.fill('input[autocomplete="username"]', credentials.username);

      // Click next button
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(1000);

      // Wait for password input
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.fill('input[name="password"]', credentials.password);

      // Click login button
      await page.click('button[data-testid="LoginForm_Login_Button"]');

      // Wait for successful login (home timeline)
      await page.waitForURL('https://twitter.com/home', {
        timeout: 15000,
        waitUntil: 'networkidle',
      });

      // Extract and save cookies
      const cookies = await context.cookies();
      await this.saveSession(credentials.username, cookies);

      await context.close();
      return true;
    } catch (error) {
      await context.close();
      throw new Error(
        `Twitter login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get an authenticated page with existing session
   *
   * @param userId - Twitter username/user ID
   * @returns Authenticated Playwright page
   */
  async getAuthenticatedPage(userId: string): Promise<Page> {
    const browser = await this.initBrowser();
    const cookies = await this.loadSession(userId);

    if (!cookies) {
      throw new Error('No valid session found. Please login first.');
    }

    const context = await browser.newContext();
    await context.addCookies(cookies);

    const page = await context.newPage();

    // Verify session is still valid
    await page.goto('https://twitter.com/home', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Check if redirected to login (session expired)
    if (page.url().includes('/login')) {
      await context.close();
      await this.deleteSession(userId);
      throw new Error('Session expired. Please login again.');
    }

    return page;
  }

  /**
   * Check if user has valid session
   */
  async hasValidSession(userId: string): Promise<boolean> {
    const cookies = await this.loadSession(userId);
    return cookies !== null;
  }

  /**
   * Logout and clear session
   */
  async logout(userId: string): Promise<void> {
    await this.deleteSession(userId);
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

/**
 * Singleton instance for easy access
 */
let authInstance: TwitterAuth | null = null;

/**
 * Get or create TwitterAuth singleton
 */
export function getTwitterAuth(): TwitterAuth {
  if (!authInstance) {
    authInstance = new TwitterAuth();
  }
  return authInstance;
}
