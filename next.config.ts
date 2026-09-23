import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next 16.1+ enables Turbopack's persistent filesystem cache for `next dev`
    // by default. On this project it grew to ~470 MB (a single 243 MB .sst
    // table), and Turbopack deserializes it on every startup — which exhausted
    // system memory and took the whole machine down before the server was ready.
    // Dev startup for an app this size is fast without it.
    turbopackFileSystemCacheForDev: false,

    // Evaluate generateStaticParams on a worker *thread* instead of a forked
    // process.
    //
    // The dev server forks a brand-new node.exe for every static-paths
    // evaluation and destroys it straight after — next-dev-server.js does it
    // with `numWorkers: 1, maxRetries: 1` and a `finally { worker.end() }`
    // commented "we don't re-use workers". So each request to /[locale],
    // /[locale]/catalogue or /[locale]/produit/[slug] asks Windows for a fresh
    // process. Once free memory is tight — Chrome sitting on 3.9 GB of the
    // 14.8 here — that spawn starts failing, the single retry fails too, and
    // the dev overlay shows:
    //
    //     Error: Jest worker encountered 2 child process exceptions,
    //     exceeding retry limit
    //
    // which names neither memory nor spawning, and mentions Jest in a project
    // with no tests. It clears on a dev-server restart, because that hands
    // back the several hundred MB the server had crept up to, and comes back
    // as the machine fills again.
    //
    // jest-worker reads this flag and swaps ChildProcessWorker for its
    // thread-based worker, so the work happens in the server process: no
    // spawn to fail, and no ~60 MB process per request. The flag is real —
    // `workerThreads: false` is the default in next/dist/server/config-shared
    // — but it is experimental and carries no page in the bundled docs, so it
    // is worth re-checking on a Next upgrade.
    workerThreads: true,
  },
};

export default nextConfig;
