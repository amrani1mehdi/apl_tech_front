/**
 * Turning a brief into a machine — PCB-05, PCB-12, and the pinned part of
 * PCB-02.
 *
 * This is the piece the AI will eventually share the job with, and the split
 * is deliberate. A language model is good at reading "j'ai 300 000 et je joue
 * à Warzone avec mes amis" and turning it into a `Brief`. It is bad at holding
 * eight interlocking physical constraints in its head and never once getting
 * one wrong. So the model's output stops at the `Brief`, and everything after
 * that — which parts, at what price, that actually fit together — happens
 * here, in code that can be read and argued with.
 *
 * The search is exhaustive over the pairs that matter. Processor and graphics
 * card are the two decisions that set what a machine is; the other six bays
 * follow from them and from what is left of the budget. So the generator tries
 * every processor against every graphics card — twenty-five combinations on
 * today's catalogue — fills the rest greedily for each, scores the result, and
 * returns them ranked. Nothing is sampled and nothing is random: the same
 * brief produces the same machine every time, which is what makes a
 * regeneration (PCB-12) a *choice* between ranked alternatives rather than a
 * dice roll the customer has to keep re-rolling.
 */

import {
  PART_KINDS,
  buildTotal,
  lines,
  partOf,
  partsIn,
  capacityIn,
  pool,
  type Build,
  type Part,
  type PartKind,
} from "./parts";
import { checkBuild, powerVerdict, totalWatts } from "./engine";

/* ── what the customer asked for ─────────────────────────────────────────── */

export type Usage = "gaming" | "streaming" | "creation" | "office";
/** PCB-04 — unité centrale seule, ou avec écran et périphériques */
export type Scope = "tower" | "screen" | "full";
export type BrandPref = "amd" | "intel" | "nvidia" | null;

export type Brief = {
  /** DA. Null until asked for — PCB-03 makes this the one question that is
      never skipped, because nothing below can be decided without it. */
  budget: number | null;
  usage: Usage | null;
  /** game ids from `fps.ts`, in the order they were mentioned */
  games: string[];
  brand: BrandPref;
  scope: Scope | null;
  /** forced into its bay and never swapped out by the generator — PCB-02 */
  pinned?: string;
};

export const emptyBrief = (): Brief => ({
  budget: null,
  usage: null,
  games: [],
  brand: null,
  scope: null,
});

/* ── what the build is judged on ─────────────────────────────────────────── */

/**
 * How much the graphics card matters against the processor, per use.
 *
 * Gaming is the lopsided one and it is the reason these weights exist at all:
 * spending evenly across both is the classic first-build mistake, and a
 * generator that optimises a flat sum of performance makes exactly that
 * mistake with the customer's money. Creation flips it — timeline scrubbing
 * and exports scale with cores — and office barely cares about either, so
 * there the score is nearly flat and price does the deciding.
 */
const WEIGHTS: Record<Usage, { gpu: number; cpu: number; ramGb: number; ssdGb: number }> = {
  gaming:    { gpu: 0.75, cpu: 0.25, ramGb: 16, ssdGb: 1000 },
  streaming: { gpu: 0.6,  cpu: 0.4,  ramGb: 32, ssdGb: 1000 },
  creation:  { gpu: 0.45, cpu: 0.55, ramGb: 32, ssdGb: 2000 },
  office:    { gpu: 0.35, cpu: 0.65, ramGb: 16, ssdGb: 1000 },
};

const weightsFor = (usage: Usage | null) => WEIGHTS[usage ?? "gaming"];

/** Cheapest first, and never propose something off the shelf when something
    on it would do — PCB-05 says active products, in-stock preferred. */
const byPriceInStockFirst = (a: Part, b: Part) =>
  Number(b.product.stock) - Number(a.product.stock) || a.product.price - b.product.price;

/* ── filling the six bays that follow ────────────────────────────────────── */

