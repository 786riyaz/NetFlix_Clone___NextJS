"use client";
import { useMemo, useState } from "react";
import type { VideoItem } from "@/lib/types";
import Card from "./Card";
interface TreeNode {
name: string;
path: string;
folders: Map<string, TreeNode>;
videos: VideoItem[];
}
function buildTree(videos: VideoItem[]): TreeNode {
const root: TreeNode = { name: "", path: "", folders: new Map(), videos: [] };
for (const v of videos) {
const parts = v.relativePath.split("/");
parts.pop(); // filename
let node = root;
let acc = "";
for (const part of parts) {
acc = acc ? `${acc}/${part}` : part;
if (!node.folders.has(part)) {
node.folders.set(part, { name: part, path: acc, folders: new Map(), videos: [] });
}
node = node.folders.get(part)!;
}
node.videos.push(v);
}
return root;
}
function countVideos(node: TreeNode): number {
let n = node.videos.length;
for (const child of node.folders.values()) n += countVideos(child);
return n;
}
export default function FolderExplorer({
videos,
onPlay,
superAdmin = false,
onRenamed,
onDeleted,
folderPaths,
}: {
videos: VideoItem[];
onPlay: (v: VideoItem, queue: VideoItem[]) => void;
superAdmin?: boolean;
onRenamed?: (v: VideoItem) => void;
onDeleted?: (id: string) => void;
folderPaths: string[];
}) {
const tree = useMemo(() => buildTree(videos), [videos]);
const [segments, setSegments] = useState<string[]>([]);

const current = useMemo(() => {
let node = tree;
for (const seg of segments) {
const next = node.folders.get(seg);
if (!next) return node; // stale path (e.g. everything in it got deleted/moved) — fall back
node = next;
}
return node;
}, [tree, segments]);

const subfolders = useMemo(
() => Array.from(current.folders.values()).sort((a, b) => a.name.localeCompare(b.name)),
[current]
);
const filesHere = useMemo(
() => [...current.videos].sort((a, b) => a.name.localeCompare(b.name)),
[current]
);

function goTo(depth: number) {
setSegments((s) => s.slice(0, depth));
}
function enter(name: string) {
setSegments((s) => [...s, name]);
}

if (!subfolders.length && !filesHere.length && segments.length === 0) {
return <div className="px-4 sm:px-10 py-10 text-muted text-sm">No videos match your filters.</div>;
}

return (
<div className="px-4 sm:px-10">
{/* Breadcrumb */}
<nav className="flex items-center gap-1 flex-wrap text-sm mb-4" aria-label="Folder path">
<button
onClick={() => goTo(0)}
className={`px-2 py-1 rounded hover:bg-white/10 focus-ring flex items-center gap-1.5 ${
segments.length === 0 ? "text-white font-medium" : "text-muted"
}`}
>
<HomeIcon />
Library
</button>
{segments.map((seg, i) => (
<span key={i} className="flex items-center gap-1">
<span className="text-muted/50">/</span>
<button
onClick={() => goTo(i + 1)}
className={`px-2 py-1 rounded hover:bg-white/10 focus-ring truncate max-w-[160px] ${
i === segments.length - 1 ? "text-white font-medium" : "text-muted"
}`}
>
{seg}
</button>
</span>
))}
</nav>

{subfolders.length === 0 && filesHere.length === 0 && (
<div className="py-10 text-muted text-sm">This folder is empty.</div>
)}

{subfolders.length > 0 && (
<div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
{subfolders.map((f) => (
<div
key={f.path}
role="button"
tabIndex={0}
onClick={() => enter(f.name)}
onKeyDown={(e) => {
if (e.key === "Enter" || e.key === " ") {
e.preventDefault();
enter(f.name);
}
}}
className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg bg-card hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer focus-ring text-center"
title={f.name}
>
<FolderIcon />
<div className="w-full">
<div className="text-[13px] font-medium truncate">{f.name}</div>
<div className="text-[11px] text-muted">{countVideos(f)} video{countVideos(f) === 1 ? "" : "s"}</div>
</div>
</div>
))}
</div>
)}

{filesHere.length > 0 && (
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
{filesHere.map((v) => (
<Card
key={v.id}
video={v}
onPlay={(video) => onPlay(video, filesHere)}
layout="grid"
superAdmin={superAdmin}
onRenamed={onRenamed}
onDeleted={onDeleted}
folderPaths={folderPaths}
/>
))}
</div>
)}
</div>
);
}
function HomeIcon() {
return (
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
<path d="M3 11.5 12 4l9 7.5" />
<path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
</svg>
);
}
function FolderIcon() {
return (
<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" strokeWidth="1.5" className="shrink-0">
<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" fill="#e5c07b22" />
</svg>
);
}
