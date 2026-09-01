"use client";
import { useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import Card from "./Card";
import ListItem from "./ListItem";
const PAGE_SIZE = 24;
export default function LazyGrid({
videos,
onPlay,
mode = "grid",
}: {
videos: VideoItem[];
onPlay: (v: VideoItem) => void;
mode?: "grid" | "list";
}) {
const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
const sentinelRef = useRef<HTMLDivElement>(null);
useEffect(() => {
setVisibleCount(PAGE_SIZE);
}, [videos]);
useEffect(() => {
const el = sentinelRef.current;
if (!el) return;
const observer = new IntersectionObserver(
(entries) => {
if (entries[0].isIntersecting) {
setVisibleCount((c) => Math.min(videos.length, c + PAGE_SIZE));
}
},
{ rootMargin: "600px" }
);
observer.observe(el);
return () => observer.disconnect();
}, [videos.length]);
const visible = videos.slice(0, visibleCount);
if (!videos.length) {
return <div className="px-4 sm:px-10 py-10 text-muted text-sm">No videos match your filters.</div>;
}
return (
<div className="px-4 sm:px-10">
{mode === "list" ? (
<div className="flex flex-col gap-1">
{visible.map((v) => (
<ListItem key={v.id} video={v} onPlay={onPlay} />
))}
</div>
) : (
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
{visible.map((v) => (
<div key={v.id} className="w-full">
<Card video={v} onPlay={onPlay} layout="grid" />
</div>
))}
</div>
)}
{visibleCount < videos.length && (
<div ref={sentinelRef} className="h-16 flex items-center justify-center text-muted text-xs">
Loading more…
</div>
)}
</div>
);
}