/**
 * The rest of the machine, given a processor and a graphics card.
 *
 * Greedy and cheapest-first on purpose: none of these six bays moves the frame
 * rate, so every dinar spent here is a dinar not spent on the two that do. The
 * only exceptions are capacity floors — memory and storage have a target from
 * the use — and they are raised again later if budget is left over.
 *
 * Returns null when no combination assembles, which happens for real: a
 * Micro-ATX-only case cannot take an ATX board, and if that were the only case
 * left the pair has no machine.
 */
function fillAround(cpu: Part, gpu: Part, usage: Usage | null, pinned?: string): Build | null {
  const w = weightsFor(usage);
  const keep = (kind: PartKind, chosen: Part | undefined) =>
    pinned && partOf(pinned)?.spec.kind === kind ? partOf(pinned)! : chosen;

  const mb = keep("mb", pool("mb")
    .filter((p) => p.spec.socket === cpu.spec.socket)
    .sort(byPriceInStockFirst)[0]);
  if (!mb) return null;

  const ram = keep("ram", pool("ram")
    .filter((p) => p.spec.mem === mb.spec.mem && p.spec.capacityGb! >= w.ramGb)
    .sort(byPriceInStockFirst)[0]
    /* No stick of the target size on this memory generation — take the
       largest that exists rather than abandoning the whole build. */
    ?? pool("ram").filter((p) => p.spec.mem === mb.spec.mem).sort((a, b) => b.spec.capacityGb! - a.spec.capacityGb!)[0]);
  if (!ram) return null;

  const ssd = keep("ssd", pool("ssd")
    .filter((p) => p.spec.capacityGb! >= w.ssdGb)
    .sort(byPriceInStockFirst)[0] ?? pool("ssd").sort(byPriceInStockFirst)[0]);
  if (!ssd) return null;

  /* Case and cooler have to be solved together. A 360 mm radiator and a
     170 mm tower both need a case that takes them, and the cheapest case that
     fits the board is not always one of those — so walk cases cheapest-first
     and take the first that has any cooler able to sit in it. */
  let chosenCase: Part | undefined;
  let chosenCooler: Part | undefined;

  const cases = pool("case")
    .filter((c) => c.spec.accepts!.includes(mb.spec.form!) && gpu.spec.lengthMm! <= c.spec.maxGpuMm!)
    .sort(byPriceInStockFirst);

  for (const candidate of cases) {
    const cooler = pool("cooling")
      .filter((c) => c.spec.fitsSockets?.includes(cpu.spec.socket!))
      .filter((c) => c.spec.dissipation! >= cpu.spec.tdp!)
      .filter((c) => !c.spec.heightMm || c.spec.heightMm <= candidate.spec.maxCoolerMm!)
      .filter((c) => !c.spec.radiatorMm || c.spec.radiatorMm <= candidate.spec.maxRadiatorMm!)
      .sort(byPriceInStockFirst)[0];

    if (cooler) {
      chosenCase = candidate;
      chosenCooler = cooler;
      break;
    }
  }

  chosenCase = keep("case", chosenCase);
  chosenCooler = keep("cooling", chosenCooler);
  if (!chosenCase || !chosenCooler) return null;

  /* One kit and one drive. A second of either is a customer's decision — the
     generator reaches a capacity target by buying the bigger single part,
     which is also what leaves them the free slots to add to later. */
  const draft: Build = {
    cpu: [cpu.product.slug],
    gpu: [gpu.product.slug],
    mb: [mb.product.slug],
    ram: [ram.product.slug],
    ssd: [ssd.product.slug],
    cooling: [chosenCooler.product.slug],
    case: [chosenCase.product.slug],
  };

  /* The supply is sized against the machine that now exists, not against a
     rule of thumb — the same `powerVerdict` the customer is shown. */
  const need = powerVerdict(draft).recommended;
  const psu = keep("psu", pool("psu")
    .filter((p) => p.spec.psuWatts! >= need)
    .filter((p) => !gpu.spec.needs || p.spec.provides?.includes(gpu.spec.needs))
    .sort(byPriceInStockFirst)[0]);
  if (!psu) return null;

  return { ...draft, psu: [psu.product.slug] };
}

