import { BrowserManager } from '../browser/manager';
import { promises as fs, existsSync } from 'fs';
import { logger } from '../utils/logger';
import { sleep } from '../utils/delay';

export class LibbyAuth {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Check if user is already logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.browserManager.isLoggedIn();
  }

  /**
   * Check if localStorage has Libby auth data (without navigating)
   */
  async hasLocalStorageAuth(): Promise<boolean> {
    const page = this.browserManager.getPage();

    const result = await page.evaluate(() => {
      // Check if localStorage has Libby authentication data
      try {
        const storage = window.localStorage;
        const allKeys = Object.keys(storage);

        // Look for the chip key which contains authentication tokens
        // When logged in, this key will have the library identity data
        const chipKey = 'dewey:chip';
        const chipData = storage.getItem(chipKey);

        if (chipData) {
          try {
            const parsed = JSON.parse(chipData);
            // Check if we have an identity (library card added)
            const hasIdentity = parsed && Object.keys(parsed).length > 0;
            return { hasAuth: hasIdentity, chipData: parsed, allKeys };
          } catch {
            return { hasAuth: false, chipData: null, allKeys };
          }
        }

        // Check if any keys indicate login (library-specific data)
        const hasLibraryData = allKeys.some(
          (key) => key.includes('spl') || key.includes('identity') || key.includes('sync')
        );

        return { hasAuth: hasLibraryData, chipData: null, allKeys };
      } catch {
        return { hasAuth: false, chipData: null, allKeys: [] };
      }
    });

    logger.debug(
      `localStorage keys (${result.allKeys.length}): ${result.allKeys.slice(0, 5).join(', ')}...`
    );
    logger.debug(`hasAuth: ${result.hasAuth}`);
    return result.hasAuth;
  }

  /**
   * Interactive login process - opens browser for user to log in manually
   */
  async login(): Promise<void> {
    try {
      logger.info('Checking login status...');

      // Navigate directly to the login page - this is where we'll check AND login
      const page = this.browserManager.getPage();
      await page.goto('https://libbyapp.com/interview/welcome#doYouHaveACard', {
        waitUntil: 'networkidle2',
      });
      await sleep(1000);

      // Check if already logged in
      const hasAuth = await this.hasLocalStorageAuth();

      if (hasAuth) {
        // Verify with full check
        const isLoggedIn = await this.isLoggedIn();
        if (isLoggedIn) {
          logger.success('Already logged in to Libby');
          await this.browserManager.saveCookies();
          return;
        }
      }

      // Not logged in - inform user
      logger.info('Not logged in.');
      logger.info('Please complete the following steps in the browser:');
      logger.info('  1. Select your library');
      logger.info('  2. Enter your library card number');
      logger.info('  3. Enter your PIN');
      logger.info('');
      logger.info('Waiting for you to complete login...');

      // Wait for user to manually log in
      await this.waitForLogin();

      logger.success('Successfully logged in to Libby');
      await this.browserManager.saveCookies();
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Login without checking if already logged in (used by CLI after headless check)
   */
  async loginWithoutCheck(): Promise<void> {
    try {
      // Navigate to login page
      const page = this.browserManager.getPage();
      await page.goto('https://libbyapp.com/interview/welcome#doYouHaveACard', {
        waitUntil: 'networkidle2',
      });

      logger.info('Waiting for you to complete login...');

      // Wait for user to manually log in
      await this.waitForLogin();

      logger.success('Successfully logged in to Libby');
      await this.browserManager.saveCookies();
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Wait for user to complete manual login
   * Checks localStorage without navigating away
   */
  private async waitForLogin(timeoutMinutes: number = 5): Promise<void> {
    const startTime = Date.now();
    const timeout = timeoutMinutes * 60 * 1000;

    while (Date.now() - startTime < timeout) {
      await sleep(2000);

      // Check localStorage without navigating
      const hasAuth = await this.hasLocalStorageAuth();

      if (hasAuth) {
        logger.debug('Login detected, verifying...');
        // Verify with full login check now that we have localStorage data
        const loggedIn = await this.isLoggedIn();
        if (loggedIn) {
          return;
        }
      }
    }

    throw new Error('Login timeout. Please try again.');
  }

  /**
   * Logout from Libby
   */
  async logout(): Promise<void> {
    try {
      logger.info('Logging out from Libby');

      await this.browserManager.goto('https://libbyapp.com/');
      await sleep(1000);

      // Try to find and click logout button
      const page = this.browserManager.getPage();

      // Look for settings/menu button
      const menuSelectors = [
        '[data-test-id="menu-button"]',
        'button[aria-label*="Menu"]',
        'button[aria-label*="Settings"]',
      ];

      for (const selector of menuSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          await sleep(1000);
          break;
        } catch {
          continue;
        }
      }

      // Look for logout button
      const logoutSelectors = [
        'button:has-text("Log Out")',
        'button:has-text("Sign Out")',
        '[data-test-id="logout"]',
      ];

      for (const selector of logoutSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          await sleep(1000);
          break;
        } catch {
          continue;
        }
      }

      // Clear cookies
      const cookiesPath = this.browserManager.getConfig().cookiesPath;

      if (existsSync(cookiesPath)) {
        await fs.unlink(cookiesPath);
      }

      logger.success('Logged out successfully');
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  }

  /**
   * Get user's library cards
   */
  async getLibraryCards(): Promise<string[]> {
    try {
      await this.browserManager.goto('https://libbyapp.com/shelf');
      await sleep(2000);

      // This would need to be implemented based on Libby's actual DOM structure
      // For now, return empty array as placeholder
      logger.warn('Library card detection not yet implemented');
      return [];
    } catch (error) {
      logger.error('Failed to get library cards', error);
      return [];
    }
  }
}
