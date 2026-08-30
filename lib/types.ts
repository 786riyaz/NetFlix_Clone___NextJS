export interface VideoItem {
  id: string;
  name: string;
  relativePath: string; // path relative to VIDEO_DIR, used for grouping/search
  folder: string; // top-level folder name, '' for root
  size: number; // bytes
  mtimeMs: number;
  duration: number; // seconds, 0 if unknown
  ext: string;
  hasThumbnail: boolean;
}

export interface LibraryResponse {
  videos: VideoItem[];
  folders: string[];
  generatedAt: number;
  ffmpegAvailable: boolean;
}
