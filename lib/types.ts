export interface AudioTrackInfo {
index: number; // 0-based among audio streams only (maps to ffmpeg's 0:a:N)
codec: string | null;
language: string | null; // ISO 639-ish code from container metadata, e.g. "hin", "eng" — not always present
title: string | null; // human-readable label from container metadata, if the file has one
}
export interface SubtitleTrackInfo {
index: number; // 0-based among subtitle streams only (maps to ffmpeg's 0:s:N)
codec: string | null;
language: string | null;
title: string | null;
convertible: boolean; // text-based (SRT/ASS/etc) can become WebVTT; image-based (PGS/VobSub) can't
}
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
audioTracks: AudioTrackInfo[]; // all audio tracks found in the file, e.g. multiple languages
subtitleTracks: SubtitleTrackInfo[]; // all subtitle tracks found in the file
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