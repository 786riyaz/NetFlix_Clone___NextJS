"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { fmtDuration, fmtSize, fmtDate } from "@/lib/format";
import { getAllProgressIds, getSavedTime, isWatched, getViewMode, setViewMode, ViewMode } from "@/lib/progress";
import { pushToast } from "@/lib/toast";
import Header, { SortKey } from "@/components/Header";
import Row from "@/components/Row";
import LazyGrid from "@/components/LazyGrid";
import FolderExplorer from "@/components/FolderExplorer";
import Player from "@/components/Player";
import FolderPicker from "@/components/FolderPicker";
import SkeletonGrid from "@/components/SkeletonGrid";
import BackToTop from "@/components/BackToTop";
import ToastContainer from "@/components/ToastContainer";
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
// The ordered list the currently-playing video was launched from — lets
// the Player's Previous/Next controls navigate the same list the person
// was browsing, whatever view they were in.
const [queue, setQueue] = useState<VideoItem[]>([]);
const [continueIds, setContinueIds] = useState<string[]>([]);
const [view, setView] = useState<ViewMode>("browse");
const [superAdmin, setSuperAdmin] = useState(false);
const searchInputRef = useRef<HTMLInputElement>(null);
const isFirstLoad = useRef(true);

// Restore the last-used view mode once we're on the client (avoids an
// SSR/client mismatch since it lives in localStorage).
useEffect(() => {
setView(getViewMode());
}, []);
function changeView(v: ViewMode) {
setView(v);
setViewMode(v);
}
function handlePlay(v: VideoItem, list: VideoItem[]) {
setQueue(list);
setPlaying(v);
}

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
setSuperAdmin(!!data.superAdmin);
if (!data.configured) setShowPicker(true);
if (rescan && !isFirstLoad.current) {
pushToast(`Library rescanned — ${data.videos.length} video${data.videos.length === 1 ? "" : "s"} found.`, "success");
}
} catch (e: any) {
const msg = e.message || "Failed to load library";
setError(msg);
if (!isFirstLoad.current) pushToast(msg, "error");
} finally {
setLoading(false);
setRescanning(false);
isFirstLoad.current = false;
}
}
useEffect(() => {
load();
setContinueIds(getAllProgressIds());
}, []);
useEffect(() => {
if (!playing) setContinueIds(getAllProgressIds());
}, [playing]);

// Keyboard shortcuts: "/" focuses search (unless already typing
// somewhere), Escape closes the player/folder picker or clears an
// active search — the two things people reach for most in a library
// this size. The Player owns its own keyboard shortcuts while open.
useEffect(() => {
function onKeyDown(e: KeyboardEvent) {
const target = e.target as HTMLElement | null;
const isTyping =
target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
if (e.key === "/" && !isTyping) {
e.preventDefault();
searchInputRef.current?.focus();
} else if (e.key === "Escape") {
if (playing) return;
if (showPicker && configured) setShowPicker(false);
else if (isTyping && search) setSearch("");
}
}
window.addEventListener("keydown", onKeyDown);
return () => window.removeEventListener("keydown", onKeyDown);
}, [playing, showPicker, configured, search]);

