/**
 * The machine-readable half of the catalogue — MODULE 4.
 *
 * `lib/products.ts` describes components the way a shopper reads them: a spec
 * table of French label/value pairs, written for a product page. "Socket" is
 * `"AM5"` on one product and `"AM5 · LGA 1851"` on another, a card's length is
 * buried in `"3,2 slots · 336 mm"`, and a power supply says `"850 W"`. All of
 * that is correct for a human and useless to a compatibility engine, which has
 * to compare a socket against a socket and a millimetre against a millimetre.
 *
 * Parsing those strings back out was the alternative, and it was rejected:
 * the display copy is written by whoever adds a product, a comma or a unit
 * moves, and the engine silently starts approving builds that do not fit. So
 * the structured facts are declared here instead, once, keyed by slug. The two
 * sides can disagree — a typo here shows up as a wrong verdict — which is why
 * `auditParts()` at the bottom exists and why the builder refuses to offer a
 * component that has no entry.
 *
 * When the AI lands (PCB-01/PCB-05) it chooses *from this table*. It never
 * invents a part, because a part that is not here cannot be priced, checked,
 * or put in a cart.
 */

import { PRODUCTS, getProduct, type Product } from "@/lib/products";

/* ── the eight bays a build has ──────────────────────────────────────────── */

export type PartKind = "cpu" | "mb" | "gpu" | "ram" | "ssd" | "cooling" | "case" | "psu";

/** Ordered as the build sheet lists them: the decisions that drive the machine
    first, the parts that follow from those underneath. */
export const PART_KINDS: PartKind[] = ["cpu", "gpu", "mb", "ram", "ssd", "cooling", "case", "psu"];

/** A bay the customer cannot leave empty. All eight, today — but the scope
    question (PCB-04) can add a screen and peripherals on top, and those are
    optional, so the distinction is worth keeping explicit. */
export const REQUIRED_KINDS = PART_KINDS;

export type Socket = "AM5" | "LGA1700" | "LGA1851";
export type MemGen = "DDR4" | "DDR5";
export type FormFactor = "ATX" | "mATX" | "ITX";
/** A PCIe power plug. `12v2x6` is the 16-pin connector recent cards want; the
    older 8-pin is `pcie8`. A card asks for one, a supply offers some. */
export type PowerPlug = "12v2x6" | "pcie8";

export type PartSpec = {
  kind: PartKind;

  /** Draw under a gaming load, in watts — not the sticker TDP.
      A 7800X3D is a 120 W part on paper and pulls about 80 W in a game; sizing
      a supply off the paper figure is how customers end up buying 200 W they
      will never use. Measured-ish figures, rounded up. */
  watts: number;

  /* platform */
  socket?: Socket;            // cpu, mb
  mem?: MemGen;               // mb, ram
  form?: FormFactor;          // mb — the board's own size
  accepts?: FormFactor[];     // case — the board sizes it takes

  /* physical clearance, millimetres */
  lengthMm?: number;          // gpu
  maxGpuMm?: number;          // case
  heightMm?: number;          // cooling, air only
  maxCoolerMm?: number;       // case
  radiatorMm?: number;        // cooling, AIO only
  maxRadiatorMm?: number;     // case

  /* thermals */
  tdp?: number;               // cpu — heat the cooler has to move
  dissipation?: number;       // cooling — how much it can move
  fitsSockets?: Socket[];     // cooling — the mounts in the box

  /* power delivery */
  psuWatts?: number;          // psu
  cert?: string;              // psu — 80+ rating, shown in the recommendation
  provides?: PowerPlug[];     // psu
  needs?: PowerPlug;          // gpu

  /**
   * Relative performance, 0–100, feeding the FPS model in `fps.ts`.
   *
   * GPUs are indexed against the RTX 5080 at 100. CPUs are indexed on *gaming*
   * throughput rather than total compute, which is why the 7800X3D sits within
   * a couple of points of a 16-core 9950X that beats it comfortably at
   * everything else — in a builder, the number that matters is the one that
   * predicts frames.
   */
  perf?: number;

  /**
   * Multithreaded throughput, same 0–100 scale — processors only.
   *
   * Kept apart from `perf` because the two genuinely disagree, and the
   * disagreement is the whole advice. A 7800X3D beats a 9950X in games and
   * loses to it badly at an export; a single index has to pick one of those to
   * be wrong about. With both, the generator recommends the X3D to someone who
   * says they play and the 9950X to someone who says they edit, which is what
   * a competent shop would say out loud.
   */
  perfMt?: number;

  /** gigabytes — memory and storage. For memory this is the whole kit, not
      one stick. */
  capacityGb?: number;
};

