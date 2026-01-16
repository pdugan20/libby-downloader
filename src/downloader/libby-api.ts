import { BrowserManager } from '../browser/manager';
import { LibbyBook, LibbyChapter } from '../types';
import { logger } from '../utils/logger';
import { sleep } from '../utils/delay';

interface BIFData {
  objects: {
    spool: {
      components: Array<{
        meta: {
          path: string;
          'audio-duration': number;
          '-odread-spine-position': number;
          '-odread-file-bytes': number;
          'media-type': string;
        };
        spinePosition: number;
      }>;
    };
  };
  map: {
    title: {
      main: string;
      subtitle?: string;
    };
    description?: string;
    creator: Array<{
      name: string;
      role: string;
    }>;
    spine: Array<{
      'audio-duration': number;
      'media-type': string;
      'audio-bitrate': number;
      '-odread-original-path': string;
    }>;
    nav?: {
      toc?: Array<{
        title: string;
        path: string;
      }>;
    };
  };
  // Libby's root state object - structure is proprietary and undocumented
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root: any;
}

export class LibbyAPI {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Navigate to a book's player page
   * @param bookId Format: "loanId/bookId" or just "bookId" (will try to find loan)
   */
  async openBook(bookId: string): Promise<void> {
    // Parse the ID - it should be in format "loanId/bookId"
    const parts = bookId.split('/');
    let loanId: string;
    let actualBookId: string;

    if (parts.length === 2) {
      loanId = parts[0];
      actualBookId = parts[1];
    } else {
      // If only book ID provided, we need to get the loan ID from the shelf
      throw new Error(
        'Book ID must include loan ID. Run "libby list" to get the correct ID format.'
      );
    }

    const url = `https://libbyapp.com/open/loan/${loanId}/${actualBookId}`;
    logger.info(`Opening book: ${url}`);
    await this.browserManager.goto(url);
    await sleep(8000); // Wait for page to load and BIF object to initialize
  }

