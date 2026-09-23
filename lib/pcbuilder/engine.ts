/**
 * The part of MODULE 4 that is not allowed to be clever — PCB-06, 07, 08.
 *
 * Everything here is arithmetic and table lookups. No model decides whether
 * two parts go together, and none ever will: a compatibility verdict is a
 * promise, and a promise cannot come from something that is right most of the
 * time. The AI's job (PCB-01/05) is to *propose*; this file's job is to
 * *rule*, and the proposal is re-checked here every time it changes, including
 * after a manual swap (PCB-11) and after every regeneration (PCB-12).
 *
 * What it rules on is deliberately narrow — memory generation only. See
 * `checkBuild` for why the other rules were taken out.
 *
 * So the flow is always: something picks parts → `checkBuild` rules on them →
 * the UI shows the ruling. There is no path that reaches a cart without
 * passing through this file.
 */

import {
  PART_KINDS,
  applyPick,
  lines,
  partsIn,
  resolve,
  type Build,
  type PartKind,
} from "./parts";

/* ── findings ────────────────────────────────────────────────────────────── */

/**
 * `error` means the build will not work and cannot be ordered as it stands.
 * `warning` means it will work but something is being wasted or strained —
 * a cooler at its limit, memory below what the games asked for. Warnings
 * never block the cart; a customer is allowed to buy a machine we would have
 * specced differently, as long as they were told.
 */
export type IssueLevel = "error" | "warning";

export type Issue = {
  /** stable, so the UI can key and animate findings across recomputes */
  id: string;
  level: IssueLevel;
  /** the bays this implicates — the build sheet outlines them */
  kinds: PartKind[];
  /** phrasebook key, `pcb.iss.*` */
  key: string;
  /** substituted into the message with `fill()` */
  vars?: Record<string, string | number>;
};

/** `t(key)` returns a string with `{token}` holes — the house pattern from
    `pd.lowStock`. This fills several at once instead of chaining `.replace`. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.split(`{${k}}`).join(String(v)),
    template,
  );
}

/* ── power: PCB-07 ───────────────────────────────────────────────────────── */

/**
 * Total draw of the configuration, in watts.
 *
 * A straight sum of the parts that are actually chosen, so a half-built
 * machine reports the draw of its half — and a second memory kit or drive
 * draws its own share. The figures in `PART_SPECS` are load draws rather than
 * sticker TDPs — see the note there.
 */
export function totalWatts(build: Build): number {
  return PART_KINDS.reduce(
    (sum, kind) => sum + partsIn(build, kind).reduce((bay, p) => bay + p.spec.watts, 0),
    0,
  );
}

/** The supplies the shop actually sells by. Rounding a recommendation to
    anything else produces a number nobody can buy. */
const CALIBRES = [450, 550, 650, 750, 850, 1000, 1200, 1600];

/**
 * Headroom over the measured draw — PCB-08.
 *
 * 1.4 covers two different things at once. Recent graphics cards spike well
 * above their rated draw for a few milliseconds at a time, and a supply sized
 * exactly to the average will trip its own protection on those transients.
 * Separately, an 80+ supply is most efficient around half load, so sizing with
 * margin is also what makes the machine quiet and cheap to run. Below roughly
 * 1.3 both of those start to bite; much above 1.5 and the customer is buying
 * watts purely to leave them idle.
 */
const HEADROOM = 1.4;

export type PowerVerdict = {
  /** measured draw of the chosen parts */
  draw: number;
  /** draw × headroom, before rounding — shown as the reasoning */
  target: number;
  /** the calibre we recommend buying */
  recommended: number;
  /** what the chosen supply delivers, if one is chosen */
  fitted: number | null;
  /** watts of slack over the draw; negative means the supply is undersized */
  headroom: number | null;
  /** 80+ rating of the chosen supply, for the recommendation line */
  cert: string | null;
};

export function powerVerdict(build: Build): PowerVerdict {
  const draw = totalWatts(build);
  const target = Math.ceil(draw * HEADROOM);
  const recommended = CALIBRES.find((c) => c >= target) ?? CALIBRES[CALIBRES.length - 1];

  const psu = partsIn(build, "psu")[0]?.spec ?? null;
  const fitted = psu?.psuWatts ?? null;

  return {
    draw,
    target,
    recommended,
    fitted,
    headroom: fitted === null ? null : fitted - draw,
    cert: psu?.cert ?? null,
  };
}

/* ── compatibility: PCB-06 ───────────────────────────────────────────────── */

/**
 * Every finding about a build, worst first.
 *
 * One compatibility rule, on purpose: memory against the motherboard, DDR4 or
 * DDR5. Every rule here is a promise that rests on facts somebody has to type
 * in and keep true for each product — sockets, board sizes, card lengths,
 * cooler heights, connectors, slot counts — and a rule fed a wrong fact is
 * worse than no rule, because it refuses a machine that works or approves one
 * that does not while looking certain either way. The shop's catalogue is kept
 * by hand, and the memory generation is the one fact short enough to keep
 * reliably: it is in every memory kit's name and on every board's box.
 *
 * Everything else is checked by the people assembling the machine, which is
 * where it was always going to be caught for certain. The out-of-stock and
 * empty-bay notices below are not compatibility rules and need no extra facts
 * — stock is on every product already.
 */