/* ── the table ───────────────────────────────────────────────────────────── */

export const PART_SPECS: Record<string, PartSpec> = {
  /* processors */
  "ryzen-9-9950x":    { kind: "cpu", socket: "AM5",     watts: 200, tdp: 170, perf: 97,  perfMt: 100 },
  "ryzen-7-7800x3d":  { kind: "cpu", socket: "AM5",     watts: 90,  tdp: 120, perf: 100, perfMt: 62 },
  "ryzen-5-7600":     { kind: "cpu", socket: "AM5",     watts: 90,  tdp: 65,  perf: 72,  perfMt: 45 },
  "core-ultra-9-285k":{ kind: "cpu", socket: "LGA1851", watts: 180, tdp: 125, perf: 94,  perfMt: 96 },
  "core-i5-14400f":   { kind: "cpu", socket: "LGA1700", watts: 80,  tdp: 65,  perf: 64,  perfMt: 40 },

  /* graphics */
  "apl-tech-rtx-5080-oc": { kind: "gpu", watts: 320, lengthMm: 336, perf: 100, needs: "12v2x6" },
  "radeon-rx-9070-xt":    { kind: "gpu", watts: 304, lengthMm: 330, perf: 78,  needs: "pcie8" },
  "rtx-5070-12go":        { kind: "gpu", watts: 250, lengthMm: 304, perf: 62,  needs: "12v2x6" },
  "rtx-5060-ti-16go":     { kind: "gpu", watts: 180, lengthMm: 242, perf: 45,  needs: "pcie8" },
  "radeon-rx-9060-xt":    { kind: "gpu", watts: 160, lengthMm: 232, perf: 36,  needs: "pcie8" },

  /* motherboards */
  "rog-strix-b850-f":     { kind: "mb", socket: "AM5",     mem: "DDR5", form: "ATX",  watts: 35 },
  "msi-b650-gaming-plus": { kind: "mb", socket: "AM5",     mem: "DDR5", form: "ATX",  watts: 32 },
  "mag-z890-tomahawk":    { kind: "mb", socket: "LGA1851", mem: "DDR5", form: "ATX",  watts: 38 },
  "msi-pro-b760m-a":      { kind: "mb", socket: "LGA1700", mem: "DDR4", form: "mATX", watts: 28 },

  /* memory — `watts` and `capacityGb` are the kit's */
  "trident-z5-64go-ddr5-6400":  { kind: "ram", mem: "DDR5", capacityGb: 64, watts: 12 },
  "vengeance-32go-ddr5-6000":   { kind: "ram", mem: "DDR5", capacityGb: 32, watts: 10 },
  "fury-beast-16go-ddr5-5600":  { kind: "ram", mem: "DDR5", capacityGb: 16, watts: 8 },
  "fury-beast-16go-ddr4-3200":  { kind: "ram", mem: "DDR4", capacityGb: 16, watts: 7 },

  /* storage */
  "samsung-990-pro-2to":   { kind: "ssd", capacityGb: 2000, watts: 8 },
  "wd-black-sn850x-1to":   { kind: "ssd", capacityGb: 1000, watts: 7 },
  "kingston-nv3-1to":      { kind: "ssd", capacityGb: 1000, watts: 5 },

  /* cooling — `fitsSockets` is the mounting hardware actually in the box, and
     it is the check that catches the most builds: two of these four coolers
     ship no LGA 1700 bracket, and LGA 1700 is the budget Intel platform. */
  "nzxt-kraken-360-rgb": { kind: "cooling", watts: 14, radiatorMm: 360, dissipation: 280, fitsSockets: ["AM5", "LGA1851"] },
  "noctua-nh-d15-g2":    { kind: "cooling", watts: 5,  heightMm: 168,   dissipation: 260, fitsSockets: ["AM5", "LGA1851"] },
  "corsair-h100i-rgb":   { kind: "cooling", watts: 12, radiatorMm: 240, dissipation: 250, fitsSockets: ["AM5", "LGA1700", "LGA1851"] },
  "hyper-212-black":     { kind: "cooling", watts: 4,  heightMm: 159,   dissipation: 150, fitsSockets: ["AM5", "LGA1700", "LGA1851"] },

  /* cases */
  "lian-li-o11-dynamic-evo": { kind: "case", watts: 8, accepts: ["ATX", "mATX", "ITX"], maxGpuMm: 423, maxCoolerMm: 167, maxRadiatorMm: 360 },
  "nzxt-h7-flow":            { kind: "case", watts: 7, accepts: ["ATX", "mATX", "ITX"], maxGpuMm: 400, maxCoolerMm: 185, maxRadiatorMm: 360 },
  "corsair-4000d-airflow":   { kind: "case", watts: 6, accepts: ["ATX", "mATX", "ITX"], maxGpuMm: 360, maxCoolerMm: 170, maxRadiatorMm: 360 },
  "cooler-master-q300l":     { kind: "case", watts: 5, accepts: ["mATX", "ITX"],        maxGpuMm: 360, maxCoolerMm: 159, maxRadiatorMm: 240 },

  /* power supplies — `watts` is the supply's own overhead, near enough zero;
     `psuWatts` is what it delivers. */
  "corsair-hx1000":   { kind: "psu", watts: 0, psuWatts: 1000, cert: "80+ Platinum", provides: ["12v2x6", "pcie8"] },
  "corsair-rm850x":   { kind: "psu", watts: 0, psuWatts: 850,  cert: "80+ Gold",     provides: ["12v2x6", "pcie8"] },
  "msi-mag-a750gl":   { kind: "psu", watts: 0, psuWatts: 750,  cert: "80+ Gold",     provides: ["pcie8"] },
  "corsair-cx650":    { kind: "psu", watts: 0, psuWatts: 650,  cert: "80+ Bronze",   provides: ["pcie8"] },
};

