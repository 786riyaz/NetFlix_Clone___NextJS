"use client";
import { useRef } from "react";
import type { VideoItem } from "@/lib/types";
import Card from "./Card";
export default function Row({
title,
videos,
onPlay,
emptyHint,
}: {
title: string;
videos: VideoItem[];
onPlay: (v: VideoItem) => void;
emptyHint?: string;
}) {
const scrollerRef = useRef<HTMLDivElement>(null);
function scrollBy(delta: number) {
scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
}
if (!videos.length && !emptyHint) return null;
return (
<section className="mb-9">
<h2 className="text-[17px] sm:text-[19px] font-semibold mb-2 px-4 sm:px-10">{title}</h2>
<div className="relative group/row">
{videos.length > 0 && (
<>
<button
aria-label="Scroll left"
onClick={() => scrollBy(-800)}
className="hidden sm:flex absolute left-0 top-0 bottom-0 z-20 w-10 items-center justify-center bg-gradient-to-r from-bg to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity focus-ring"
>
<ChevronLeft />
</button>
<button
aria-label="Scroll right"
onClick={() => scrollBy(800)}
className="hidden sm:flex absolute right-0 top-0 bottom-0 z-20 w-10 items-center justify-center bg-gradient-to-l from-bg to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity focus-ring"
>
<ChevronRight />
</button>
</>
)}
<div
ref={scrollerRef}
className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 sm:px-10 py-1 snap-x scroll-px-10"
>
{videos.length === 0 && emptyHint ? (
<div className="text-muted text-sm py-8">{emptyHint}</div>
) : (
videos.map((v) => <Card key={v.id} video={v} onPlay={onPlay} />)
)}
</div>
</div>
</section>
);
}
function ChevronLeft() {
return (
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M15 18l-6-6 6-6" />
</svg>
);
}
function ChevronRight() {
return (
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M9 18l6-6-6-6" />
</svg>
);
}