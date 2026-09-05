"use client";
import { useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { pushToast } from "@/lib/toast";
import { clearProgress } from "@/lib/progress";
import ConfirmDialog from "./ConfirmDialog";
import RenameDialog from "./RenameDialog";
import MoveDialog from "./MoveDialog";
export default function VideoActionsMenu({
video,
superAdmin,
onRenamed,
onDeleted,
folderPaths = [],
}: {
video: VideoItem;
superAdmin: boolean;
onRenamed?: (v: VideoItem) => void;
onDeleted?: (id: string) => void;
folderPaths?: string[];
}) {
const [open, setOpen] = useState(false);
const [dialog, setDialog] = useState<"rename" | "move" | "delete" | null>(null);
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string>();
const menuRef = useRef<HTMLDivElement>(null);

useEffect(() => {
if (!open) return;
function onDocClick(e: MouseEvent) {
if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
}
document.addEventListener("click", onDocClick);
return () => document.removeEventListener("click", onDocClick);
}, [open]);

async function patch(body: Record<string, string>, successMsg: string) {
setBusy(true);
setError(undefined);
const res = await fetch(`/api/manage/${video.id}`, {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
});
const data = await res.json().catch(() => ({}));
setBusy(false);
if (!res.ok) {
setError(data.error || "That didn't work.");
return;
}
setDialog(null);
onRenamed?.(data.video);
pushToast(successMsg, "success");
}
async function doDelete() {
setBusy(true);
const res = await fetch(`/api/manage/${video.id}`, { method: "DELETE" });
const data = await res.json().catch(() => ({}));
setBusy(false);
if (!res.ok) {
pushToast(data.error || "Delete failed.", "error");
setDialog(null);
return;
}
clearProgress(video.id);
setDialog(null);
onDeleted?.(video.id);
pushToast(`Deleted "${video.name}".`, "success");
}

function stop(e: React.MouseEvent | React.KeyboardEvent) {
e.stopPropagation();
e.preventDefault();
}

return (
<>
<div ref={menuRef} className="relative">
{/* 44px minimum touch target — this single trigger replaces what
used to be up to four separate small icons crowded onto one
thumbnail, which was both hard to tap accurately and visually
cramped on phone-width grid cards. */}
<button
onClick={(e) => {
stop(e);
setOpen((o) => !o);
}}
onKeyDown={(e) => e.key === "Enter" || e.key === " " ? stop(e) : undefined}
title="More actions"
aria-label="More actions"
aria-expanded={open}
className="w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center focus-ring shrink-0"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
<circle cx="5" cy="12" r="2" />
<circle cx="12" cy="12" r="2" />
<circle cx="19" cy="12" r="2" />
</svg>
</button>
{open && (
<div
onClick={stop}
className="absolute z-20 top-full mt-1 left-0 w-48 rounded-lg bg-black/95 border border-white/10 py-1.5 text-sm overflow-hidden"
>
<a
href={`/api/download/${video.id}`}
download
onClick={() => setOpen(false)}
className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2 text-white/90 hover:bg-white/10"
>
<DownloadIcon /> Download
</a>
{superAdmin && (
<>
<button
onClick={() => {
setOpen(false);
setDialog("rename");
}}
className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2 text-white/90 hover:bg-white/10 text-left"
>
<RenameIcon /> Rename
</button>
<button
onClick={() => {
setOpen(false);
setDialog("move");
}}
className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2 text-white/90 hover:bg-white/10 text-left"
>
<MoveIcon /> Move
</button>
<button
onClick={() => {
setOpen(false);
setDialog("delete");
}}
className="w-full flex items-center gap-2.5 px-3.5 py-3 sm:py-2 text-red-400 hover:bg-red-900/30 text-left"
>
<DeleteIcon /> Delete
</button>
</>
)}
</div>
)}
</div>
{dialog === "rename" && (
<RenameDialog
currentName={video.name}
busy={busy}
error={error}
onSave={(name) => patch({ name }, "Renamed.")}
onCancel={() => setDialog(null)}
/>
)}
{dialog === "move" && (
<MoveDialog
currentFolder={video.relativePath.includes("/") ? video.relativePath.slice(0, video.relativePath.lastIndexOf("/")) : ""}
folderPaths={folderPaths}
busy={busy}
error={error}
onSave={(folder) => patch({ folder }, `Moved to ${folder || "the library root"}.`)}
onCancel={() => setDialog(null)}
/>
)}
{dialog === "delete" && (
<ConfirmDialog
title="Delete this video?"
message={`"${video.name}" will be permanently removed from disk. This can't be undone.`}
confirmLabel="Delete"
danger
busy={busy}
onConfirm={doDelete}
onCancel={() => setDialog(null)}
/>
)}
</>
);
}
function DownloadIcon() {
return (
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
<path d="M12 3v12" />
<path d="M7 10l5 5 5-5" />
<path d="M4 19h16" />
</svg>
);
}
function RenameIcon() {
return (
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
<path d="M12 20h9" />
<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
</svg>
);
}
function MoveIcon() {
return (
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
<path d="M9 14l3-3 3 3M12 11v6" />
</svg>
);
}
function DeleteIcon() {
return (
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
<path d="M3 6h18" />
<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
</svg>
);
}
