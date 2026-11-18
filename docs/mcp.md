# Local MCP server

Requires Node.js 24.19+ (24.x), `ffprobe` from FFmpeg on PATH, and the Chrome setup below.

Run `npm run build:cli`, then configure your MCP client to launch
`node /absolute/path/to/libby-downloader/dist/mcp.js`. The server uses stdio; it
does not open a network listener or accept library credentials. The built
`libby-mcp` executable uses the same entry point after `npm link`.

## Tools

| Tool | Arguments | Result |
| --- | --- | --- |
| `list_books` | none | Local book folder names, chapter counts, tag and merge status |
| `download_loan` | `loan_url`, optional `tag`, `merge`, `force` booleans | Job ID and initial status |
| `tag_book` | `book` | Job ID and initial status |
| `merge_book` | `book`, optional `force` boolean | Job ID and initial status |
| `get_job` | `job_id` | Current phase, progress, completion, or a filtered error |

Use exact folder names returned by `list_books` for `book`. Tool arguments cannot
select arbitrary paths. Symlink book folders and media/metadata files are rejected.

For example, call `download_loan` with
`{"loan_url":"https://libbyapp.com/open/loan/123456/7890123","tag":true,"merge":true}`.
Poll `get_job` with the returned `id` every few seconds until `state` is
`completed` or `failed`. Downloads and encoding can take several minutes.
`completed` means every requested stage finished. `failed` includes its phase
and a suggested check, without forwarding raw service errors.

Only one download, tag, or merge job runs at a time in each server process. Run
one server process per download directory and avoid simultaneous CLI or manual
extension operations. The latest 50 job records live in memory. Restarting the
server loses job history and stops waiting/encoding; Chrome downloads may continue
and files already completed are preserved. An interrupted tag job may have tagged
some chapters; run it again to finish. Original chapter files remain after a merge.

## Chrome setup

Download jobs open the active loan in the user's ordinary Google Chrome, where
the Libby Downloader extension must already be installed and enabled and Libby
must be signed in. No playback is required. This server does not use headless
Chromium, export cookies, or call Libby's private account API.

The default directory is `~/Downloads/libby-downloads`. To watch a custom Chrome
download directory, pass `--data-dir /path/to/chrome-downloads/libby-downloads` in
the server's arguments. This changes where the server looks; it does not change
Chrome's download settings. Disable Chrome's per-file save dialog so the extension
can save the chapters without interaction. No server-side login is available;
expired sessions must be renewed in Chrome.

For an existing installation, follow [Upgrading](upgrading.md), then restart the
MCP connection so it loads the rebuilt server.

Download jobs replace the extension's chapter files and metadata for that title.
Merge jobs preserve an existing M4B unless `force` is explicitly true. Tag jobs
update MP3 tags through the CLI's existing atomic file writer. The selected
directory is owner-controlled; validation does not isolate it from another local
process replacing files during an operation.

## Development

`npm run dev:mcp` runs the source entry point. `npm run test:mcp` builds it and
exercises the actual stdio protocol with the official SDK client, without Libby
network requests. Unit tests mock Chrome, downloading, tagging, and merging.
