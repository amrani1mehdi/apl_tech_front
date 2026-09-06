import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next 16.1+ enables Turbopack's persistent filesystem cache for `next dev`
    // by default. On this project it grew to ~470 MB (a single 243 MB .sst
    // table), and Turbopack deserializes it on every startup — which exhausted
    // system memory and took the whole machine down before the server was ready.
    // Dev startup for an app this size is fast without it.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
