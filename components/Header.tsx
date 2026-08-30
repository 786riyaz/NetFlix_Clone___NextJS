"use client";

import { useEffect, useState } from "react";

export type SortKey = "name" | "date" | "size" | "duration";

export default function Header({
  search,
  onSearch,
  sort,
  onSort,
  folder,
  onFolder,
  folders,
  onRescan,
  rescanning,
}: {
  search: string;
  onSearch: (v: string) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  folder: string;
  onFolder: (v: string) => void;
  folders: string[];
  onRescan: () => void;
  rescanning: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 sm:px-10 py-3.5 transition-colors duration-300 ${
        scrolled ? "bg-bg/95 backdrop-blur border-b border-white/5" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-accent font-extrabold text-xl sm:text-2xl tracking-tight">VAULT</span>
      </div>

      <div className="flex-1 flex items-center gap-2 justify-end">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          type="text"
          placeholder="Search titles or folders"
          className="w-36 sm:w-64 bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm placeholder:text-muted focus-ring outline-none"
        />

        <select
          value={folder}
          onChange={(e) => onFolder(e.target.value)}
          className="hidden sm:block bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none max-w-[140px]"
        >
          <option value="">All folders</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm focus-ring outline-none"
        >
          <option value="date">Newest</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="duration">Duration</option>
        </select>

        <button
          onClick={onRescan}
          disabled={rescanning}
          title="Rescan library for new or changed files"
          className="shrink-0 text-sm px-2.5 sm:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50 focus-ring"
        >
          {rescanning ? "Scanning…" : "Rescan"}
        </button>
      </div>
    </header>
  );
}
