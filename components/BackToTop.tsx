"use client";
import { useEffect, useState } from "react";
export default function BackToTop() {
const [visible, setVisible] = useState(false);
useEffect(() => {
function onScroll() {
setVisible(window.scrollY > 900);
}
window.addEventListener("scroll", onScroll);
return () => window.removeEventListener("scroll", onScroll);
}, []);
if (!visible) return null;
return (
<button
onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
aria-label="Back to top"
className="fixed bottom-5 left-5 z-40 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 flex items-center justify-center focus-ring transition-colors"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
<path d="M12 19V5M5 12l7-7 7 7" />
</svg>
</button>
);
}
