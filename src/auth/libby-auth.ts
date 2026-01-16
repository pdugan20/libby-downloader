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
   * Interactive login process - opens browser for user to log in manually
   */
  async login(): Promise<void> {
    try {
      logger.info('Starting Libby login process');

      await this.browserManager.goto('https://libbyapp.com/');
      await sleep(2000);

      const isLoggedIn = await this.isLoggedIn();

      if (isLoggedIn) {
        logger.success('Already logged in to Libby');
        return;
      }

      logger.info('Please log in to Libby in the browser window');
      logger.info('This tool uses manual login to avoid detection');
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
   */
  private async waitForLogin(timeoutMinutes: number = 5): Promise<void> {
    const startTime = Date.now();
    const timeout = timeoutMinutes * 60 * 1000;

    while (Date.now() - startTime < timeout) {
      await sleep(2000);

      const loggedIn = await this.isLoggedIn();
      if (loggedIn) {
        return;
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
