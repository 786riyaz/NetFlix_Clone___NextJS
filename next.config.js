/** @type {import('next').NextConfig} */
const nextConfig = {
reactStrictMode: true,
// Video/thumbnail streaming route handlers need the Node runtime (fs, streams).
// Keeping response body streaming means files are never fully buffered in memory.
eslint: { ignoreDuringBuilds: true },
// ffmpeg-static/ffprobe-static compute their binary's path from their own
// __dirname at import time. If webpack bundles (inlines) their code into
// a server chunk, that __dirname resolves to .next/server/chunks/ instead
// of the real node_modules/ffmpeg-static folder — pointing at a binary
// that was never actually copied there, so it fails with ENOENT even
// though the real file exists. Marking them external leaves their
// require() calls to real Node.js module resolution at runtime instead,
// which resolves correctly.
experimental: {
serverComponentsExternalPackages: ["ffmpeg-static", "ffprobe-static"],
},
};
module.exports = nextConfig;