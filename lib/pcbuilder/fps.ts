/**
 * Estimated in-game performance — PCB-10.
 *
 * The brief is unusually specific about why this screen exists: the framing
 * questions deliberately never ask what screen the customer owns, "de nombreux
 * clients ne la connaissent pas". So the estimate cannot be given for *a*
 * resolution. It is given for all three at once, side by side, and the
 * comparison is the teaching: a customer who has never thought about 1440p can
 * see what it costs them and what 4K costs them, on the machine they are
 * actually looking at, before they buy a screen to go with it.
 *
 * The numbers are a model, not a benchmark, and the UI says so. What the model
 * has to be is *consistent*: a better card must never estimate lower than a
 * worse one, and moving from 1080p to 4K must always cost frames. Both hold by
 * construction here, because performance is a single monotonic index and
 * resolution is a single multiplier over it.
 */

import { partsIn, type Build } from "./parts";

/* ── the games ───────────────────────────────────────────────────────────── */

/**
 * `gpuLoad` is how hard the game leans on the graphics card, on the same 0–100
 * scale the cards are indexed against — Cyberpunk at 95 is close to the
 * heaviest thing you can ask of a machine, Valorant at 10 is close to the
 * lightest.
 *
 * `cpuCap` is the frame rate the game reaches on a perf-100 processor when the
 * graphics card is not the limit. It exists because the two halves of a build
 * fail differently: a competitive shooter at low settings stops scaling the
 * moment the processor runs out, and no graphics card fixes it. Without this
 * term the model would promise 1500 fps in Valorant on a flagship card, which
 * is the kind of number that destroys trust in every other figure on the page.
 *
 * Titles are not translated. They are proper nouns, and the catalogue already
 * treats product names the same way.
 */
export type Game = {
  id: string;
  name: string;
  /**
   * The cover tile, from `public/games/`.
   *
   * Two sources, deliberately mixed. Six titles carry the publisher's own
   * mark, supplied by the shop — those are third-party trademarks and their
   * use here is the shop's call, not this file's. The rest carry tiles drawn
   * for this site by `scripts/game-art.mjs`: original geometric marks that
   * point at a genre without imitating anyone's logo.
   *
   * Declared per game rather than derived from the id, which is exactly what
   * let six of the thirteen be swapped for real artwork without touching a
   * line of rendering code. A missing file still falls back to a monogram
   * tile, the same way the catalogue's brand filter handles a brand with no
   * mark on file.
   */
  image: string;
  /**
   * How the artwork meets its tile.
   *
   * `cover` fills it and crops — right for a square mark or a piece of key art
   * with the logo in the middle. `contain` letterboxes — the only option for a
   * wide wordmark, which `cover` would crop to the middle two syllables of.
   *
   * Per title rather than one rule for all, because the artwork comes from
   * six different press kits at six different aspect ratios, and no single
   * rule survives that. Defaults to `cover`, which is what the drawn tiles
   * want since they are made at the tile's own proportion.
   */
  fit?: "cover" | "contain";
  gpuLoad: number;
  cpuCap: number;
  /** an engine-imposed ceiling, where the game has one */
  hardCap?: number;
  /** matched against free text so "je joue à warzone" finds it — PCB-01 */
  aliases: string[];
};

