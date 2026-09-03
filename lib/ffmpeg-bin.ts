// ffmpeg-static and ffprobe-static ship prebuilt, platform-specific ffmpeg /
// ffprobe binaries as npm packages, so Vault gets working thumbnails and
// durations out of the box without anyone having to install ffmpeg
// system-wide or fuss with PATH.
//
// IMPORTANT: each require() below uses a literal string, not a variable.
// A single `function safeRequire(name) { require(name) }` helper looks
// cleaner, but webpack can't statically analyze a require() call whose
// argument is a variable — it logs "Critical dependency: the request of
// a dependency is an expression" and, in Next.js's server bundle, can
// silently fail to include the module at all. The binary then exists on
// disk (npm installed it fine) but require() returns null at runtime
// anyway. Two separate try/catch blocks with literal require() calls
// sidestep that entirely.
let ffmpegStatic: any = null;
try {
// eslint-disable-next-line @typescript-eslint/no-var-requires
ffmpegStatic = require("ffmpeg-static");
} catch {
ffmpegStatic = null;
}
let ffprobeStatic: any = null;
try {
// eslint-disable-next-line @typescript-eslint/no-var-requires
ffprobeStatic = require("ffprobe-static");
} catch {
ffprobeStatic = null;
}
export const BUNDLED_FFMPEG_PATH: string | null =
typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic?.default ?? null;
export const BUNDLED_FFPROBE_PATH: string | null =
ffprobeStatic?.path ?? ffprobeStatic?.default?.path ?? null;
