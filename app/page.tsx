"use client";
import { useEffect, useMemo, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { fmtDuration, fmtSize, fmtDate } from "@/lib/format";
import { getAllProgressIds, getSavedTime, isWatched } from "@/lib/progress";
import Header, { SortKey } from "@/components/Header";
import Row from "@/components/Row";
import LazyGrid from "@/components/LazyGrid";
import Player from "@/components/Player";
import FolderPicker from "@/components/FolderPicker";
export default function HomePage() {
const [videos, setVideos] = useState<VideoItem[]>([]);
const [folders, setFolders] = useState<string[]>([]);
const [loading, setLoading] = useState(true);
const [rescanning, setRescanning] = useState(false);
const [ffmpegAvailable, setFfmpegAvailable] = useState(true);
const [error, setError] = useState<string | null>(null);
const [videoDir, setVideoDirState] = useState<string | null>(null);
const [configured, setConfigured] = useState(true); // avoids a first-run flash before the initial load resolves
const [showPicker, setShowPicker] = useState(false);
const [search, setSearch] = useState("");
const [sort, setSort] = useState<SortKey>("date");
const [folder, setFolder] = useState("");
const [playing, setPlaying] = useState<VideoItem | null>(null);
const [continueIds, setContinueIds] = useState<string[]>([]);
async function load(rescan = false) {
if (rescan) setRescanning(true);
else setLoading(true);
setError(null);
try {
const res = await fetch(`/api/videos${rescan ? "?rescan=1" : ""}`);
if (!res.ok) throw new Error(`Server responded ${res.status}`);
const data = await res.json();
setVideos(data.videos);
setFolders(data.folders);
setFfmpegAvailable(data.ffmpegAvailable);
setVideoDirState(data.videoDir);
setConfigured(data.configured);
if (!data.configured) setShowPicker(true);
} catch (e: any) {
setError(e.message || "Failed to load library");
} finally {
setLoading(false);
setRescanning(false);
}
}
useEffect(() => {
load();
setContinueIds(getAllProgressIds());
}, []);
useEffect(() => {
if (!playing) setContinueIds(getAllProgressIds());
}, [playing]);
async function handleFolderSelected(path: string) {
const res = await fetch("/api/config", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ videoDir: path }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error || "Could not use that folder");
setShowPicker(false);
await load(true);
}
const filtered = useMemo(() => {
let list = videos;
if (folder) list = list.filter((v) => v.folder === folder);
if (search.trim()) {
const q = search.trim().toLowerCase();
list = list.filter(
(v) => v.name.toLowerCase().includes(q) || v.folder.toLowerCase().includes(q)
);
}
const sorted = [...list];
sorted.sort((a, b) => {
if (sort === "name") return a.name.localeCompare(b.name);
if (sort === "date") return b.mtimeMs - a.mtimeMs;
if (sort === "size") return b.size - a.size;
if (sort === "duration") return b.duration - a.duration;
return 0;
});
return sorted;
}, [videos, folder, search, sort]);
const recentlyAdded = useMemo(
() => [...videos].sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 20),
[videos]
);
const continueWatching = useMemo(() => {
return continueIds
.map((id) => videos.find((v) => v.id === id))
.filter((v): v is VideoItem => {
if (!v) return false;
if (isWatched(v.id)) return false;
const t = getSavedTime(v.id);
return t > 5;
})
.slice(0, 20);
}, [continueIds, videos]);
const folderRows = useMemo(() => {
return folders
.map((f) => ({ name: f, items: videos.filter((v) => v.folder === f) }))
.filter((r) => r.items.length > 0);
}, [folders, videos]);
const hero = recentlyAdded[0];
const upNext = useMemo(() => {
if (!playing) return [];
const siblings = videos.filter((v) => v.folder === playing.folder && v.id !== playing.id);
return siblings.sort((a, b) => a.name.localeCompare(b.name));
}, [playing, videos]);
const isFiltering = search.trim().length > 0 || folder.length > 0;
return (
<main className="min-h-screen pb-16">
<Header
search={search}
onSearch={setSearch}
sort={sort}
onSort={setSort}
folder={folder}
onFolder={setFolder}
folders={folders}
onRescan={() => load(true)}
rescanning={rescanning}
onChangeFolder={() => setShowPicker(true)}
/>
{showPicker && (
<FolderPicker
initialPath={videoDir}
canCancel={configured}
onCancel={() => setShowPicker(false)}
onSelect={handleFolderSelected}
/>
)}
{loading && (
<div className="pt-32 px-10 text-muted">Indexing your library…</div>
)}
{error && (
<div className="pt-32 px-10 text-accent">
{error}. Make sure the server can read the configured folder, then hit Rescan.
</div>
)}
{!loading && !error && configured && videos.length === 0 && (
<div className="pt-32 px-4 sm:px-10 max-w-xl">
<h1 className="text-2xl font-bold mb-2">No videos found</h1>
<p className="text-muted text-sm leading-relaxed mb-4">
No video files turned up in <code className="text-white/80">{videoDir}</code> or its sub-folders.
</p>
<button
onClick={() => setShowPicker(true)}
className="text-sm px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 focus-ring"
>
Choose a different folder
</button>
</div>
)}
{!loading && !error && !configured && !showPicker && (
<div className="pt-32 px-4 sm:px-10 max-w-xl">
<h1 className="text-2xl font-bold mb-2">Welcome to Vault</h1>
<p className="text-muted text-sm leading-relaxed">
Pick the folder that holds your videos to get started. You can change it anytime
from the <span className="text-white">Folder</span> button in the header.
</p>
</div>
)}
{!loading && videos.length > 0 && (
<>
{!ffmpegAvailable && (
<div className="pt-20 px-4 sm:px-10">
<div className="text-xs text-amber-400/90 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2 inline-block">
ffmpeg not found on the server — durations and thumbnails are unavailable. Playback still works normally.
</div>
</div>
)}
{!isFiltering && hero && (
<section className="relative h-[46vh] sm:h-[62vh] w-full mb-10 overflow-hidden">
{hero.hasThumbnail ? (
// eslint-disable-next-line @next/next/no-img-element
<img
src={`/api/thumbnail/${hero.id}`}
alt=""
className="absolute inset-0 w-full h-full object-cover opacity-60"
/>
) : (
<div className="absolute inset-0 bg-gradient-to-br from-[#2a1013] to-[#0b0b0d]" />
)}
<div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
<div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/10 to-transparent" />
<div className="relative h-full flex flex-col justify-end px-4 sm:px-10 pb-10 max-w-xl">
<div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">
Recently added
</div>
<h1 className="text-3xl sm:text-5xl font-extrabold mb-3 leading-tight">{hero.name}</h1>
<div className="text-sm text-muted mb-5">
{fmtDuration(hero.duration)} • {fmtSize(hero.size)} • Added {fmtDate(hero.mtimeMs)}
{hero.folder ? ` • ${hero.folder}` : ""}
</div>
<div className="flex gap-3">
<button
onClick={() => setPlaying(hero)}
className="flex items-center gap-2 bg-white text-black font-semibold px-5 py-2.5 rounded-md hover:bg-white/85 focus-ring"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="#111">
<path d="M8 5v14l11-7z" />
</svg>
Play
</button>
</div>
</div>
</section>
)}
{!isFiltering && (
<>
<Row title="Continue Watching" videos={continueWatching} onPlay={setPlaying} emptyHint="Nothing in progress — start watching something below." />
<Row title="Recently Added" videos={recentlyAdded} onPlay={setPlaying} />
{folderRows.map((r) => (
<Row key={r.name} title={r.name} videos={r.items} onPlay={setPlaying} />
))}
</>
)}
<section>
<h2 className="text-[17px] sm:text-[19px] font-semibold mb-3 px-4 sm:px-10">
{isFiltering ? `Results (${filtered.length})` : "All Videos"}
</h2>
<LazyGrid videos={filtered} onPlay={setPlaying} />
</section>
</>
)}
{playing && (
<Player
video={playing}
upNext={upNext}
onClose={() => setPlaying(null)}
onPlayVideo={(v) => setPlaying(v)}
/>
)}
</main>
);
}