/**
 * What to do with budget left over once the processor and card are paid for.
 *
 * Capacity first: memory and storage are the only bays where more money buys
 * the customer something they will notice every day. After that, cooling and
 * the case — not because they add frames, they add none, but because a
 * customer who set aside 800 000 DA and is handed a 570 000 DA machine is
 * owed the quieter cooler and the better-ventilated box rather than a number
 * that says we could not think of anything.
 *
 * The board and the supply are deliberately left alone. A more expensive board
 * changes nothing a buyer can perceive, and a larger supply trips the
 * oversizing warning this same engine raises — spending someone's money to
 * earn them a warning is not an upgrade. When the catalogue genuinely runs out
 * of things worth buying, the surplus is reported to the customer instead.
 */
function spendLeftovers(build: Build, budget: number | null, pinned?: string): Build {
  if (budget === null) return build;
  let out = build;

  /* The pinned part's bay is never upgraded. `fillAround` seats the pin and
     this used to overwrite it one step later — so a customer who pressed
     "Ajouter au PC Builder" on a 16 Go kit, with budget to spare, was handed a
     machine built around a 64 Go kit instead: the one part they chose, gone. */
  const pinnedKind = pinned ? partOf(pinned)?.spec.kind : undefined;

  const affordable = (next: Build) => {
    if (total(next) > budget) return false;
    const before = checkBuild(out);
    const after = checkBuild(next);
    /* Never introduce a fault, and never trade a clean build for a warned one
       just because there was money to spend. */
    return after.every((i) => i.level !== "error") && after.length <= before.length;
  };

  for (const kind of ["ram", "ssd"] as const) {
    if (kind === pinnedKind) continue;
    const current = partsIn(out, kind)[0];
    if (!current) continue;

    const better = pool(kind)
      .filter((p) => p.product.stock)
      .filter((p) => p.spec.capacityGb! > current.spec.capacityGb!)
      .filter((p) => kind !== "ram" || p.spec.mem === partsIn(out, "mb")[0]?.spec.mem)
      .sort((a, b) => a.product.price - b.product.price);

    for (const candidate of better) {
      const next = { ...out, [kind]: [candidate.product.slug] };
      if (affordable(next)) out = next;
    }
  }

  for (const kind of ["cooling", "case"] as const) {
    if (kind === pinnedKind) continue;
    const current = partsIn(out, kind)[0];
    if (!current) continue;

    const better = pool(kind)
      .filter((p) => p.product.stock && p.product.price > current.product.price)
      .sort((a, b) => a.product.price - b.product.price);

    for (const candidate of better) {
      const next = { ...out, [kind]: [candidate.product.slug] };
      if (affordable(next)) out = next;
    }
  }

  return out;
}

const total = buildTotal;

/* ── scoring and ranking ─────────────────────────────────────────────────── */

export type Candidate = {
  build: Build;
  total: number;
  watts: number;
  score: number;
  /** how far over the budget, in DA; 0 when it fits */
  over: number;
};

function score(build: Build, brief: Brief): number {
  const w = weightsFor(brief.usage);
  const cpu = partsIn(build, "cpu")[0];
  const gpu = partsIn(build, "gpu")[0];

  /* Which processor index applies is the use, not the part. Someone editing
     video is buying cores; someone playing is buying the cache and clocks that
     feed a card. Streaming sits between the two — the game and the encoder are
     both running — so it takes the average rather than picking a side. */
  const cpuIndex =
    brief.usage === "creation"
      ? cpu.spec.perfMt!
      : brief.usage === "streaming"
        ? (cpu.spec.perf! + cpu.spec.perfMt!) / 2
        : cpu.spec.perf!;

  let s = gpu.spec.perf! * w.gpu + cpuIndex * w.cpu;

  /* Capacity is worth a nudge, not a decision — enough to break a tie toward
     the machine with more memory, never enough to trade away a card tier. */
  s += Math.min(capacityIn(build, "ram"), 64) / 64 * 5;
  s += Math.min(capacityIn(build, "ssd"), 2000) / 2000 * 3;

  /* A stated brand preference is a bonus, never a filter. Someone who says
     "plutôt AMD" should get AMD where it is close, and should still be shown
     the better machine when it is not close at all. */
  if (brief.brand === "amd" && cpu.product.brand === "AMD") s += 4;
  if (brief.brand === "intel" && cpu.product.brand === "Intel") s += 4;
  if (brief.brand === "amd" && gpu.product.brand === "AMD") s += 4;
  if (brief.brand === "nvidia" && gpu.product.brand === "NVIDIA") s += 6;

  /* Out-of-stock parts are ranked below anything available. Heavy enough to
     lose to a slightly slower machine that can actually ship this week. */
  for (const kind of PART_KINDS) {
    const bay = lines(build, kind);
    if (bay.length === 0 || bay.some((l) => !l.part.product.stock)) s -= 20;
  }

  /* Leaving a third of the budget unspent is a worse answer than spending it,
     but only mildly — the customer asked for a machine, not for the most
     expensive machine under a ceiling. */
  if (brief.budget) s += Math.min(total(build) / brief.budget, 1) * 6;

  return s;
}

