/* The parts the configurator sells, and the one build the home page shows off.
   Both live here rather than in the configurator page so the teaser cannot
   quote a total the builder would not actually charge: the price on the home
   card is summed from these same options. */

export type Option = { name: string; price: number };
export type Part = { key: string; options: Option[] };

export const PARTS: Part[] = [
  { key: "cpu", options: [
    { name: "Ryzen 5 9600X", price: 42000 },
    { name: "Ryzen 7 9700X", price: 64000 },
    { name: "Ryzen 9 9950X", price: 98000 },
    { name: "Core Ultra 9 285K", price: 92000 },
  ] },
  { key: "gpu", options: [
    { name: "RTX 5060 8 Go", price: 58000 },
    { name: "RTX 5070 Ti 16 Go", price: 142000 },
    { name: "RX 9070 XT 16 Go", price: 214000 },
    { name: "RTX 5080 16 Go", price: 289000 },
  ] },
  { key: "mb", options: [
    { name: "B650 DDR5", price: 28000 },
    { name: "X670E Wi-Fi", price: 52000 },
    { name: "Z890 Wi-Fi", price: 60000 },
  ] },
  { key: "ram", options: [
    { name: "16 Go DDR5 6000", price: 14000 },
    { name: "32 Go DDR5 6000", price: 26000 },
    { name: "64 Go DDR5 6000", price: 52000 },
  ] },
  { key: "ssd", options: [
    { name: "1 To NVMe Gen4", price: 12000 },
    { name: "2 To NVMe Gen4", price: 24000 },
    { name: "4 To NVMe Gen4", price: 48000 },
  ] },
  { key: "cooling", options: [
    { name: "Ventirad tour", price: 9000 },
    { name: "AIO 240 mm", price: 18000 },
    { name: "AIO 360 mm ARGB", price: 28000 },
  ] },
  { key: "case", options: [
    { name: "Mid-tower mesh", price: 12000 },
    { name: "Mid-tower verre", price: 18000 },
    { name: "Full-tower ARGB", price: 30000 },
  ] },
  { key: "psu", options: [
    { name: "650 W Gold", price: 11000 },
    { name: "850 W Gold", price: 17000 },
    { name: "1000 W Platinum", price: 26000 },
  ] },
];

/** the option index picked for each part, by key */
export type Selection = Record<string, number>;

export const defaultSelection = (): Selection =>
  Object.fromEntries(PARTS.map((p) => [p.key, 0]));

export const buildTotal = (sel: Selection) =>
  PARTS.reduce((sum, p) => sum + p.options[sel[p.key]].price, 0);

/* The build the home page shows: a mid-to-upper machine, the shape most
   people land on once they start moving sliders. Every part is priced, so the
   total under it is the real one — but only five of the eight are listed, the
   ones a buyer actually chooses between. Board, case and PSU follow from
   those and would only crowd a teaser. */
export const SHOWCASE: Selection = {
  cpu: 1,
  gpu: 1,
  mb: 1,
  ram: 1,
  ssd: 1,
  cooling: 2,
  case: 1,
  psu: 1,
};

export const SHOWCASE_ROWS = ["cpu", "gpu", "ram", "ssd", "cooling"] as const;

export const showcasePart = (key: string) =>
  PARTS.find((p) => p.key === key)!.options[SHOWCASE[key]];

/* ── the hand-off from a product page — PRD-08 ───────────────────────────── */

/** lowercase, letters and digits only, so "RX 9070 XT" meets "rx-9070-xt" */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The builder option that *is* this catalogue product, if it sells one.
 *
 * Scored on shared words rather than matched exactly: the catalogue calls it
 * "Radeon RX 9070 XT" and the builder lists "RX 9070 XT 16 Go", and neither
 * name is going to be rewritten to suit the other. Longer words count for
 * more, because the model number is what identifies a part — "RTX" is shared
 * by everything NVIDIA has ever made.
 *
 * The floor is what stops a coincidence being treated as a match: one short
 * word in common scores below it and returns nothing, which leaves the
 * configurator on its defaults rather than pinning the wrong card.
 */
const MATCH_FLOOR = 6;

type Hit = { part: string; index: number; score: number };

export function findOption(productName: string): { part: string; index: number } | null {
  const words = norm(productName)
    .split(" ")
    .filter((w) => w.length > 1);

  const hits: Hit[] = PARTS.flatMap((part) =>
    part.options.map((opt, index) => ({
      part: part.key,
      index,
      score: words.reduce((sum, w) => (norm(opt.name).includes(w) ? sum + w.length : sum), 0),
    })),
  );

  const best = hits.reduce<Hit | null>(
    (top, hit) => (top === null || hit.score > top.score ? hit : top),
    null,
  );

  return best && best.score >= MATCH_FLOOR ? { part: best.part, index: best.index } : null;
}

/* A line id for a configured build. Lives here rather than inline in the
   configurator because a build is not a catalogue product and still needs to
   be told apart from every other build in the cart — two machines configured
   differently are two lines, and two configured identically are still two
   things somebody chose. */
let seq = 0;

export function buildId(): string {
  seq += 1;
  return `build-${Date.now().toString(36)}-${seq.toString(36)}`;
}
