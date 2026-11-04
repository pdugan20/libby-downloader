# Releasing

This project uses [release-it](https://github.com/release-it/release-it) with conventional commits to automate releases.

## How It Works

1. You run `npm run release` locally
2. release-it runs `check-all` (typecheck + lint + format + tests + offline release-tool checks)
3. Analyzes conventional commits to determine version bump
4. Updates `CHANGELOG.md` with categorized changes
5. Syncs version into `chrome-extension/manifest.json`
6. Commits, tags, and pushes to GitHub
7. GitHub Actions builds the extension, creates a GitHub Release with the `.zip` attached

## Commands

```bash
npm run release          # Interactive — auto-detects bump from commits
npm run release:dry      # Preview what would happen (no changes)
npm run release:patch    # Force a patch bump (1.0.0 → 1.0.1)
npm run release:minor    # Force a minor bump (1.0.0 → 1.1.0)
npm run release:major    # Force a major bump (1.0.0 → 2.0.0)
```

## Conventional Commits

Commit messages determine the version bump:

- `fix: ...` → patch (1.0.0 → 1.0.1)
- `feat: ...` → minor (1.0.0 → 1.1.0)
- `feat!: ...` or `BREAKING CHANGE:` → major (1.0.0 → 2.0.0)

Other prefixes (`docs:`, `test:`, `refactor:`, `ci:`, `build:`) appear in the changelog but don't trigger a bump on their own.

## Version Sync

A single version in `package.json` is the source of truth. The `scripts/sync-version.mjs` script copies it to `chrome-extension/manifest.json` automatically during release.

## FTP dependency safety

The release-tool proxy chain uses `get-uri@7.0.0`. Its FTP dependency is scoped to
`basic-ftp@6.2.5`, which includes the Unix listing-parser fix for
[GHSA-c475-qrg2-pj4r](https://github.com/advisories/GHSA-c475-qrg2-pj4r).
This follows the get-uri maintainer's
[dependency update](https://github.com/TooTallNate/proxy-agents/commit/84e41e433b422cbe9f073952d8e16052eb9b0251)
without upgrading release-it or unrelated consumers. The override can be removed
when the parent chain adopts a patched FTP dependency and the compatibility checks
still pass. It does not dismiss advisories or raise audit thresholds.

`npm run test:release-tool` runs in CI and `check-all`. Owned loopback FTP fixtures
exercise downloads, directory-listing fallback, cache and missing-file handling,
PAC compilation, listing limits and rejection of separate passive-transfer hosts.
A malformed listing is checked in a child process with memory and time limits.
The real release CLI also runs against a disposable local Git repository: its
dry-run preserves files, and its isolated version-bump exercise verifies changelog
and extension-version hooks with commits, tags, pushes and network access disabled.
These tests do not publish a release or use Libby accounts or media.
