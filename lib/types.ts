export interface VideoItem {
id: string;
name: string;
relativePath: string; // path relative to the library folder, used for grouping/search
folder: string; // top-level folder name, '' for root
size: number; // bytes
mtimeMs: number;
duration: number; // seconds, 0 if unknown
ext: string;
hasThumbnail: boolean;
// Heuristic: true if this file (codec, variable frame rate, or bloated
// bitrate) is likely to stutter in any player, not just this app.
// Surfaced as an opt-in "Optimize" action rather than run automatically,
// since a full re-encode is expensive.
needsOptimize: boolean;
optimized: boolean; // an optimized copy exists and is being served instead of the original
}
export interface LibraryResponse {
videos: VideoItem[];
folders: string[];
generatedAt: number;
ffmpegAvailable: boolean;
videoDir: string | null; // the folder currently configured, if any
configured: boolean; // false on first run, before a folder has been chosen
superAdmin: boolean; // whether the current session can rename/delete/move/optimize
}