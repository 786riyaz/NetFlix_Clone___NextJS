# Vault — Netflix-style Local Video Library (Next.js)

A self-hosted, Netflix-style browser and player for your own video files.

## How it stays memory-efficient

- **Metadata only, indexed once.** The server walks `VIDEO_DIR` and, for each
  video, stores just its name, size, folder and duration in
  `.cache/library.json`. Re-scans skip files whose size/mtime haven't
  changed, so a huge library re-indexes in milliseconds after the first run.
- **Thumbnails are tiny cached JPEGs.** One frame is extracted per video via
  `ffmpeg` the first time it's seen, saved to `.cache/thumbnails/`, and
  served from disk afterward — the source video is never opened again just
  to show a poster.
- **No blob loading, no full-file reads.** Playback streams straight from
  disk using HTTP `Range` requests (`/api/video/[id]`), so only the chunk the
  browser is currently playing is ever read into memory — works the same
  whether the file is 20 MB or 20 GB.
- **The UI never renders the whole library at once.** The "All Videos" grid
  loads in pages of 24 as you scroll (`components/LazyGrid.tsx`), and poster
  images use native lazy-loading.

## Requirements

- Node.js 18.18+
- `ffmpeg` / `ffprobe` on the server's `PATH` (optional but recommended —
  without it, playback still works, just without durations/thumbnails).
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Windows: install from https://ffmpeg.org and add it to PATH

## Setup

```bash
npm i
cp .env.example .env
# edit .env and point VIDEO_DIR at your video folder (absolute path recommended)
npm run build
npm start
```

Then open http://localhost:3000.

For local development with hot reload, use `npm run dev` instead of
`build`/`start`.

## Configuration

Set in `.env` (see `.env.example`):

- `VIDEO_DIR` — folder to index (scanned recursively). Defaults to
  `./videos` inside the project.
- `FFMPEG_PATH` / `FFPROBE_PATH` — only needed if the binaries aren't on
  `PATH`.

Supported formats: mp4, webm, ogg/ogv, mov, mkv, avi, wmv, flv, m4v, ts.
Browser codec support still applies — mp4 (H.264/AAC) and webm are the
safest bet for in-browser playback across all browsers; some formats (e.g.
`.mkv` with certain codecs) may download/stream fine but not play natively
in every browser.

## Features

- Netflix-style rows: Continue Watching, Recently Added, one row per folder
- Hero banner for the newest addition
- Search across titles/folders, sort by name/date/size/duration, folder filter
- Full custom player: play/pause, ±10s skip, seek with buffered indicator,
  volume, mute, playback speed, fullscreen, picture-in-picture, autoplay
  next video in the same folder, keyboard shortcuts (Space/K play, ←/→ skip,
  F fullscreen, M mute, Esc close)
- Watch progress (resume position + watched marker) saved locally in the
  browser — nothing is sent to a database
- "Rescan" button to pick up new/changed files without restarting the server

## Project structure

```
app/
  api/videos/route.ts        metadata listing (with on-disk cache)
  api/video/[id]/route.ts    range-request video streaming
  api/thumbnail/[id]/route.ts cached poster image serving
  page.tsx                   main UI
components/                  Header, Row, Card, LazyGrid, Player
lib/scanner.ts                filesystem walk + ffmpeg/ffprobe + cache
lib/progress.ts                localStorage watch-progress helpers
```

## Notes

- The library cache lives in `.cache/` at the project root — delete it to
  force a full re-index (or use the in-app Rescan button for incremental
  updates).
- This app has no auth — it's meant for trusted local/LAN use. Put it
  behind your own auth/reverse proxy before exposing it publicly.
