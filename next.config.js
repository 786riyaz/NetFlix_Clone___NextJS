/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Video/thumbnail streaming route handlers need the Node runtime (fs, streams).
  // Keeping response body streaming means files are never fully buffered in memory.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
