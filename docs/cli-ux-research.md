# CLI UX Research

Research conducted March 2026 for the libby-downloader CLI presentation layer.

## Approaches Evaluated

### 1. @clack/prompts (TRIED AND REJECTED)

Used by Astro, SvelteKit, Bun. Features connected guide rails, intro/outro framing, built-in spinner/select/confirm components.

**Why rejected:** Visually cluttered. Too many competing symbols (diamonds, circles, triangles) with inconsistent colors (blue, yellow, green, purple, gray all appearing in a single flow). The guide rail creates visual noise for a simple CLI tool. Not customizable — symbols are hardcoded.

### 2. Raw chalk + console.log

Plain text output with chalk for color. Prompts via node:readline.

**Pros:** Zero clutter, pipe-friendly, no dependencies.
**Cons:** No arrow-key selection (must type numbers). No spinner. Manual implementation for everything interactive.

### 3. chalk + ora + @inquirer/prompts

Modular approach: ora for spinners, @inquirer/prompts for selection, chalk for color.

**Pros:** Each library is single-purpose and lightweight. Minimal visual vocabulary (just `>`, spinner dots, checkmark). Arrow-key navigation.
**Cons:** Three separate libraries with different APIs. Column alignment still requires manual string padding. No layout engine.

### 4. Ink (React for terminals) (SELECTED)

React component model for terminal UIs. Uses Yoga (flexbox engine from React Native) for layout.

**Pros:** Flexbox solves column alignment automatically. Full control over every pixel. Component model for reuse. Used by Wrangler, Prisma, Shopify CLI. Progress bars, spinners, select inputs all available as components. In-place re-rendering (the whole screen updates, not appended lines).
**Cons:** Adds React as dependency. JSX compilation needed. Learning curve.

### 5. chalk + log-update + prompts

Lightweight middle ground with numbered selection instead of arrow keys.

**Pros:** Extremely lightweight. Zero-dep prompts library.
**Cons:** Numbered input less polished. No spinner animation. prompts library less maintained.

## Progress Bar Variants

Evaluated March 2026. Option 4 (thin block) selected.

Preview script: `node scripts/preview-progress.mjs`

| # | Style | Example | Notes |
|---|-------|---------|-------|
| 1 | Count only | `⠋ Tagging chapter-8.mp3  **8**/20` | No bar, just numbers |
| 2 | Subtle line | `⠋ ... ━━━━━━━━───────────  **8**/20` | White `━` filled, dim `─` empty |
| 3 | Dots | `⠋ ... ●●●●●●●●············  **8**/20` | White `●` filled, dim `·` empty |
| 4 | Thin block (SELECTED) | `⠋ ... ▓▓▓▓▓▓▓▓░░░░░░░░░░░░  **8**/20` | White `▓` filled, dim `░` empty |
| 5 | Percentage | `⠋ Tagging chapter-8.mp3  **40%**` | No bar, just percent |
| 6 | Spinner only | `⠋ Tagging chapter-8.mp3` | No progress indicator |
| 7 | Bracket bar | `⠋ ... [========            ] **8**/20` | Classic bracket style |

## Decision

**Ink (Approach 4)** selected because:

1. Flexbox layout solves the column alignment problem that plagued all other approaches
2. Full control over visual output — no hardcoded symbols or colors
3. Component model matches the CLI's structure (list view, select view, progress view)
4. In-place re-rendering keeps the terminal clean during long operations
5. Used in production by major CLI tools (Cloudflare Wrangler, Prisma, Shopify)
