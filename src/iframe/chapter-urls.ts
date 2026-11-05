/** Signed player URLs stay in memory and are matched to the exact book path. */
export class ChapterUrls {
  private readonly urls = new Map<string, string>();

  constructor(private readonly origin: string) {}

  record(rawUrl: string): void {
    try {
      const url = new URL(rawUrl);
      if (
        url.origin !== this.origin ||
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        !url.pathname.toLowerCase().endsWith('.mp3') ||
        !this.hasParams(url)
      ) {
        return;
      }
      this.urls.set(url.pathname, url.href);
    } catch {
      // Performance entries are not guaranteed to contain HTTP URLs.
    }
  }

  resolve(path: string, param: unknown): string | undefined {
    let url: URL;
    try {
      url = new URL(path, this.origin + '/');
    } catch {
      return undefined;
    }
    if (url.origin !== this.origin || url.username || url.password) return undefined;
    const captured = this.urls.get(url.pathname);
    if (captured) return captured;
    if (typeof param !== 'string' || !param.trim()) return undefined;
    url.search = param;
    return this.hasParams(url) ? url.href : undefined;
  }

  private hasParams(url: URL): boolean {
    let valid = false;
    url.searchParams.forEach((value, key) => {
      if (key && value && value !== 'undefined' && value !== 'null') valid = true;
    });
    return valid;
  }
}

export interface PlayerPlace {
  floc: number;
  seek(): void;
}

/** Gather sequentially, stop on the first failure, and always restore position. */
export async function gatherChapterUrls(
  missingPositions: number[],
  player: { original: PlayerPlace; at: (floc: number) => PlayerPlace },
  hasUrl: (position: number) => boolean,
  sleep: (ms: number) => Promise<void>
): Promise<void> {
  const deadline = Date.now() + 120000;
  try {
    for (const position of missingPositions) {
      if (hasUrl(position)) continue;
      player.at(position + 0.01).seek();
      let found = false;
      for (let attempt = 0; attempt < 100 && Date.now() < deadline; attempt++) {
        await sleep(100);
        if (hasUrl(position)) {
          found = true;
          break;
        }
      }
      if (!found)
        throw new Error(`The player did not provide an audio URL for part ${position + 1}.`);
      await sleep(500);
    }
  } finally {
    player.original.seek();
  }
}
