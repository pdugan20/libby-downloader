# Releasing

This project uses [release-it](https://github.com/release-it/release-it) with conventional commits to automate releases.

## How It Works

1. You run `npm run release` locally
2. release-it runs `check-all` (typecheck + lint + format + tests)
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
