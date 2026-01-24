# CLI Progress Indicators Research

Research conducted for implementing progress indication in the audiobook merge functionality.

## Overview

When merging MP3 chapters into M4B audiobooks, users need visual feedback during the process which can take 10-15 minutes for long books. This document analyzes the best approaches for showing progress in Node.js CLI applications.

## Top Libraries Comparison

### 1. ora - Elegant Terminal Spinners

**Stats:**
- 35.5M weekly downloads
- 9,336 GitHub stars
- Actively maintained

**Best For:**
- Simple, single-task operations
- Quick async operations with status messages
- Minimal dependencies

**Features:**
- Animated spinners (dots, lines, arrows, etc.)
- Customizable text and colors
- Success/fail states
- TypeScript support

**Example:**

```typescript
import ora from 'ora';

const spinner = ora('Loading metadata...').start();
await loadMetadata();
spinner.succeed('Metadata loaded!');
```

**Pros:**
- Simple API
- Lightweight
- Great for single-task operations

**Cons:**
- Limited for multi-step processes
- No hierarchical task display
- Manual state management

**Links:**
- [npm](https://www.npmjs.com/package/ora)
- [GitHub](https://github.com/sindresorhus/ora)

---

### 2. cli-progress - Customizable Progress Bars

**Stats:**
- 4.6M weekly downloads
- 1,211 GitHub stars
- 3,488 dependent projects

**Best For:**
- Operations with known duration or percentage
- File downloads/uploads
- Batch processing with known counts

**Features:**
- Multiple simultaneous progress bars
- Customizable format and colors
- Predefined themes
- ETA calculation

**Example:**

```typescript
import cliProgress from 'cli-progress';

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
bar.start(100, 0);

// Update progress
bar.update(50);

bar.stop();
```

**Pros:**
- Visual percentage completion
- Multiple bars support
- ETA estimation

**Cons:**
- Requires knowing total duration/count
- FFmpeg percent is often inaccurate
- Less suitable for unknown-duration tasks

**FFmpeg Challenge:**

From fluent-ffmpeg documentation:
> Note that percent can be (very) inaccurate, as the only progress information fluent-ffmpeg gets from ffmpeg is the total number of frames written. To estimate percentage, fluent-ffmpeg has to guess what the total output duration will be.

**Links:**
- [npm](https://www.npmjs.com/package/cli-progress)
- [GitHub](https://github.com/npkgz/cli-progress)

---

### 3. listr2 - Interactive Task Lists

**Stats:**
- 22M weekly downloads
- 565 GitHub stars
- TypeScript native

**Best For:**
- Multi-step processes
- Complex workflows with dependencies
- Operations with preparation/execution/cleanup phases

**Features:**
- Hierarchical task trees
- Dynamic task titles
- Concurrent task execution
- Built-in error handling
- Renderer options (default, verbose, silent)
- Skip/retry logic
- Context sharing between tasks

**Example:**

```typescript
import { Listr } from 'listr2';

const tasks = new Listr([
  {
    title: 'Preparing merge',
    task: (ctx, task) => {
      return task.newListr([
        {
          title: 'Loading metadata',
          task: async (ctx) => {
            ctx.metadata = await loadMetadata();
          }
        },
        {
          title: 'Finding chapters',
          task: async (ctx) => {
            ctx.files = await findFiles();
            task.title = `Finding chapters (${ctx.files.length} found)`;
          }
        }
      ]);
    }
  },
  {
    title: 'Merging audio',
    task: (ctx, task) => {
      return new Observable((observer) => {
        ffmpeg()
          .on('progress', (p) => {
            observer.next(`Processing: ${p.timemark}`);
          })
          .on('end', () => observer.complete())
          .on('error', (err) => observer.error(err))
          .run();
      });
    }
  }
]);

await tasks.run();
```

**Output Example:**

```text
✔ Preparing merge
  ✔ Loading metadata
  ✔ Finding chapters (10 found)
  ✔ Downloading cover art
◼ Merging audio
  ↓ Processing: 00:15:32
◻ Cleaning up
```

**Pros:**
- Shows process structure clearly
- Excellent for multi-phase operations
- Professional, modern UX
- Built-in error recovery
- No percentage needed

**Cons:**
- More complex API
- Heavier dependency
- Overkill for simple spinners

**Links:**
- [npm](https://www.npmjs.com/package/listr2)
- [GitHub](https://github.com/listr2/listr2)
- [Documentation](https://listr2.kilic.dev/)

---

### 4. terminal-kit - Full Terminal UI Toolkit

**Features:**
- Progress bars
- Spinners
- 256 colors & styles
- Keyboard & mouse input
- Screen buffers
- Text input fields
- Much more...

**Best For:**
- Complex terminal UIs
- Interactive applications
- Full-featured TUIs

**Assessment:**
- Too complex for simple progress indication
- Useful for interactive terminal apps
- Overkill for merge progress

**Links:**
- [npm](https://www.npmjs.com/package/terminal-kit)
- [GitHub](https://github.com/cronvel/terminal-kit)

---

## FFmpeg Progress Tracking

### Available Progress Information

From fluent-ffmpeg, the `progress` event provides:

```typescript
{
  frames: number;      // Number of frames processed
  currentFps: number;  // Current processing speed (fps)
  currentKbps: number; // Current throughput (kbps)
  targetSize: number;  // Current output size (KB)
  timemark: string;    // Current output time (HH:MM:SS.MS)
  percent?: number;    // Estimated percentage (UNRELIABLE)
}
```

### Accuracy Issues

**percent field:**
- Estimated based on first input duration
- Inaccurate with multiple inputs
- Wrong if first input isn't the longest
- Not available when using input streams

**timemark field:**
- RELIABLE - shows actual processing time
- Format: "HH:MM:SS.MS" (e.g., "00:15:32.45")
- Best indicator for user feedback

### Specialized Libraries

**[ffmpeg-on-progress](https://www.npmjs.com/package/ffmpeg-on-progress)**
- Improves accuracy if total duration is known
- Requires pre-calculation of output duration
- Can use metadata.json to estimate total time

**[ffmpeg-progress-wrapper](https://www.npmjs.com/package/ffmpeg-progress-wrapper)**
- Alternative wrapper with detailed metrics
- More complex setup

**Assessment:**
- Not needed for our use case
- timemark is sufficient for user feedback
- Complexity not justified

---

## Decision Matrix

| Requirement | ora | cli-progress | listr2 | terminal-kit |
|-------------|-----|--------------|--------|--------------|
| Multi-step process | ❌ | ⚠️ | ✅ | ✅ |
| Unknown duration | ✅ | ❌ | ✅ | ✅ |
| Hierarchical tasks | ❌ | ❌ | ✅ | ✅ |
| Simple API | ✅ | ✅ | ⚠️ | ❌ |
| Modern UX | ✅ | ⚠️ | ✅ | ✅ |
| TypeScript support | ✅ | ✅ | ✅ | ⚠️ |
| Lightweight | ✅ | ✅ | ⚠️ | ❌ |
| Error handling | ⚠️ | ⚠️ | ✅ | ✅ |
| Popularity | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐ |

**Legend:**
- ✅ Excellent
- ⚠️ Partial/Moderate
- ❌ Poor/Not suitable

---

## Recommendation for Audiobook Merge

### Selected: **listr2**

**Rationale:**

1. **Multi-phase operation**: Merge involves distinct phases:
   - Preparation (load metadata, find files, download cover)
   - Execution (FFmpeg merge)
   - Cleanup (temp files)

2. **Unknown duration**: FFmpeg percent is unreliable, but timemark works perfectly with listr2

3. **Professional UX**: Shows clear progress structure, completed steps, current task

4. **Error visibility**: Failed steps are clearly indicated with context

5. **Future-proof**: Easy to add new steps (e.g., validation, post-processing)

### Implementation Plan

**Phase 1: Preparation**
- Load metadata.json
- Validate required fields
- Find chapter MP3 files
- Sort and verify completeness
- Download cover art (optional)

**Phase 2: Processing**
- Create temporary files (concat list, metadata file)
- Execute FFmpeg merge
- Update with timemark progress
- Monitor for errors

**Phase 3: Finalization**
- Verify output file
- Clean up temporary directory
- Report success

**Visual Output:**

```text
Merging: Book Title by Author Name

✔ Preparing audiobook
  ✔ Loading metadata
  ✔ Finding chapter files (15 found)
  ✔ Creating temporary files
  ✔ Downloading cover art
◼ Merging chapters into M4B
  ↓ Processing: 01:23:45 / 64kbps AAC
✔ Finalizing
  ✔ Verifying output
  ✔ Cleaning up temporary files

✔ Successfully created: Book-Title.m4b (234 MB)
```

---

## Alternative Approach: ora (Simpler)

If minimal complexity is preferred:

```typescript
const spinner = ora('Preparing merge...').start();

spinner.text = 'Loading metadata...';
await loadMetadata();

spinner.text = 'Finding chapters...';
const files = await findChapterFiles();
spinner.text = `Found ${files.length} chapters`;

spinner.text = 'Merging chapters (this may take 10-15 minutes)...';
await executeMerge({
  onProgress: (p) => {
    spinner.text = `Merging: ${p.timemark}`;
  }
});

spinner.succeed('Audiobook merged successfully!');
```

**Pros:**
- 3x less code
- Simpler dependency
- Still provides feedback

**Cons:**
- Less informative
- No phase structure
- Harder to debug failures

---

## Dependencies & Installation

**listr2:**

```bash
npm install listr2
```

```json
{
  "dependencies": {
    "listr2": "^8.2.5"
  }
}
```

TypeScript types are included.

**ora (alternative):**

```bash
npm install ora
```

```json
{
  "dependencies": {
    "ora": "^8.1.1"
  }
}
```

---

## References

### Documentation
- [listr2 Official Docs](https://listr2.kilic.dev/)
- [fluent-ffmpeg Progress Events](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#progress-event)
- [ora GitHub](https://github.com/sindresorhus/ora)

### Research Sources
- [npm trends comparison](https://npmtrends.com/cli-progress-vs-listr-vs-node-progress-bars-vs-ora)
- [npm-compare: Node.js CLI Progress Indicators](https://npm-compare.com/cli-progress,cli-spinners,ora,progress)
- [How to use FFmpeg in Node.js](https://creatomate.com/blog/how-to-use-ffmpeg-in-nodejs)

### Download Statistics (as of Jan 2026)
- ora: 35.5M weekly downloads
- listr2: 22M weekly downloads
- cli-progress: 4.6M weekly downloads

---

## Conclusion

For the libby-downloader merge functionality, **listr2** provides the best balance of:
- User experience (clear, hierarchical progress)
- Developer experience (structured task management)
- Error handling (built-in retry/skip logic)
- Maintainability (easy to extend with new phases)

The slightly increased complexity is justified by the significantly better UX for a long-running operation that users will interact with regularly.

**Next Steps:**
1. Install listr2
2. Refactor MergeService to use listr2 tasks
3. Update tests to handle new progress output
4. Test with real audiobooks to validate UX

---

*Research compiled: January 2026*
*For: libby-downloader audiobook merge feature*
