"use client";
import { useEffect, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { fmtDuration, fmtSize, fmtDate } from "@/lib/format";
import { getSavedTime, isWatched } from "@/lib/progress";
import OptimizeBadge from "./OptimizeBadge";
import ManageControls from "./ManageControls";
export default function ListItem({
video,
onPlay,
superAdmin = false,
onRenamed,
onDeleted,
folderPaths = [],
}: {
video: VideoItem;
onPlay: (v: VideoItem) => void;
superAdmin?: boolean;
onRenamed?: (v: VideoItem) => void;
onDeleted?: (id: string) => void;
folderPaths?: string[];
}) {
const [progressPct, setProgressPct] = useState(0);
const [watched, setWatched] = useState(false);
const [imgLoaded, setImgLoaded] = useState(false);
useEffect(() => {
const t = getSavedTime(video.id);
setProgressPct(video.duration ? Math.min(100, (t / video.duration) * 100) : 0);
setWatched(isWatched(video.id));
}, [video.id, video.duration]);
return (
<div
role="button"
tabIndex={0}
onClick={() => onPlay(video)}
onKeyDown={(e) => {
if (e.key === "Enter" || e.key === " ") {
e.preventDefault();
onPlay(video);
}
}}
className="group w-full flex items-center gap-3 px-2 sm:px-3 py-2 rounded-md hover:bg-white/5 active:bg-white/10 transition-colors text-left focus-ring cursor-pointer"
title={video.name}
>
<div className="relative w-[96px] xs:w-[120px] sm:w-[150px] aspect-video shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-[#232326] to-[#0e0e10]">
{video.hasThumbnail ? (
<>
{!imgLoaded && <div className="absolute inset-0 animate-shimmer" />}
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={`/api/thumbnail/${video.id}`}
alt=""
loading="lazy"
onLoad={() => setImgLoaded(true)}
className={`w-full h-full object-cover transition-opacity duration-300 ${
imgLoaded ? "opacity-100" : "opacity-0"
}`}
/>
</>
) : (
<div className="w-full h-full flex items-center justify-center text-muted">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
<rect x="2.5" y="5" width="14" height="14" rx="2" />
<path d="M16.5 9.5 21 7v10l-4.5-2.5" />
</svg>
</div>
)}
<div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 sm:group-hover:opacity-100 transition-opacity">
<div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
<svg width="13" height="13" viewBox="0 0 24 24" fill="#111">
<path d="M8 5v14l11-7z" />
</svg>
</div>
</div>
{progressPct > 1 && !watched && (
<div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
<div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
</div>
)}
</div>
<div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
<span className="text-[13px] sm:text-sm font-medium truncate text-white/90">{video.name}</span>
{video.needsOptimize && <OptimizeBadge videoId={video.id} videoName={video.name} />}
{watched && (
<span className="shrink-0 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
<path d="M20 6 9 17l-5-5" />
</svg>
</span>
)}
</div>
<div className="text-xs text-muted truncate mt-0.5">{video.folder || "Library root"}</div>
<div className="flex sm:hidden items-center gap-2 text-[11px] text-muted mt-1 tabular-nums">
<span>{fmtDuration(video.duration)}</span>
<span>•</span>
<span>{fmtSize(video.size)}</span>
</div>
</div>
<div className="hidden sm:flex items-center gap-4 text-xs text-muted shrink-0 tabular-nums">
<span className="w-14 text-right">{fmtDuration(video.duration)}</span>
<span className="w-16 text-right">{fmtSize(video.size)}</span>
<span className="w-20 text-right">{fmtDate(video.mtimeMs)}</span>
</div>
{superAdmin && onRenamed && onDeleted && (
<ManageControls video={video} onRenamed={onRenamed} onDeleted={onDeleted} folderPaths={folderPaths} />
)}
</div>
);
}
