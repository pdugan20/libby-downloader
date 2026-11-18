# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0](https://github.com/pdugan20/libby-downloader/compare/v1.2.0...v1.3.0) (2026-11-18)

### Features

* Start active loan downloads with `libby download <loan-url> --tag --merge`.
* Manage downloads, tagging, and merging through the local `libby-mcp` server with progress jobs.
* Improve merge progress reporting and metadata reprocessing.

### Bug Fixes

* Restore chapter downloads after Libby's URL changes, without starting playback.
* Keep same-title books separate using title IDs, and omit signed URLs from saved metadata.
* Preserve original chapters and existing M4B files on tagging or merge failure and cancellation.
* Validate iframe message origins and update dependencies with security fixes.
* Report the installed package version consistently in the CLI and MCP server.

### Upgrading

* Source installations require Node.js 24.19+ within 24.x and npm 11.19+ within 11.x.
* CLI and MCP users need `ffprobe` from FFmpeg on their PATH; the encoder is bundled.
* See the [upgrade guide](https://github.com/pdugan20/libby-downloader/blob/v1.3.0/docs/upgrading.md) for extension reloads, MCP restarts, and download folder changes.

## [1.2.0](https://github.com/pdugan20/libby-downloader/compare/v1.1.0...v1.2.0) (2026-03-29)

### Features

* add merge progress bar with ETA and fix ESM build ([b19b00c](https://github.com/pdugan20/libby-downloader/commit/b19b00c32ded72d23c23d22cd405d8f76042fc22))

### Bug Fixes

* release workflow awk pattern to match changelog format ([a8d8f88](https://github.com/pdugan20/libby-downloader/commit/a8d8f88f04a65ff8b08d00b7f571273892f22e8b))

### Documentation

* consolidate documentation structure ([17067e4](https://github.com/pdugan20/libby-downloader/commit/17067e436919804b00f142de3230eecac2fd4a18))

## 1.1.0 (2026-03-17)

### Features

* add --data-dir option and CLI integration test framework ([f816285](https://github.com/pdugan20/libby-downloader/commit/f8162857ad1415782f8f1d15259b615bf9b4805a))
* add commitlint and clean up ESLint warnings ([5de7ae5](https://github.com/pdugan20/libby-downloader/commit/5de7ae575c7df429044f1fe8f1ae61932160401b))
* migrate CLI to @clack/prompts for modern UX ([c43063c](https://github.com/pdugan20/libby-downloader/commit/c43063c1b1d6bfe38fba9d7553e434790a8b6109))
* migrate CLI to Ink (React for terminals) ([f292ffa](https://github.com/pdugan20/libby-downloader/commit/f292ffa5072b987518ceb59149e50fd904cfc20d))

### Bug Fixes

* Content scripts cannot use ES module imports - bundle as IIFE ([4ef2590](https://github.com/pdugan20/libby-downloader/commit/4ef259033a685abadafa254e97755504345ae393))
* polish Ink UI and clean up ([20dc3d0](https://github.com/pdugan20/libby-downloader/commit/20dc3d0e223afe1d74f626f3877989b14e2812c1))
* rename validate-extension.js to .cjs for ESM compatibility ([67dc0c3](https://github.com/pdugan20/libby-downloader/commit/67dc0c3b7a65b712561c825bc6cc43caebc7cf62))
