"use client";
import { useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { fmtDuration } from "@/lib/format";
import { getSavedTime, isWatched } from "@/lib/progress";
import OptimizeBadge from "./OptimizeBadge";
import ManageControls from "./ManageControls";
export default function Card({
video,
onPlay,
layout = "row",
superManagement = false,
onRenamed,
onDeleted,
}: {
video: VideoItem;
onPlay: (v: VideoItem) => void;
layout?: "row" | "grid";
superManagement?: boolean;
onRenamed?: (v: VideoItem) => void;
onDeleted?: (id: string) => void;
}) {
const [hovering, setHovering] = useState(false);
const [previewOn, setPreviewOn] = useState(false);
const [progressPct, setProgressPct] = useState(0);
const [watched, setWatched] = useState(false);
const [imgLoaded, setImgLoaded] = useState(false);
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const videoRef = useRef<HTMLVideoElement>(null);
useEffect(() => {
const t = getSavedTime(video.id);
setProgressPct(video.duration ? Math.min(100, (t / video.duration) * 100) : 0);
setWatched(isWatched(video.id));
}, [video.id, video.duration]);
function handleEnter() {
setHovering(true);
if (!video.hasThumbnail) return;
timerRef.current = setTimeout(() => setPreviewOn(true), 350);
}
function handleLeave() {
setHovering(false);
setPreviewOn(false);
if (timerRef.current) clearTimeout(timerRef.current);
if (videoRef.current) {
videoRef.current.pause();
videoRef.current.src = "";
}
}
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
onMouseEnter={handleEnter}
onMouseLeave={handleLeave}
className={`group relative ${
layout === "row" ? "w-[42vw] xs:w-[220px] sm:w-[240px] shrink-0 snap-start" : "w-full"
} rounded-lg overflow-hidden bg-card text-left transition-all duration-200 ease-out focus-ring cursor-pointer ${
hovering ? "sm:scale-[1.06] sm:shadow-card sm:z-10" : "scale-100 z-0"
}`}
style={{ transformOrigin: "center" }}
title={video.name}
>
<div className="relative aspect-video bg-gradient-to-br from-[#232326] to-[#0e0e10] overflow-hidden">
{previewOn ? (
<video
ref={videoRef}
className="w-full h-full object-cover"
src={`/api/video/${video.id}`}
muted
autoPlay
loop
playsInline
preload="none"
/>
) : video.hasThumbnail ? (
<>
{!imgLoaded && <div className="absolute inset-0 animate-shimmer" />}
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={`/api/thumbnail/${video.id}`}
alt={video.name}
loading="lazy"
onLoad={() => setImgLoaded(true)}
className={`w-full h-full object-cover transition-opacity duration-300 ${
imgLoaded ? "opacity-100" : "opacity-0"
}`}
/>
</>
) : (
<div className="w-full h-full flex items-center justify-center text-muted">
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
<rect x="2.5" y="5" width="14" height="14" rx="2" />
<path d="M16.5 9.5 21 7v10l-4.5-2.5" />
</svg>
</div>
)}
<div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[11px] font-medium tabular-nums">
{fmtDuration(video.duration)}
</div>
{watched && (
<div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
<path d="M20 6 9 17l-5-5" />
</svg>
</div>
)}
{video.needsOptimize && (
<div className="absolute top-1.5 left-1.5">
<OptimizeBadge videoId={video.id} videoName={video.name} />
</div>
)}
{superManagement && onRenamed && onDeleted && (
<div className="absolute bottom-1.5 left-1.5">
<ManageControls video={video} onRenamed={onRenamed} onDeleted={onDeleted} />
</div>
)}
{progressPct > 1 && !watched && (
<div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
<div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
</div>
)}
<div
className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
hovering ? "opacity-100" : "opacity-0"
}`}
>
<div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
<svg width="16" height="16" viewBox="0 0 24 24" fill="#111">
<path d="M8 5v14l11-7z" />
</svg>
</div>
</div>
</div>
<div className="px-2.5 py-2">
<div className="text-[13px] font-medium truncate text-white/90">{video.name}</div>
<div className="text-[11px] text-muted truncate">{video.folder || "Library root"}</div>
</div>
</div>
);
}