/* ── looking things up ───────────────────────────────────────────────────── */

/** A catalogue product together with its build facts. The pair travels as one
    thing because every screen in the builder needs both halves: the name and
    price come from the catalogue, the verdict comes from the spec. */
export type Part = { product: Product; spec: PartSpec };

export function partOf(slug: string): Part | null {
  const spec = PART_SPECS[slug];
  const product = getProduct(slug);
  return spec && product ? { product, spec } : null;
}

/** Every buildable component of one kind, cheapest first.
 *
 *  Sorted by price rather than by performance because that is the order the
 *  swap drawer (PCB-11) reads best in — a customer replacing a part is nearly
 *  always asking "what else is there, and what does it cost me". */
export function pool(kind: PartKind): Part[] {
  return PRODUCTS.filter((p) => PART_SPECS[p.slug]?.kind === kind)
    .map((product) => ({ product, spec: PART_SPECS[product.slug] }))
    .sort((a, b) => a.product.price - b.product.price);
}

/** PCB-05 — active products, in-stock preferred.
 *
 *  Out-of-stock parts stay in the pool rather than being filtered away: the
 *  generator ranks them last and will not choose one while an in-stock
 *  alternative exists, but a customer browsing the swap drawer should still
 *  see that the part exists and is simply not on the shelf this week. Hiding
 *  it invites the question "don't you sell the A750?" every time. */
export const inStock = (p: Part) => p.product.stock;

/* ── the build ───────────────────────────────────────────────────────────── */

/**
 * The machine being assembled: a list of slugs per bay.
 *
 * Every bay is a list, the six that can only ever hold one part included. Two
 * bays genuinely take several — a second memory kit, a boot drive beside a
 * bulk drive — and the alternative, a scalar for six bays and a list for two,
 * puts an `Array.isArray` in every consumer and a bug in whichever one forgot
 * it. With one shape a total or a power draw is a sum over lists and is right
 * by construction: two kits cost twice and draw twice without anybody
 * remembering to multiply.
 *
 * Quantity is written as repeats — the same kit twice is two of it — and
 * `lines()` folds them back into rows for display. A bay that takes one part
 * is held to one by the functions below that write builds, not by the type.
 */
export type Build = Partial<Record<PartKind, string[]>>;

/** The bays that take more than one part. The rest of a tower is one of each —
    including the graphics card, since nothing on the shelf runs two. */
export const MULTI_KINDS: PartKind[] = ["ram", "ssd"];
export const isMulti = (kind: PartKind): boolean => MULTI_KINDS.includes(kind);

export const slugsIn = (build: Build, kind: PartKind): string[] => build[kind] ?? [];

/** Every part in a bay, one entry per unit — repeats included, so a sum over
    it counts quantity without being told to. */
