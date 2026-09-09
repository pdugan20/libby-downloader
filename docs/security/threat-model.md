# Libby Downloader threat model

## Protected assets and boundaries

Protected assets are Libby session and playback material, signed chapter URLs, audiobook
files and metadata, browser permissions, and the user's filesystem. Page scripts, BIF
objects, downloaded media, metadata files, CLI paths, and FFmpeg input are untrusted.

## Required controls

- Retain session and playback material only as long as the authorized download requires;
  never log it or copy it into fixtures, telemetry, errors, or release artifacts.
- Validate and resolve every input/output path beneath the selected book or output root;
  do not overwrite unrelated files or follow unsafe symlinks.
- Use temporary output plus atomic replacement for tagging and merges, and clean partial
  results without deleting original chapters on failure.
- Keep extension permissions minimal and preserve the isolated-world/main-world boundary.
- Test external and browser behavior with mocks and synthetic fixtures, not a real account.

Update this model when permissions, page extraction, key handling, downloads, filesystem
operations, FFmpeg invocation, or telemetry changes.