async function handleFolderSelected(path: string) {
const res = await fetch("/api/config", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ videoDir: path }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error || "Could not use that folder");
setShowPicker(false);
pushToast("Library folder updated — indexing…", "info");
await load(true);
}
function handleRenamed(updated: VideoItem) {
setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
setQueue((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
setPlaying((prev) => (prev && prev.id === updated.id ? updated : prev));
}
function handleDeleted(id: string) {
setVideos((prev) => prev.filter((v) => v.id !== id));
setQueue((prev) => prev.filter((v) => v.id !== id));
setContinueIds((prev) => prev.filter((i) => i !== id));
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
.map((f) => ({ name: f, items: videos.filter((v) => v.folder === f).slice(0, 30) }))
.filter((r) => r.items.length > 0);
}, [folders, videos]);
// Every distinct nested folder path present in the (filtered) library —
// e.g. "Marvel/Movies/Thor" — used both by the Folders view and as
// autocomplete options in the Move dialog.
const folderPaths = useMemo(() => {
const set = new Set<string>();
for (const v of videos) {
const dir = v.relativePath.includes("/") ? v.relativePath.slice(0, v.relativePath.lastIndexOf("/")) : "";
const parts = dir.split("/").filter(Boolean);
let acc = "";
for (const p of parts) {
acc = acc ? `${acc}/${p}` : p;
set.add(acc);
}
}
return Array.from(set).sort();
}, [videos]);
const hero = recentlyAdded[0];
const isFiltering = search.trim().length > 0 || folder.length > 0;
// Browse mode keeps the Netflix-style hero + rows layout. Grid/List/Folders
// modes are for when you want to scan the whole (possibly 300+ video)
// library at once — hero and duplicate folder rows would just be noise.
const showBrowseLayout = view === "browse" && !isFiltering;
const showFolderLayout = view === "folders" && !isFiltering;
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
view={view}
onView={changeView}
searchInputRef={searchInputRef}
/>
<ToastContainer />
{showPicker && (
<FolderPicker
initialPath={videoDir}
canCancel={configured}
onCancel={() => setShowPicker(false)}
onSelect={handleFolderSelected}
/>
)}
{loading && <SkeletonGrid />}
{error && (
<div className="pt-32 px-4 sm:px-10 text-accent">
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
{showBrowseLayout && hero && (
<section className="relative h-[42vh] xs:h-[46vh] sm:h-[62vh] w-full mb-8 sm:mb-10 overflow-hidden">
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
<div className="relative h-full flex flex-col justify-end px-4 sm:px-10 pb-8 sm:pb-10 max-w-xl">
<div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">
Recently added
</div>
<h1 className="text-2xl xs:text-3xl sm:text-5xl font-extrabold mb-3 leading-tight">{hero.name}</h1>
<div className="text-xs sm:text-sm text-muted mb-4 sm:mb-5">
{fmtDuration(hero.duration)} • {fmtSize(hero.size)} • Added {fmtDate(hero.mtimeMs)}
{hero.folder ? ` • ${hero.folder}` : ""}
</div>
<div className="flex gap-3">
<button
onClick={() => handlePlay(hero, recentlyAdded)}
className="flex items-center gap-2 bg-white text-black font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-md hover:bg-white/85 focus-ring text-sm sm:text-base"
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
{showBrowseLayout && (
<>
<Row
title="Continue Watching"
videos={continueWatching}
onPlay={(v) => handlePlay(v, continueWatching)}
emptyHint="Nothing in progress — start watching something below."
superAdmin={superAdmin}
onRenamed={handleRenamed}
onDeleted={handleDeleted}
folderPaths={folderPaths}
/>
<Row
title="Recently Added"
videos={recentlyAdded}
onPlay={(v) => handlePlay(v, recentlyAdded)}
superAdmin={superAdmin}
onRenamed={handleRenamed}
onDeleted={handleDeleted}
folderPaths={folderPaths}
/>
{folderRows.map((r) => (
<Row
key={r.name}
title={r.name}
videos={r.items}
onPlay={(v) => handlePlay(v, r.items)}
superAdmin={superAdmin}
onRenamed={handleRenamed}
onDeleted={handleDeleted}
folderPaths={folderPaths}
/>
))}
</>
)}
{(view !== "browse" || isFiltering) && <div className="pt-24" />}
{showFolderLayout ? (
<FolderExplorer
videos={videos}
onPlay={handlePlay}
superAdmin={superAdmin}
onRenamed={handleRenamed}
onDeleted={handleDeleted}
folderPaths={folderPaths}
/>
) : (
<section>
<h2 className="text-[17px] sm:text-[19px] font-semibold mb-3 px-4 sm:px-10">
{isFiltering ? `Results (${filtered.length})` : "All Videos"}
</h2>
<LazyGrid
videos={filtered}
onPlay={(v) => handlePlay(v, filtered)}
mode={view === "list" ? "list" : "grid"}
superAdmin={superAdmin}
onRenamed={handleRenamed}
onDeleted={handleDeleted}
folderPaths={folderPaths}
/>
</section>
)}
</>
)}
{playing && (
<Player
video={playing}
queue={queue}
onClose={() => setPlaying(null)}
onPlayVideo={(v) => setPlaying(v)}
superAdmin={superAdmin}
onRenamed={handleRenamed}
onDeleted={handleDeleted}
folderPaths={folderPaths}
/>
)}
<BackToTop />
</main>
);
}
