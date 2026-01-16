import { randomDelay, sleep, formatDuration } from '../delay';

describe('delay utilities', () => {
  describe('randomDelay', () => {
    it('should return a value between min and max', () => {
      const result = randomDelay(100, 200);
      expect(result).toBeGreaterThanOrEqual(100);
      expect(result).toBeLessThanOrEqual(200);
    });

    it('should handle equal min and max', () => {
      const result = randomDelay(150, 150);
      expect(result).toBe(150);
    });

    it('should work with large ranges', () => {
      const result = randomDelay(1000, 10000);
      expect(result).toBeGreaterThanOrEqual(1000);
      expect(result).toBeLessThanOrEqual(10000);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(5000)).toBe('5s');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3665000)).toBe('1h 1m 5s');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle exact minutes', () => {
      expect(formatDuration(120000)).toBe('2m 0s');
    });

    it('should handle exact hours', () => {
      expect(formatDuration(3600000)).toBe('1h 0m 0s');
    });
  });

  describe('sleep', () => {
    it('should delay for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95); // Allow 5ms tolerance
    });

    it('should handle zero delay', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10); // Should be very quick
    });
  });
});
