/**
 * Generate a random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for a specified duration with optional jitter
 */
export async function sleep(ms: number, jitter: number = 0): Promise<void> {
  const actualDelay = jitter > 0 ? randomDelay(ms - jitter, ms + jitter) : ms;
  return new Promise((resolve) => setTimeout(resolve, actualDelay));
}

/**
 * Sleep with a random duration between min and max
 */
export async function sleepRandom(min: number, max: number): Promise<void> {
  const delay = randomDelay(min, max);
  return sleep(delay);
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
