import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as os from 'os';
import { ensureDir } from '../utils/fs';
import { logger } from '../utils/logger';
import { SessionConfig } from '../types';

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: SessionConfig;

  constructor(config?: Partial<SessionConfig>) {
    const defaultConfig: SessionConfig = {
      cookiesPath: path.join(os.homedir(), '.libby-downloader', 'cookies.json'),
      userDataDir: path.join(os.homedir(), '.libby-downloader', 'user-data'),
      headless: false, // Use headed mode by default for better stealth
    };

    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Launch the browser with stealth configurations
   */
  async launch(): Promise<void> {
    try {
      logger.info('Launching browser with stealth mode');

      await ensureDir(path.dirname(this.config.cookiesPath));
      await ensureDir(this.config.userDataDir);

      this.browser = await puppeteerExtra.launch({
        headless: this.config.headless,
        userDataDir: this.config.userDataDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080',
          '--exclude-switches=enable-automation',
          '--disable-extensions',
          '--disable-plugins-discovery',
          '--disable-default-apps',
          '--disable-component-extensions-with-background-pages',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
      });

      this.page = await this.browser.newPage();

      // Use Puppeteer's default user agent (matches actual Chrome version)
      // This ensures consistency with browser fingerprints and headers

      // Set extra headers to look more like a real browser
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // Override webdriver property
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });

      // Load cookies if they exist
      await this.loadCookies();

      logger.success('Browser launched successfully');
    } catch (error) {
      logger.error('Failed to launch browser', error);
      throw error;
    }
  }

  /**
   * Get the current page
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }

  /**
   * Navigate to a URL
   */
  async goto(url: string): Promise<void> {
    const page = this.getPage();
    logger.debug(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  }

  /**
   * Save cookies to file
   */
  async saveCookies(): Promise<void> {
    const page = this.getPage();
    const cookies = await page.cookies();
    const fs = await import('fs/promises');
    await fs.writeFile(this.config.cookiesPath, JSON.stringify(cookies, null, 2));
    logger.debug('Cookies saved');
  }

  /**
   * Load cookies from file
   */
  async loadCookies(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const { existsSync } = await import('fs');

      if (existsSync(this.config.cookiesPath)) {
        const cookiesString = await fs.readFile(this.config.cookiesPath, 'utf-8');
        const cookies = JSON.parse(cookiesString);
        await this.page!.setCookie(...cookies);
        logger.debug('Cookies loaded');
      }
    } catch {
      logger.debug('No cookies to load or failed to load cookies');
    }
  }

  /**
   * Check if user is logged in to Libby
   */
  async isLoggedIn(): Promise<boolean> {
    const page = this.getPage();
    await page.goto('https://libbyapp.com/shelf', { waitUntil: 'networkidle2' });

    // Check if we're redirected to login or if shelf is loaded
    const url = page.url();
    return url.includes('/shelf') && !url.includes('/login');
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.saveCookies();
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('Browser closed');
    }
  }
}
