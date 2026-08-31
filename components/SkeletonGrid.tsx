export default function SkeletonGrid() {
return (
<div className="pt-24 px-4 sm:px-10">
<div className="h-6 w-40 rounded bg-white/10 animate-shimmer mb-4" />
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
{Array.from({ length: 12 }).map((_, i) => (
<div key={i} className="rounded-lg overflow-hidden bg-card">
<div className="aspect-video animate-shimmer" />
<div className="px-2.5 py-2 space-y-1.5">
<div className="h-3 w-4/5 rounded bg-white/10 animate-shimmer" />
<div className="h-2.5 w-2/5 rounded bg-white/10 animate-shimmer" />
</div>
</div>
))}
</div>
</div>
);
}
