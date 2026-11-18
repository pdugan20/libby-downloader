# Upgrading

Use Node.js 24.19+ within 24.x and npm 11.19+ within 11.x. CLI and MCP users need
`ffprobe` from FFmpeg on their PATH; the FFmpeg encoder is bundled.

## From a checkout

In a clean checkout, run:

```bash
git switch main
git pull --ff-only
npm ci
npm run build
npm link
```

At `chrome://extensions/`, click **Reload** for Libby Downloader, then reload open
Libby audiobook tabs. Restart your MCP connection to load the rebuilt server.
`libby --version` should show the version in `package.json`.

## From a release ZIP

Download the extension ZIP from [Releases](https://github.com/pdugan20/libby-downloader/releases/latest).
Extract it into the same folder you originally loaded, replacing its extension
files. At `chrome://extensions/`, click **Reload** for Libby Downloader, then
reload open Libby audiobook tabs.

## Downloading again

Version 1.3 downloads work without starting playback. Chrome must be signed in to
Libby with the extension enabled. Disable Chrome's per-file save dialog for
unattended downloads.

New downloads use `<title> (<Libby title ID>)/` folders. Older title-only folders
remain available to the CLI; downloading the book again creates its title-ID
folder. The extension replaces that book's chapters and metadata when retried.
An existing merged M4B is preserved unless you pass `--force` when merging.

The default location is `~/Downloads/libby-downloads`. If Chrome saves downloads
elsewhere, point the CLI's `--data-dir` or the MCP server's `--data-dir` at the
`libby-downloads` folder under that location. These options do not change Chrome's
settings. See [MCP](mcp.md) for server setup and job handling.