export const GAMES: Game[] = [
  { id: "valorant",  image: "/games/valorant.jpg",                   name: "Valorant",              gpuLoad: 10, cpuCap: 600, aliases: ["valorant", "valo", "فالورانت"] },
  { id: "cs2",       image: "/games/cs2.png",     fit: "contain",    name: "Counter-Strike 2",      gpuLoad: 14, cpuCap: 550, aliases: ["cs2", "cs go", "csgo", "counter strike", "counter-strike", "cs", "كونتر سترايك"] },
  { id: "lol",       image: "/games/lol.svg",                        name: "League of Legends",     gpuLoad: 9,  cpuCap: 550, aliases: ["league of legends", "lol", "league", "ليج", "ليق اوف ليجندز"] },
  { id: "rocket",    image: "/games/rocket.webp", fit: "contain",    name: "Rocket League",         gpuLoad: 12, cpuCap: 450, aliases: ["rocket league", "rocket"] },
  { id: "fc",        image: "/games/fc.svg",                         name: "EA Sports FC 25",       gpuLoad: 25, cpuCap: 280, aliases: ["fifa", "fc 25", "fc25", "ea fc", "ea sports fc", "فيفا"] },
  { id: "apex",      image: "/games/apex.svg",                       name: "Apex Legends",          gpuLoad: 35, cpuCap: 300, aliases: ["apex", "apex legends", "ايبكس"] },
  { id: "fortnite",  image: "/games/fortnite.png",                   name: "Fortnite",              gpuLoad: 38, cpuCap: 300, aliases: ["fortnite", "فورتنايت"] },
  { id: "pubg",      image: "/games/pubg.svg",                       name: "PUBG: Battlegrounds",   gpuLoad: 42, cpuCap: 260, aliases: ["pubg", "battlegrounds", "ببجي", "بابجي"] },
  { id: "gta5",      image: "/games/gta5.svg",                       name: "GTA V Enhanced",        gpuLoad: 45, cpuCap: 210, aliases: ["gta", "gta v", "gta 5", "grand theft auto", "جاتا", "جي تي ايه"] },
  { id: "minecraft", image: "/games/minecraft.svg",                  name: "Minecraft (shaders)",   gpuLoad: 50, cpuCap: 250, aliases: ["minecraft", "ماين كرافت"] },
  { id: "eldenring", image: "/games/eldenring.svg",                  name: "Elden Ring",            gpuLoad: 55, cpuCap: 60, hardCap: 60, aliases: ["elden ring", "elden"] },
  { id: "warzone",   image: "/games/warzone.png",                    name: "Call of Duty: Warzone", gpuLoad: 60, cpuCap: 240, aliases: ["warzone", "call of duty", "cod", "black ops", "وارزون", "كول اوف ديوتي"] },
  { id: "cyberpunk", image: "/games/cyberpunk.webp",                 name: "Cyberpunk 2077",        gpuLoad: 95, cpuCap: 165, aliases: ["cyberpunk", "cyberpunk 2077", "2077", "سايبربانك"] },
];

/**
 * The line-up the shop puts in front of customers — the dashboard's list.
 *
 * Set here rather than chosen on the page: which titles a storefront leads
 * with is a merchandising decision, not a customer preference, and a shopper
 * picking their own five can pick five esport titles and conclude every
 * machine in the catalogue is identical. The current five are two esport
 * titles almost everyone plays, two heavy ones that show what a machine can
 * take, and a battle royale in between — enough spread that the three
 * resolution columns tell a different story in each row.
 *
 * When the admin panel lands this is the value it writes. The panel has no
 * controls for adding or removing rows, so nothing in the UI needs to change.
 */
export const DEFAULT_GAMES = ["valorant", "cs2", "fortnite", "warzone", "cyberpunk"];

export function findGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

/* ── resolutions and presets ─────────────────────────────────────────────── */

export type ResKey = "fhd" | "qhd" | "uhd";

/** `cost` is the share of 1080p performance the resolution leaves you — the
    whole point of the side-by-side, expressed as one number per column. */
export const RESOLUTIONS: { key: ResKey; label: string; pixels: string; cost: number }[] = [
  { key: "fhd", label: "1080p", pixels: "1920 × 1080", cost: 1.0 },
  { key: "qhd", label: "1440p", pixels: "2560 × 1440", cost: 0.68 },
  { key: "uhd", label: "4K",    pixels: "3840 × 2160", cost: 0.38 },
];

/** Quality presets, as multipliers on how hard the game works the card.
    Named in the phrasebook under `pcb.preset.*`. */
export type PresetKey = "low" | "medium" | "high" | "ultra";

const PRESETS: { key: PresetKey; load: number }[] = [
  { key: "ultra",  load: 1.35 },
  { key: "high",   load: 1.0 },
  { key: "medium", load: 0.75 },
  { key: "low",    load: 0.55 },
];