export const partsIn = (build: Build, kind: PartKind): Part[] =>
  slugsIn(build, kind)
    .map(partOf)
    .filter((p): p is Part => p !== null);

/** One row of a bay: a product and how many of it. */
export type Line = { slug: string; part: Part; qty: number };

/** A bay folded into rows, in the order each product first arrived — so a
    second kit added later lists under the first instead of jumping above it. */
export function lines(build: Build, kind: PartKind): Line[] {
  const out: Line[] = [];
  for (const slug of slugsIn(build, kind)) {
    const line = out.find((l) => l.slug === slug);
    if (line) {
      line.qty += 1;
      continue;
    }
    const part = partOf(slug);
    if (part) out.push({ slug, part, qty: 1 });
  }
  return out;
}

const unfold = (rows: { slug: string; qty: number }[]): string[] =>
  rows.flatMap(({ slug, qty }) => Array.from({ length: Math.max(qty, 0) }, () => slug));

/** Whether a bay holds the same parts in two builds. What a regenerate uses to
    decide which bays moved — lists compare by reference, and reading every
    freshly generated one as a change would eject all eight parts. */
export const sameBay = (a: Build, b: Build, kind: PartKind): boolean =>
  slugsIn(a, kind).join("|") === slugsIn(b, kind).join("|");

/**
 * The first part in every bay — which, for the six bays that take one, is the
 * part.
 *
 * The rules about sockets, clearances and connectors are each about a single
 * component and read this. The rules that must see every stick and every drive
 * read `partsIn` instead.
 */
export function resolve(build: Build): Partial<Record<PartKind, Part>> {
  const out: Partial<Record<PartKind, Part>> = {};
  for (const kind of PART_KINDS) {
    const part = partsIn(build, kind)[0];
    if (part) out[kind] = part;
  }
  return out;
}

export const buildTotal = (build: Build): number =>
  PART_KINDS.reduce(
    (sum, kind) => sum + partsIn(build, kind).reduce((bay, p) => bay + p.product.price, 0),
    0,
  );

/**
 * How many real components the builder has to choose from.
 *
 * Counted rather than claimed. The badge above the builder's headline used to
 * read "Première en Algérie", which is the kind of line a page cannot back up
 * and a reader has no way to check — and being unverifiable is what made it
 * read as filler rather than as a reason to trust the thing underneath it.
 *
 * This is the same slot saying something the code can prove: every part in
 * this number is in `PART_SPECS`, is in the catalogue, has a price, and can be
 * put in a machine today. Derived, so it stays true as the shelf grows instead
 * of becoming a second thing to remember to update.
 */
export const buildableCount = (): number =>
  PART_KINDS.reduce((n, kind) => n + pool(kind).length, 0);

export const isComplete = (build: Build): boolean =>
  REQUIRED_KINDS.every((kind) => partsIn(build, kind).length > 0);

/**
 * A build read back from somewhere this code did not just write it.
 *
 * Builds saved before bays were lists hold one slug per bay, and still read as
 * exactly the machine they named. Anything that is not a real part of the
 * right kind is dropped, the same courtesy a shared link gets.
 */
export function normalizeBuild(raw: unknown): Build {
  const out: Build = {};
  if (!raw || typeof raw !== "object") return out;

  for (const kind of PART_KINDS) {
    const value = (raw as Record<string, unknown>)[kind];
    const slugs = (Array.isArray(value) ? value : [value]).filter(
      (s): s is string => typeof s === "string" && partOf(s)?.spec.kind === kind,
    );
    if (slugs.length > 0) out[kind] = isMulti(kind) ? slugs : slugs.slice(0, 1);
  }
  return out;
}

/* ── how many ────────────────────────────────────────────────────────────── */

/**
 * The most products a memory or storage bay takes.
 *
 * A plain ceiling, not a compatibility rule. How many memory slots and M.2
 * sockets a particular board has is one of the facts this builder no longer
 * asks the catalogue to keep — see `checkBuild` — so it cannot say "your board
 * has two". It can still refuse to price a machine with nine drives in it.
 *
 * Memory is two because every memory product on the shelf is a kit of two
 * sticks, and a consumer board takes four sticks at most. Storage is four, the
 * most M.2 sockets on any consumer board the shop sells. Anything between what
 * the fitted board really takes and this number is caught at assembly, like
 * every other physical fit.
 */
const MAX_IN_BAY: Partial<Record<PartKind, number>> = { ram: 2, ssd: 4 };

