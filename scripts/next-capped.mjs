/**
 * Runs a Next command with a heap cap on the server *and* a tighter one on the
 * worker processes it forks.
 *
 * `node --max-old-space-size=N node_modules/next/dist/bin/next dev` — which is
 * what the dev script used to be — caps exactly one process: the one the flag
 * is passed to. Next forks workers of its own (its bundled jest-worker, which
 * is what evaluates `generateStaticParams`), and a forked child does not
 * inherit the parent's command-line flags. Measured on this machine, such a
 * child starts with a 2096 MB default ceiling, several can run at once, and
 * they sit on top of the dev server rather than inside its budget.
 *
 * When the machine runs out, the OS kills a child, jest-worker retries it,
 * that one dies too, and Next reports:
 *
 *     ⨯ Failed to generate static paths for /[locale]
 *     Error: Jest worker encountered 2 child process exceptions, exceeding
 *     retry limit
 *
 * which names neither memory nor the real culprit, and mentions Jest in a
 * project that has no tests.
 *
 * The two ceilings come from two mechanisms, because they have to differ:
 * command-line flags beat NODE_OPTIONS for the process that receives them, and
 * NODE_OPTIONS is what a fork inherits. So the server is given SERVER_MB on the
 * command line, and NODE_OPTIONS carries the smaller WORKER_MB down to every
 * child. Both were checked by reading v8.getHeapStatistics() in a spawned
 * process rather than assumed.
 *
 * `npm run dev:uncapped` stays as the escape hatch.
 */

import { spawn } from "node:child_process";

/** the cap the dev server has been run at since the fs cache took the machine down */
const SERVER_MB = 3072;
/** below the 2096 MB a forked worker otherwise helps itself to; they only evaluate route params */
const WORKER_MB = 1536;

const existing = process.env.NODE_OPTIONS ?? "";

const child = spawn(
  process.execPath,
  [
    `--max-old-space-size=${SERVER_MB}`,
    "node_modules/next/dist/bin/next",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      // an explicit cap already in the environment wins; this is a default, not a policy
      NODE_OPTIONS: existing.includes("max-old-space-size")
        ? existing
        : `${existing} --max-old-space-size=${WORKER_MB}`.trim(),
    },
  },
);

child.on("exit", (code, signal) => {
  // pass the child's fate on, so CI and Ctrl-C both behave
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