  /**
   * Inject code to intercept odreadCmptParams
   */
  private async injectParamInterceptor(): Promise<void> {
    const page = this.browserManager.getPage();

    /* eslint-disable @typescript-eslint/no-explicit-any */
    await page.evaluateOnNewDocument(() => {
      // Hook JSON.parse to capture crypto parameters from Libby's internal API
      const oldParse = JSON.parse;
      (window as any).__odreadCmptParams = null;

      JSON.parse = function (...args: any[]): any {
        const ret = (oldParse as any).apply(this, args);
        if (
          typeof ret === 'object' &&
          ret['b'] !== undefined &&
          ret['b']['-odread-cmpt-params'] !== undefined
        ) {
          (window as any).__odreadCmptParams = Array.from(ret['b']['-odread-cmpt-params']);
        }
        return ret;
      };
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  /**
   * Extract book metadata from the page
   */
  async getBookMetadata(): Promise<LibbyBook | null> {
    const page = this.browserManager.getPage();

    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      // Debug: Check what's on window before waiting
      const windowCheck = await page.evaluate(() => {
        return {
          hasBIF: typeof (window as any).BIF !== 'undefined',
          windowKeys: Object.keys(window).filter((k) => k.includes('BIF') || k.includes('bif')),
        };
      });
      logger.debug(
        `Before wait - hasBIF: ${windowCheck.hasBIF}, window keys: ${windowCheck.windowKeys.join(', ')}`
      );

      // Wait for BIF object to be available (increased timeout)
      await page.waitForFunction(() => (window as any).BIF !== undefined, {
        timeout: 60000,
      });

      const metadata = await page.evaluate(() => {
        const BIF = (window as any).BIF as BIFData;
        /* eslint-enable @typescript-eslint/no-explicit-any */

        if (!BIF || !BIF.map) {
          return null;
        }

        const authors = BIF.map.creator.filter((c) => c.role === 'author').map((c) => c.name);

        const narrators = BIF.map.creator.filter((c) => c.role === 'narrator').map((c) => c.name);

        // Calculate total duration
        const totalDuration = BIF.map.spine.reduce(
          (sum, spine) => sum + spine['audio-duration'],
          0
        );

        // Get cover URL
        let coverUrl = '';
        try {
          const imageElem = BIF.root?.querySelector('image');
          if (imageElem) {
            coverUrl = imageElem.getAttribute('href') || '';
          }
        } catch (e) {
          console.error('Failed to get cover URL:', e);
        }

        return {
          title: BIF.map.title.main,
          subtitle: BIF.map.title.subtitle,
          authors,
          narrator: narrators.join(', '),
          duration: Math.round(totalDuration / 60), // Convert to minutes
          coverUrl,
          description: BIF.map.description,
        };
      });

      if (!metadata) {
        logger.error('Failed to extract book metadata');
        return null;
      }

      logger.success(`Extracted metadata for: ${metadata.title}`);
      return { ...metadata, id: '' } as LibbyBook;
    } catch (error) {
      logger.error('Failed to get book metadata', error);
      return null;
    }
  }

  /**
   * Extract chapter information and URLs
   */
  async getChapters(): Promise<LibbyChapter[]> {
    const page = this.browserManager.getPage();

    try {
      // Inject the param interceptor
      await this.injectParamInterceptor();

      /* eslint-disable @typescript-eslint/no-explicit-any */
      // Wait for both BIF and odreadCmptParams to be available
      await page.waitForFunction(
        () => (window as any).BIF !== undefined && (window as any).__odreadCmptParams !== null,
        { timeout: 30000 }
      );

      const chapters = await page.evaluate(() => {
        const BIF = (window as any).BIF as BIFData;
        const odreadCmptParams = (window as any).__odreadCmptParams as string[];
        /* eslint-enable @typescript-eslint/no-explicit-any */

        if (!BIF || !odreadCmptParams) {
          return [];
        }

        const chapters: LibbyChapter[] = [];
        let cumulativeTime = 0;

        for (const spine of BIF.objects.spool.components) {
          const url =
            location.origin + '/' + spine.meta.path + '?' + odreadCmptParams[spine.spinePosition];

          chapters.push({
            index: spine.meta['-odread-spine-position'],
            title: `Part ${spine.meta['-odread-spine-position'] + 1}`,
            url,
            duration: spine.meta['audio-duration'],
            startTime: cumulativeTime,
          });

          cumulativeTime += spine.meta['audio-duration'];
        }

        // Try to get chapter titles from TOC
        if (BIF.map.nav?.toc) {
          const spineToIndex = BIF.map.spine.map((x) => x['-odread-original-path']);

          for (const tocChapter of BIF.map.nav.toc) {
            const spinePath = tocChapter.path.split('#')[0];
            const spineIndex = spineToIndex.indexOf(spinePath);

            if (spineIndex !== -1 && chapters[spineIndex]) {
              chapters[spineIndex].title = tocChapter.title;
            }
          }
        }

        return chapters;
      });

      logger.success(`Extracted ${chapters.length} chapters`);
      return chapters;
    } catch (error) {
      logger.error('Failed to get chapters', error);
      return [];
    }
  }

  /**
   * Get list of borrowed books from shelf
   */
  async getBorrowedBooks(): Promise<LibbyBook[]> {
    try {
      // Use audiobook filter to only show audiobooks, not ebooks
      await this.browserManager.goto('https://libbyapp.com/shelf/loans/default,audiobook');
      await sleep(3000); // Give SPA more time to load

      const page = this.browserManager.getPage();

      // Wait for SPA to render
      await sleep(5000);

      const books = await page.evaluate(() => {
        const books: Array<{ id: string; title: string; authors: string[] }> = [];

        // Find return links which have the pattern: /shelf/loans/{loanId}-{bookId}/return
        const allLinks = Array.from(document.querySelectorAll('a'));
        const returnLinks = allLinks.filter(
          (a) => a.href.includes('/shelf/loans/') && a.href.includes('/return')
        );

        returnLinks.forEach((returnLink) => {
          const href = returnLink.href;
          const match = href.match(/\/shelf\/loans\/(\d+)-(\d+)\/return/);

          if (match) {
            const loanId = match[1];
            const bookId = match[2];

            // Find the title by looking for the book details link
            const titleLink = allLinks.find((a) =>
              a.href.includes(`/shelf/similar-${bookId}/page-1/${bookId}`)
            );

            let title = '';
            if (titleLink) {
              title = (titleLink.textContent || '').trim();
              title = title.replace(/Title details at library$/i, '').trim();
            }

            if (title && bookId) {
              books.push({
                id: `${loanId}/${bookId}`, // Store as "loanId/bookId"
                title,
                authors: [], // Not available in this view
              });
            }
          }
        });

        return books;
      });

      logger.success(`Found ${books.length} borrowed audiobook${books.length !== 1 ? 's' : ''}`);
      return books;
    } catch (error) {
      logger.error('Failed to get borrowed books', error);
      return [];
    }
  }

  /**
   * Download cover image
   */
  async downloadCover(coverUrl: string): Promise<Buffer | null> {
    try {
      const page = this.browserManager.getPage();
      const response = await page.goto(coverUrl);

      if (!response) {
        throw new Error('No response from cover URL');
      }

      const buffer = await response.buffer();
      logger.debug('Cover image downloaded');
      return buffer;
    } catch (error) {
      logger.error('Failed to download cover image', error);
      return null;
    }
  }
}
