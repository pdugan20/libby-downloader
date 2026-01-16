# Improvements Over Original LibbyRip

This document outlines the key improvements and changes made to address detection issues in the original TamperMonkey implementation.

## Detection Risk Factors

The original LibbyRip had several patterns that made detection easy:

### 1. Parallel Downloads

**Original:**

```javascript
await Promise.all(getUrls().map(async function(url){
    const res = await fetch(url.url);
    const blob = await res.blob();
    // ... download
}));
```

This downloads **all chapters simultaneously**, creating:

- Sudden spike in network traffic
- Multiple concurrent connections from same IP
- Unnatural request pattern (humans read sequentially)

**New Approach:**

```typescript
for (let i = 0; i < chapters.length; i++) {
  const chapter = chapters[i];
  // Download one chapter
  await downloadChapter(chapter);
  // Wait before next (4-12 seconds by default)
  await rateLimiter.waitForNextChapter();
}
```

Downloads **one chapter at a time** with realistic delays between each.

### 2. No Rate Limiting

**Original:**

- No delays between chapters (besides network time)
- No limits on books per session
- No breaks or pauses

**New Approach:**

- Configurable delays (2-20 seconds between chapters)
- Automatic breaks every 3-5 chapters (15-90 seconds)
- Max books per hour limit (1-5 depending on mode)
- Session tracking to prevent abuse

### 3. Mechanical Timing

**Original:**

```javascript
setInterval(()=>{ /* check every 50ms */ }, 50)
```

Fixed 50ms intervals - very mechanical and detectable.

**New Approach:**

```typescript
const delay = randomDelay(minMs, maxMs);
await sleep(delay);
```

Random delays with realistic variation.

### 4. No User Behavior Simulation

**Original:**

- No mouse movements
- No scrolling
- No "reading" time
- Immediate action after page load

**New Approach:**

```typescript
// Simulate reading/thinking
await simulateReadingTime(1000, 3000);

// Move mouse randomly
await simulateMouseMovement(page);

// Occasionally scroll
if (Math.random() > 0.7) {
  await simulateScrolling(page);
}
```

## Technical Improvements

### 1. Architecture

**Original: Browser Extension**

- Runs in browser context
- Limited control over timing
- Harder to customize behavior
- UI-based configuration

**New: CLI Application**

- Full control over browser via Puppeteer
- Precise timing control
- Easy configuration via JSON/env files
- Scriptable and automatable

### 2. Session Management

**Original:**

- Uses browser's existing cookies
- No persistent session storage
- Re-login on browser restart

**New:**

```typescript
class BrowserManager {
  async saveCookies(): Promise<void> {
    const cookies = await page.cookies();
    await fs.writeFile(cookiesPath, JSON.stringify(cookies));
  }

  async loadCookies(): Promise<void> {
    const cookies = JSON.parse(await fs.readFile(cookiesPath));
    await page.setCookie(...cookies);
  }
}
```

Persistent cookie storage for session reuse.

### 3. Stealth Features

**Original:**

- Basic browser automation
- No anti-detection measures

**New:**

```typescript
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteerExtra.use(StealthPlugin());

// Plus:
// - Random user agents
// - Realistic viewport sizes
// - Custom headers
// - Webdriver property override
```

### 4. Rate Limiting System

**New Feature:**

```typescript
class RateLimiter {
  async waitForNextChapter() {
    // Random delay
    await sleepRandom(this.config.delayBetweenChapters.min,
                      this.config.delayBetweenChapters.max);

    // Check if break needed
    if (this.shouldTakeBreak()) {
      await this.takeBreak();
    }
  }

  canDownloadBook(): boolean {
    // Enforce books per hour limit
  }
}
```

### 5. Configurable Stealth Modes

**New Feature:**

```json
{
  "modes": {
    "safe": {
      "delayBetweenChapters": { "min": 8000, "max": 20000 },
      "occasionalBreak": { "enabled": true, "afterChapters": 3 },
      "maxBooksPerHour": 1
    },
    "balanced": {
      "delayBetweenChapters": { "min": 4000, "max": 12000 },
      "occasionalBreak": { "enabled": true, "afterChapters": 5 },
      "maxBooksPerHour": 2
    },
    "aggressive": {
      "delayBetweenChapters": { "min": 2000, "max": 6000 },
      "occasionalBreak": { "enabled": false },
      "maxBooksPerHour": 5
    }
  }
}
```

Users can choose their risk level.

## Comparison Table

| Feature                  | Original LibbyRip | New CLI Tool      |
| ------------------------ | ----------------- | ----------------- |
| Download Method          | Parallel          | Sequential        |
| Delay Between Chapters   | ~0-100ms          | 2-20 seconds      |
| Random Timing            | No                | Yes               |
| Automatic Breaks         | No                | Yes (configurable)|
| Mouse Simulation         | No                | Yes               |
| Scrolling Simulation     | No                | Yes               |
| Rate Limiting            | No                | Yes               |
| Books/Hour Limit         | None              | 1-5 (configurable)|
| Stealth Plugins          | No                | Yes               |
| User Agent Rotation      | No                | Yes               |
| Session Management       | Browser cookies   | Persistent storage|
| Configurable Modes       | No                | 3 modes           |
| Progress Tracking        | Visual            | CLI with logs     |

## Risk Reduction Strategies

### Strategy 1: Sequential Downloads

Human behavior: Read/listen to one chapter before moving to the next.

### Strategy 2: Variable Timing

Humans don't click every 5 seconds exactly. We vary our timing based on:

- Attention span
- Distractions
- Chapter length
- Interest level

The tool simulates this with random delays.

### Strategy 3: Natural Breaks

Humans take breaks:

- Every few chapters
- Between books
- During long sessions

The tool enforces breaks automatically.

### Strategy 4: Behavioral Patterns

Humans:

- Move their mouse
- Scroll occasionally
- Have "thinking time" between actions
- Don't download 10 books in an hour

The tool simulates all of this.

## Remaining Risks

Even with all improvements, risks remain:

1. **Download Volume**: Downloading many books quickly is still detectable
2. **Timing Patterns**: Any automated pattern can potentially be detected
3. **Session Behavior**: Downloading without "reading" first is suspicious
4. **Network Patterns**: Multiple books from same IP in short time
5. **Metadata Analysis**: Server-side logging of download patterns

**Bottom Line:** This tool **reduces** detection risk but cannot **eliminate** it.

## Recommendations

1. **Start with Safe Mode**: Test with one book first
2. **Limit Daily Downloads**: Max 2-3 books per day
3. **Vary Your Schedule**: Don't download at same time daily
4. **Mix Normal Use**: Actually use Libby normally sometimes
5. **Use Multiple Cards Carefully**: Don't download from all cards at once
6. **Monitor for Warnings**: Stop if you receive any library notifications

## Future Improvements

Potential enhancements:

- Machine learning-based timing patterns
- Adaptive rate limiting based on success
- Session replay from real user data
- Integration with actual reading sessions
- Cloud proxy rotation
- More sophisticated behavior modeling

## Conclusion

This tool represents a significant improvement in stealth and safety over the original TamperMonkey script. However, **no automated tool is 100% safe**.

Use responsibly and understand the risks.
