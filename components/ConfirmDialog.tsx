"use client";
export default function ConfirmDialog({
title,
message,
confirmLabel = "Confirm",
danger = false,
busy = false,
onConfirm,
onCancel,
}: {
title: string;
message: string;
confirmLabel?: string;
danger?: boolean;
busy?: boolean;
onConfirm: () => void;
onCancel: () => void;
}) {
return (
<div
className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4"
onClick={onCancel}
>
<div
onClick={(e) => e.stopPropagation()}
className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
>
<div>
<h3 className="text-base font-semibold text-white">{title}</h3>
<p className="text-sm text-muted mt-1.5 leading-relaxed">{message}</p>
</div>
<div className="flex justify-end gap-2">
<button
onClick={onCancel}
disabled={busy}
className="px-3.5 py-2 rounded-md text-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 focus-ring"
>
Cancel
</button>
<button
onClick={onConfirm}
disabled={busy}
className={`px-3.5 py-2 rounded-md text-sm font-semibold disabled:opacity-50 focus-ring ${
danger ? "bg-red-600 hover:bg-red-700" : "bg-accent hover:opacity-90"
}`}
>
{busy ? "Working…" : confirmLabel}
</button>
</div>
</div>
</div>
);
}