/**
 * Scales the model onto real frame rates.
 *
 * Anchored on one case that is easy to sanity-check against published
 * benchmarks: a perf-100 card on a gpuLoad-95 game at 1080p should land near
 * 160 fps. Every other cell follows from that anchor, so re-tuning the whole
 * model is a one-number change rather than a table edit.
 */
const SCALE = 152;

/** Playability, which is what the customer is actually reading for. The bands
    are the ones that change a buying decision: 144 is a high-refresh screen
    being fed, 60 is smooth, 40 is tolerable, below that is not. */
export type Tier = "elite" | "great" | "smooth" | "playable" | "poor";

export function tierOf(fps: number): Tier {
  if (fps >= 144) return "elite";
  if (fps >= 100) return "great";
  if (fps >= 60) return "smooth";
  if (fps >= 40) return "playable";
  return "poor";
}

export type Cell = {
  res: ResKey;
  fps: number;
  /** the highest preset this configuration holds at 60 fps or better; when
      even the lowest cannot, the lowest is reported and `tier` says so */
  preset: PresetKey;
  tier: Tier;
};

export type GameEstimate = { game: Game; cells: Cell[] };

/**
 * Frames for one game at one resolution and preset.
 *
 * The processor term is deliberately sub-linear (^0.8): doubling processor
 * performance does not double frame rate in any real game, and a model that
 * says otherwise makes an expensive processor look like the upgrade when the
 * graphics card is nearly always the one that matters.
 */
function frames(gpuPerf: number, cpuPerf: number, game: Game, cost: number, presetLoad: number): number {
  const gpuBound = (SCALE * gpuPerf * cost) / (game.gpuLoad * presetLoad);
  const cpuBound = game.cpuCap * Math.pow(cpuPerf / 100, 0.8);
  const fps = Math.min(gpuBound, cpuBound);
  return Math.round(Math.min(fps, game.hardCap ?? Infinity));
}

/**
 * The estimate for one build across every requested game — PCB-10.
 *
 * Returns nothing at all unless both a processor and a graphics card are
 * chosen. A frame-rate figure for half a machine is not a conservative
 * estimate, it is a wrong one, and the panel stays shut rather than showing it.
 */
export function estimate(build: Build, gameIds: string[] = DEFAULT_GAMES): GameEstimate[] {
  const gpu = partsIn(build, "gpu")[0]?.spec;
  const cpu = partsIn(build, "cpu")[0]?.spec;
  if (!gpu?.perf || !cpu?.perf) return [];

  const games = gameIds.map(findGame).filter((g): g is Game => Boolean(g));

  return games.map((game) => {
    /* One preset for the whole row, chosen at 1080p and then held across all
       three columns.

       Picking a preset per cell was the first attempt and it quietly destroyed
       the point of the screen. The columns exist so a customer can see what a
       resolution costs them; if 1080p is measured at Ultra and 4K at Low, the
       two numbers describe different games and the comparison is meaningless —
       worse, 4K can come out *higher*, which reads as nonsense. Anchoring on
       1080p picks the highest quality the machine genuinely runs well at, and
       the columns then show the honest price of each resolution at that
       quality. A machine that collapses at 4K is supposed to look like it. */
    const chosen =
      PRESETS.find((p) => frames(gpu.perf!, cpu.perf!, game, 1, p.load) >= 60) ??
      PRESETS[PRESETS.length - 1];

    return {
      game,
      cells: RESOLUTIONS.map(({ key, cost }) => {
        const fps = frames(gpu.perf!, cpu.perf!, game, cost, chosen.load);
        return { res: key, fps, preset: chosen.key, tier: tierOf(fps) };
      }),
    };
  });
}

/** One headline figure for the instrument rail: frames in the heaviest game
    the customer named, at 1080p. Chosen over an average because an average
    across Valorant and Cyberpunk describes no experience anyone will have. */
export function headlineFps(build: Build, gameIds: string[] = DEFAULT_GAMES): number | null {
  const rows = estimate(build, gameIds);
  if (rows.length === 0) return null;
  const heaviest = rows.reduce((top, row) => (row.game.gpuLoad > top.game.gpuLoad ? row : top));
  return heaviest.cells.find((c) => c.res === "fhd")?.fps ?? null;
}
