# Vault — self-hosted video library (Next.js)

A Netflix-style player for your own local video library, with an
admin-only file manager.

## Setup

```bash
npm install
cp .env.example .env   # edit if you want different credentials/paths
npm run build
npm start
```

Open `http://localhost:3000`, sign in, and (on first run) pick the
folder that holds your videos.

## Accounts

Set in `.env`:

```
GUEST_USER_NAME=Guest
GUEST_USER_PASSWORD=00000000
ADMIN_USER_NAME=Riyaz
ADMIN_USER_PASSWORD=12345678
```

- **Guest** — browse, search, and play. Same experience as before.
- **Admin (Super Admin)** — everything Guest can do, plus a **Manage**
  tab (only visible to this account) with the full library shown as a
  real folder tree, exactly as it sits on disk. From there an admin can:
  - **Rename** any file or folder
  - **Delete** any file or folder (folders delete everything inside them)
  - **Move** an item into a different folder
  - **Reorder** items up/down within the same folder
  - **Create** new folders, at any depth

  These actions touch the real files on disk. The underlying
  `/api/manage/*` routes reject any request that isn't from the admin
  session, independent of what the UI shows — the two role cookies are
  cryptographically bound together, so a guest can't gain admin access
  by editing cookies alone.

## Notes

- Sub-folders are scanned recursively at any depth (e.g.
  `Marvel/Webseries/Loki/Season 1/E1.mkv`).
- Display order for the Manage tree is stored separately
  (`.cache/tree-order.json`) and never touches your files unless you
  explicitly rename/move/delete something.
- ffmpeg/ffprobe are bundled; set `FFMPEG_PATH`/`FFPROBE_PATH` in
  `.env` to override.
