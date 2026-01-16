import { Page } from 'puppeteer';
import { randomDelay, sleep } from '../utils/delay';

/**
 * Simulate realistic mouse movements on a page
 */
export async function simulateMouseMovement(page: Page): Promise<void> {
  const viewport = page.viewport();
  if (!viewport) return;

  const points = generateRandomPath(
    viewport.width,
    viewport.height,
    Math.floor(Math.random() * 3) + 2 // 2-4 points
  );

  for (const point of points) {
    await page.mouse.move(point.x, point.y);
    await sleep(randomDelay(50, 200));
  }
}

/**
 * Generate a random path for mouse movement
 */
function generateRandomPath(
  width: number,
  height: number,
  numPoints: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < numPoints; i++) {
    points.push({
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
    });
  }

  return points;
}

/**
 * Simulate random scrolling behavior
 */
export async function simulateScrolling(page: Page): Promise<void> {
  const scrolls = Math.floor(Math.random() * 3) + 1; // 1-3 scrolls

  for (let i = 0; i < scrolls; i++) {
    const scrollAmount = randomDelay(100, 500);
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    await sleep(randomDelay(200, 800));
  }

  // Scroll back to top
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await sleep(randomDelay(100, 300));
}

/**
 * Simulate human-like typing with random delays
 */
export async function typeHumanLike(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await sleep(randomDelay(100, 300));

  for (const char of text) {
    await page.keyboard.type(char);
    await sleep(randomDelay(50, 150));
  }
}

/**
 * Random delay to simulate human reading/thinking time
 */
export async function simulateReadingTime(
  minMs: number = 1000,
  maxMs: number = 3000
): Promise<void> {
  await sleep(randomDelay(minMs, maxMs));
}

/**
 * Simulate hovering over an element before clicking
 */
export async function hoverAndClick(page: Page, selector: string): Promise<void> {
  await page.hover(selector);
  await sleep(randomDelay(200, 500));
  await page.click(selector);
}
