"use client";
export default function DownloadButton({
videoId,
size = "sm",
}: {
videoId: string;
size?: "sm" | "md";
}) {
const dim = size === "sm" ? "w-11 h-11 sm:w-6 sm:h-6" : "w-11 h-11 sm:w-7 sm:h-7";
const iconSize = size === "sm" ? 13 : 14;
return (
<a
href={`/api/download/${videoId}`}
download
onClick={(e) => e.stopPropagation()}
title="Download"
className={`${dim} rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center focus-ring shrink-0`}
>
<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M12 3v12" />
<path d="M7 10l5 5 5-5" />
<path d="M4 19h16" />
</svg>
</a>
);
}
