"use client";
import { useToasts } from "@/lib/toast";
export default function ToastContainer() {
const toasts = useToasts();
if (!toasts.length) return null;
return (
<div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
{toasts.map((t) => (
<div
key={t.id}
className={`pointer-events-auto min-w-[220px] max-w-sm px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium backdrop-blur border animate-toast-in ${
t.kind === "success"
? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
: t.kind === "error"
? "bg-red-500/15 border-red-500/30 text-red-300"
: "bg-white/10 border-white/15 text-white"
}`}
>
{t.message}
</div>
))}
</div>
);
}