/**
 * Every machine worth considering for this brief, best first.
 *
 * Deduplicated by processor-and-card pair, because those two are what the
 * customer perceives as "a different build". Two candidates that differ only
 * in which 650 W supply they use are the same proposal, and offering both as
 * alternatives makes the regenerate button look broken.
 */
export function rank(brief: Brief): Candidate[] {
  const pinned = brief.pinned && partOf(brief.pinned) ? brief.pinned : undefined;
  const pinnedKind = pinned ? partOf(pinned)!.spec.kind : null;

  const cpus = pinnedKind === "cpu" ? [partOf(pinned!)!] : pool("cpu");
  const gpus = pinnedKind === "gpu" ? [partOf(pinned!)!] : pool("gpu");

  const out: Candidate[] = [];

  for (const cpu of cpus) {
    for (const gpu of gpus) {
      const base = fillAround(cpu, gpu, brief.usage, pinned);
      if (!base) continue;

      const build = spendLeftovers(base, brief.budget, pinned);

      /* A build the engine would reject is never offered, whatever it scores.
         Warnings are fine — that is what they are for. */
      if (checkBuild(build).some((i) => i.level === "error")) continue;

      const cost = total(build);
      out.push({
        build,
        total: cost,
        watts: totalWatts(build),
        score: score(build, brief),
        over: brief.budget ? Math.max(0, cost - brief.budget) : 0,
      });
    }
  }

  /* Within budget beats over budget, whatever the score — a machine the
     customer cannot pay for is not a better answer than one they can. */
  return out.sort((a, b) => {
    if ((a.over === 0) !== (b.over === 0)) return a.over === 0 ? -1 : 1;
    if (a.over !== 0 && b.over !== 0) return a.over - b.over;
    return b.score - a.score;
  });
}

/** PCB-12 — the same budget, a cheaper variant, or a faster one. */
export type Variant = "same" | "cheaper" | "faster";

/**
 * One machine for this brief.
 *
 * `nth` walks down the ranking, which is how "propose me another" works
 * without re-rolling: each press is the next-best genuinely different build,
 * and pressing past the end wraps rather than dead-ends.
 */
export function generate(brief: Brief, variant: Variant = "same", nth = 0): Candidate | null {
  const shifted: Brief =
    brief.budget === null || variant === "same"
      ? brief
      : { ...brief, budget: Math.round(brief.budget * (variant === "cheaper" ? 0.75 : 1.3)) };

  const ranked = rank(shifted);
  if (ranked.length === 0) return null;

  const chosen = ranked[nth % ranked.length];

  /* A cheaper variant is scored against a reduced ceiling but still reported
     against the budget the customer actually stated, or the "écart au budget"
     line on the result would be measured from a number they never gave. */
  return { ...chosen, over: brief.budget ? Math.max(0, chosen.total - brief.budget) : 0 };
}

/** The cheapest machine that assembles at all, for the case where the stated
    budget cannot buy anything — the answer is then "here is the floor". */
export function cheapestPossible(brief: Brief): Candidate | null {
  const all = rank({ ...brief, budget: null });
  if (all.length === 0) return null;
  return all.reduce((low, c) => (c.total < low.total ? c : low));
}
