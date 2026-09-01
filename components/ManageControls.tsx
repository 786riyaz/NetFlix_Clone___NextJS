"use client";
import { useState } from "react";
import type { VideoItem } from "@/lib/types";
import { pushToast } from "@/lib/toast";
import { clearProgress } from "@/lib/progress";
import ConfirmDialog from "./ConfirmDialog";
import RenameDialog from "./RenameDialog";
export default function ManageControls({
video,
onRenamed,
onDeleted,
size = "sm",
}: {
video: VideoItem;
onRenamed: (v: VideoItem) => void;
onDeleted: (id: string) => void;
size?: "sm" | "md";
}) {
const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string>();

async function doRename(newName: string) {
setBusy(true);
setError(undefined);
const res = await fetch(`/api/manage/${video.id}`, {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ name: newName }),
});
const data = await res.json().catch(() => ({}));
setBusy(false);
if (!res.ok) {
setError(data.error || "Rename failed.");
return;
}
setDialog(null);
onRenamed(data.video);
pushToast("Renamed.", "success");
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
onDeleted(video.id);
pushToast(`Deleted "${video.name}".`, "success");
}
const dim = size === "sm" ? "w-6 h-6" : "w-7 h-7";
const iconSize = size === "sm" ? 11 : 13;
return (
<>
<div className="flex items-center gap-1 shrink-0">
<button
onClick={(e) => {
e.stopPropagation();
e.preventDefault();
setDialog("rename");
}}
title="Rename"
className={`${dim} rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center focus-ring`}
>
<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M12 20h9" />
<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
</svg>
</button>
<button
onClick={(e) => {
e.stopPropagation();
e.preventDefault();
setDialog("delete");
}}
title="Delete"
className={`${dim} rounded-full bg-black/70 hover:bg-red-900/80 flex items-center justify-center focus-ring`}
>
<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
<path d="M3 6h18" />
<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
</svg>
</button>
</div>
{dialog === "rename" && (
<RenameDialog currentName={video.name} busy={busy} error={error} onSave={doRename} onCancel={() => setDialog(null)} />
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