export const maxInBay = (kind: PartKind): number => (isMulti(kind) ? (MAX_IN_BAY[kind] ?? 1) : 1);

/** Gigabytes across every unit in a bay — the "48 Go" a memory tile shows,
    and what the generator's capacity targets are measured against. */
export const capacityIn = (build: Build, kind: PartKind): number =>
  partsIn(build, kind).reduce((n, p) => n + (p.spec.capacityGb ?? 0), 0);

/** The highest a product's quantity can go, given what else is in its bay. */
export function maxQuantity(build: Build, kind: PartKind, slug: string): number {
  if (!partOf(slug) || !isMulti(kind)) return 1;
  const others = slugsIn(build, kind).filter((s) => s !== slug).length;
  return Math.max(1, maxInBay(kind) - others);
}

/* ── changing a build ────────────────────────────────────────────────────── */

/**
 * A part chosen in the drawer.
 *
 * `replacing` is the row the drawer was opened from, or null when it was opened
 * on an empty bay or to add another part beside what is there. A single bay is
 * always replaced outright. A multi bay replaces the row in place and keeps its
 * quantity — "two of these, but that model" — and a product already fitted in
 * another row is folded into it, so the same kit is never listed twice.
 */
export function applyPick(build: Build, kind: PartKind, slug: string, replacing: string | null): Build {
  if (!isMulti(kind)) return { ...build, [kind]: [slug] };

  const rows = lines(build, kind).map(({ slug: s, qty }) => ({ slug: s, qty }));
  const existing = rows.find((r) => r.slug === slug);
  const at = replacing === null ? -1 : rows.findIndex((r) => r.slug === replacing);

  if (at === -1) {
    if (existing) existing.qty += 1;
    else rows.push({ slug, qty: 1 });
  } else if (existing && existing !== rows[at]) {
    existing.qty += rows[at].qty;
    rows.splice(at, 1);
  } else {
    rows[at] = { slug, qty: rows[at].qty };
  }

  return { ...build, [kind]: unfold(rows) };
}

/** A row's quantity, set directly. Zero removes the row; the ceiling is
    `maxQuantity`, for the reason given there. */
export function setQuantity(build: Build, kind: PartKind, slug: string, qty: number): Build {
  if (!isMulti(kind)) return build;

  const target = Math.min(Math.max(Math.round(qty), 0), maxQuantity(build, kind, slug));
  const rows = lines(build, kind)
    .map((l) => ({ slug: l.slug, qty: l.slug === slug ? target : l.qty }))
    .filter((r) => r.qty > 0);

  return { ...build, [kind]: unfold(rows) };
}

/* ── the guard rail ──────────────────────────────────────────────────────── */

/**
 * Facts in this file that no longer match the catalogue.
 *
 * Two tables describing the same components will drift — a product gets
 * renamed, a slug changes, someone adds a graphics card and forgets this file.
 * The builder's promise is that every part it offers is real and priced, so
 * the failure has to be loud rather than a card that silently never appears.
 *
 * Called from the builder page in development only; the cost is one pass over
 * thirty products, and it runs nowhere near a production render.
 */
export function auditParts(): string[] {
  const problems: string[] = [];

  for (const slug of Object.keys(PART_SPECS)) {
    if (!getProduct(slug)) problems.push(`PART_SPECS has "${slug}", the catalogue does not`);
  }

  for (const kind of PART_KINDS) {
    if (pool(kind).length === 0) problems.push(`no buildable part of kind "${kind}"`);
  }

  for (const [slug, spec] of Object.entries(PART_SPECS)) {
    if (spec.kind === "gpu" && spec.lengthMm === undefined) problems.push(`${slug}: gpu without lengthMm`);
    if (spec.kind === "case" && spec.maxGpuMm === undefined) problems.push(`${slug}: case without maxGpuMm`);
    if (spec.kind === "psu" && !spec.psuWatts) problems.push(`${slug}: psu without psuWatts`);
    if (spec.kind === "cooling" && !spec.fitsSockets?.length) problems.push(`${slug}: cooler without fitsSockets`);
    if ((spec.kind === "cpu" || spec.kind === "gpu") && spec.perf === undefined) {
      problems.push(`${slug}: ${spec.kind} without a perf index — the FPS model needs one`);
    }
    if (spec.kind === "cpu" && spec.perfMt === undefined) {
      problems.push(`${slug}: cpu without perfMt — creation builds would be scored on gaming throughput`);
    }
  }

  return problems;
}
