# Threat model

Codex Security reads this file as the repository's threat model. It describes how
libby-downloader works, where untrusted input enters, and the controls the code must keep.

## Scope and protected assets

libby-downloader is a Manifest V3 Chrome extension that downloads Libby audiobook
chapters and metadata, plus a local Node.js CLI that tags and merges the downloaded
files. Users load the extension unpacked; tagged releases publish a ZIP from GitHub
Actions (`README.md`, `chrome-extension/manifest.json`, `.github/workflows/release.yml`).

Protected assets are the playback access parameters Libby issues, the user's reading
history and downloaded media, files on the user's machine, and the integrity of published
releases.

## Entry points

- **Libby pages and player responses** supply book metadata, chapter paths, cover URLs,
  and playback parameters. Page scripts share the player frame's main-world globals
  (`src/iframe/extractor.ts`).
- **Window messages** reach the extractor and the progress UI in the player frame
  (`src/iframe/extractor.ts`, `src/iframe/ui-injector.ts`).
- **Extension runtime messages** ask the background worker to start downloads and report
  status (`src/background/index.ts`, `src/content/message-handler.ts`).
- **CLI arguments and local files**: folders, `--data-dir`, tag overrides, cover URLs,
  `--force`, and the JSON and media files in a book folder (`src/cli.ts`,
  `src/services/book-service.ts`).
- **Cover image servers**, and the contributors, dependencies, and tag pushes that feed
  the release build (`src/services/metadata-service.ts`, `package-lock.json`,
  `.github/workflows/release.yml`).

## Trust boundaries

- Anything from the page, the player frame, or another window is untrusted until it
  crosses into the background worker, which holds the `downloads` permission.
- Playback depends on Libby's own signed-in context; the extension adds no
  authentication of its own.
- In the CLI, book-folder contents are untrusted input to ID3 tagging and to native media
  tools that run with the user's privileges (`src/services/metadata-service.ts`,
  `src/services/merge-service.ts`).

## Sensitive data and privileged actions

Playback parameters appear in chapter URLs and must be treated as access material
wherever they are stored, logged, or passed between frames
(`src/background/metadata-writer.ts`). Privileged actions are browser downloads, file
tagging and overwrites (`--force`), outbound cover fetches, native tool invocation, and
release publication.

## Required controls

1. **Message handling.** Every window-message listener checks the sender's exact origin
   and window and validates the payload shape. Replies go to a specific target origin,
   never `*`. Requests and replies are correlated, and dynamic text is set with
   `textContent`, never `innerHTML`.
2. **Download and fetch policy.** The background worker validates every chapter URL, not
   only the first, against an allowed scheme and host. Cover fetches reject private-network
   destinations and bound size, time, and redirects; downloads and polling have deadlines.
3. **Access material.** Exported metadata and logs omit chapter query parameters, and
   debug logging stays off in shipped builds (`src/shared/constants.ts`, `AGENTS.md`).
4. **Local files and media tools.** CLI writes stay inside the selected book folder after
   resolving real paths, overwrites stay opt-in, values written into generated media formats
   are escaped, and temporary files are cleaned up. Tagging and merges should stage output
   and replace the destination atomically; failure must preserve original chapters and the
   previous destination.
5. **Releases.** Installs stay lockfile-exact and Actions stay SHA-pinned. Release builds
   run the same checks as CI, and workflow inputs such as tag names reach shell commands
   only through quoted environment variables.

## Review priorities

Review message listeners and HTML sinks first, then URL validation and fetch policy, then
where playback parameters are persisted. Test with hostile-input mocks (`AGENTS.md`), and
inspect the shipped bundle rather than only the source (`scripts/build-extension.mjs`).

## Known gaps

Atomic replacement is a required control, not an established implementation guarantee:
`MetadataService.embedToFile()` writes tags in place, and `MergeService.mergeFolder()`
unlinks an existing destination under `--force` before FFmpeg succeeds. Review failure
and cancellation recovery before relying on those paths to preserve an earlier output.

## Uncertain assumptions

- Whether Libby's playback parameters expire, can be replayed, or depend on cookies is not
  established by the code.
- Whether an outside site can frame an authenticated Libby player depends on Libby's framing
  and session policy.
- Branch and tag protections and release approvals live in GitHub settings, not in this
  repository.

## When to update this model

Update it when extension permissions, messaging, persistence, CLI file handling,
dependencies, or the release workflow change, or when Libby changes its player.
