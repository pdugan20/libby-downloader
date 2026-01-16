import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs, existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ensureDir } from '../utils/fs';
import { logger } from '../utils/logger';
import { SessionConfig } from '../types';

const execAsync = promisify(exec);

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

/**
 * Find Chrome executable path on the system
 */
async function findChromeExecutable(): Promise<string | undefined> {
  const platform = os.platform();

  if (platform === 'darwin') {
    // macOS - check common Chrome locations
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      `${os.homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ];

    for (const chromePath of possiblePaths) {
      if (existsSync(chromePath)) {
        return chromePath;
      }
    }
  } else if (platform === 'win32') {
    // Windows
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ];

    for (const chromePath of possiblePaths) {
      if (existsSync(chromePath)) {
        return chromePath;
      }
    }
  } else {
    // Linux - try which command
    try {
      const { stdout } = await execAsync('which google-chrome || which chromium');
      const chromePath = stdout.trim();
      if (chromePath && existsSync(chromePath)) {
        return chromePath;
      }
    } catch {
      // which command failed, Chrome not found
    }
  }

  return undefined;
}

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
      logger.debug('Launching browser with stealth mode');

      await ensureDir(path.dirname(this.config.cookiesPath));
      await ensureDir(this.config.userDataDir);

      // Find real Chrome installation
      const chromeExecutable = await findChromeExecutable();

      if (chromeExecutable) {
        logger.debug(`Using real Chrome: ${chromeExecutable}`);
      } else {
        logger.warn('Real Chrome not found, falling back to bundled Chromium (may be detected)');
      }

      this.browser = await puppeteerExtra.launch({
        headless: this.config.headless,
        executablePath: chromeExecutable, // Use real Chrome if found
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

      logger.debug('Browser launched successfully');
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
   * Get the session configuration
   */
  getConfig(): SessionConfig {
    return this.config;
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
   * Note: Libby primarily uses localStorage (persisted in user-data dir), not cookies
   */
  async saveCookies(): Promise<void> {
    const page = this.getPage();
    // Get cookies for all domains (not just current page)
    const client = await page.createCDPSession();
    const { cookies } = await client.send('Network.getAllCookies');
    await fs.writeFile(this.config.cookiesPath, JSON.stringify(cookies, null, 2));
    if (cookies.length > 0) {
      logger.debug(`Cookies saved (${cookies.length} cookies)`);
    }
  }

  /**
   * Load cookies from file
   */
  async loadCookies(): Promise<void> {
    try {
      if (existsSync(this.config.cookiesPath)) {
        const cookiesString = await fs.readFile(this.config.cookiesPath, 'utf-8');
        const cookies = JSON.parse(cookiesString);
        if (cookies.length > 0) {
          const client = await this.page!.createCDPSession();
          await client.send('Network.setCookies', { cookies });
          logger.debug(`Cookies loaded (${cookies.length} cookies)`);
        }
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
    await page.goto('https://libbyapp.com/interview/menu#mainMenu', {
      waitUntil: 'networkidle2',
    });

    // Wait for SPA to fully render content
    await this.sleep(3000);

    // Wait for page to have actual content (not just blank/loading)
    await page.waitForFunction(
      () => {
        const bodyText = document.body.innerText;
        // Wait until we see either the logged-in content or the not-logged-in message
        return (
          bodyText.includes('You have not yet added any libraries') ||
          bodyText.includes('library') ||
          bodyText.includes('Library') ||
          bodyText.length > 100 // Page has significant content
        );
      },
      { timeout: 10000 }
    );

    // Check for the "not logged in" message
    const notLoggedIn = await page.evaluate(() => {
      return document.body.innerText.includes('You have not yet added any libraries');
    });

    logger.debug(`Login check - ${notLoggedIn ? 'NOT logged in' : 'Logged in'}`);
    return !notLoggedIn;
  }

  /**
   * Sleep helper
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      logger.debug('Browser closed');
    }
  }
}