export function checkBuild(build: Build): Issue[] {
  const p = resolve(build);
  const issues: Issue[] = [];

  /* Every kit is checked, not the first one. A second kit is exactly where a
     DDR4 part slips into a DDR5 machine — it is the one added later, from a
     drawer, by someone thinking about capacity rather than generations. */
  const kits = partsIn(build, "ram");
  const gens = new Set(kits.map((k) => k.spec.mem));
  const wrongGen = p.mb ? kits.find((k) => k.spec.mem !== p.mb!.spec.mem) : undefined;

  if (p.mb && wrongGen) {
    issues.push({
      id: "memgen",
      level: "error",
      kinds: ["ram", "mb"],
      key: "pcb.iss.memgen",
      vars: { ram: wrongGen.spec.mem!, mb: p.mb.spec.mem! },
    });
  } else if (!p.mb && gens.size > 1) {
    /* With no board yet there is nothing to be wrong *against* — but DDR4 and
       DDR5 in one machine is wrong against every board there is. Only said
       when there is no board, because with one the finding above already
       names the kit that does not fit, and saying it twice is noise. */
    issues.push({
      id: "memmixed",
      level: "error",
      kinds: ["ram"],
      key: "pcb.iss.memMixed",
    });
  }

  /* An out-of-stock part is not an incompatibility, but it is the single thing
     most likely to turn a finished build into a phone call, so it is surfaced
     in the same panel rather than left to a badge on one tile. Once per
     product, however many of it are fitted. */
  for (const kind of PART_KINDS) {
    for (const { slug, part } of lines(build, kind)) {
      if (part.product.stock) continue;
      issues.push({
        id: `stock-${slug}`,
        level: "warning",
        kinds: [kind],
        key: "pcb.iss.outOfStock",
        vars: { name: part.product.name },
      });
    }
  }

  const missing = PART_KINDS.filter((kind) => partsIn(build, kind).length === 0);
  if (missing.length > 0) {
    issues.push({
      id: "incomplete",
      level: "warning",
      kinds: missing,
      key: "pcb.iss.incomplete",
      vars: { n: missing.length },
    });
  }

  return issues.sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
}

/** The one word the header badge shows. */
export type BuildState = "ok" | "warn" | "error";

export function buildState(issues: Issue[]): BuildState {
  if (issues.some((i) => i.level === "error")) return "error";
  if (issues.some((i) => i.level === "warning")) return "warn";
  return "ok";
}

/** Bays implicated in at least one error, for outlining rows in the sheet. */
export function faultyKinds(issues: Issue[]): Set<PartKind> {
  const out = new Set<PartKind>();
  for (const issue of issues) {
    if (issue.level === "error") issue.kinds.forEach((k) => out.add(k));
  }
  return out;
}

/**
 * Whether choosing `slug` in the drawer would leave the build assemblable.
 *
 * Used to sort and mark the swap drawer (PCB-11): an option that would break
 * the machine is still listed — hiding it invites "why can't I pick that
 * kit?" — but it is listed last and labelled with what it would break.
 *
 * `replacing` is the row the drawer was opened on, or null when it is filling
 * an empty bay or adding a part beside the ones already there — see
 * `applyPick`, which this checks exactly so the drawer and the pick can never
 * disagree about what the machine would become.
 */
export function trySwap(build: Build, kind: PartKind, slug: string, replacing: string | null = null): Issue[] {
  return checkBuild(applyPick(build, kind, slug, replacing));
}

/** An error, down to the figures in it — "3 drives for 2 slots" and "4 drives
    for 2 slots" are different findings, and a pick that turns the first into
    the second has made the machine worse. */
const signature = (issue: Issue) => `${issue.id}:${JSON.stringify(issue.vars ?? {})}`;

/**
 * The errors a pick would *add* to the machine — what the drawer means by
 * "casse la compatibilité".
 *
 * Not every error in the machine that results. A build can already be broken
 * before the drawer opens — a shared link, or a third drive stepped onto a
 * board with two sockets, which the stepper deliberately allows — and judging
 * options against the whole verdict then marks every cooler and every case as
 * breaking the machine, with the drive count as the reason. The one drawer that
 * could not fix the problem would be the one refusing everything, and the
 * part already fitted would be listed as incompatible with itself.
 *
 * So a standing error is neutral. An option is blocked only for a problem it
 * brings with it, and an option that clears a standing error is simply listed
 * among the ones that fit.
 */
export function breaks(build: Build, kind: PartKind, slug: string, replacing: string | null = null): Issue[] {
  const standing = new Set(checkBuild(build).filter((i) => i.level === "error").map(signature));
  return trySwap(build, kind, slug, replacing).filter(
    (i) => i.level === "error" && !standing.has(signature(i)),
  );
}
