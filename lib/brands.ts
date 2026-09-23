/* Brand marks shown in the home marquee.
   The SVGs live in `public/brands` and are painted through a CSS mask, so a
   single `currentColor` drives them all — see `.brand-mark` in globals.css.
   Marks are from Simple Icons (CC0); the trademarks stay with their owners.

   `ratio` is the mark's own width ÷ height once cropped to its ink, and `k`
   scales that height against `--brand-size`. Regenerating: crop the viewBox
   to the path bounding box, then k = clamp(13/28, 1/sqrt(ratio), 30/28). */
export type Brand = { slug: string; name: string; ratio: number; k: number };

export const BRANDS: Brand[] = [
  { slug: "nvidia", name: "NVIDIA", ratio: 1.512, k: 0.813 },
  { slug: "amd", name: "AMD", ratio: 4.191, k: 0.488 },
  { slug: "intel", name: "Intel", ratio: 2.578, k: 0.623 },
  { slug: "republicofgamers", name: "ASUS ROG", ratio: 1.87, k: 0.731 },
  { slug: "msi", name: "MSI", ratio: 0.822, k: 1.071 },
  { slug: "razer", name: "Razer", ratio: 0.996, k: 1.002 },
  { slug: "logitechg", name: "Logitech G", ratio: 0.958, k: 1.022 },
  { slug: "corsair", name: "Corsair", ratio: 1.036, k: 0.983 },
  { slug: "acer", name: "Acer", ratio: 4.151, k: 0.491 },
  { slug: "steelseries", name: "SteelSeries", ratio: 1, k: 1 },
  { slug: "hyperx", name: "HyperX", ratio: 1.773, k: 0.751 },
  { slug: "samsung", name: "Samsung", ratio: 6.543, k: 0.464 },
  { slug: "kingstontechnology", name: "Kingston", ratio: 0.723, k: 1.071 },
  { slug: "coolermaster", name: "Cooler Master", ratio: 1.267, k: 0.889 },
];

/* ── Catalogue filter marks ───────────────────────────────────────────────
   The store's brand filter lists whatever the products actually carry, which
   is not the marquee's curated fourteen: it includes the house brand, and it
   includes names no icon set ships a mark for. This maps a product's brand
   string onto a mark where one exists — the filter falls back to a monogram
   for the rest, so a brand added to the catalogue tomorrow is never a broken
   image. New marks come from the same place as the rest: Simple Icons (CC0),
   cropped to their own ink. */
export type Mark = { slug: string; ratio: number; color?: string };

/* `color` is each brand's own, so the filter reads as a shelf of real logos
   rather than a column of ink. The values are the official ones Simple Icons
   publishes alongside the marks themselves — same source as the artwork, so
   the two cannot drift apart. Western Digital is no longer in that set; its
   logo blue comes from the brand's own palette instead.

   Optional on purpose. A brand added tomorrow with no colour on file just
   inherits the row's ink, which is the same promise the monogram makes for
   artwork: the filter degrades to something plainer, never to something
   broken. */
export const BRAND_MARKS: Record<string, Mark> = {
  NVIDIA: { slug: "nvidia", ratio: 1.512, color: "#76B900" },
  AMD: { slug: "amd", ratio: 4.191, color: "#ED1C24" },
  Intel: { slug: "intel", ratio: 2.578, color: "#0071C5" },
  ASUS: { slug: "asus", ratio: 4.843, color: "#000000" },
  MSI: { slug: "msi", ratio: 0.822, color: "#FF0000" },
  Razer: { slug: "razer", ratio: 0.996, color: "#00FF00" },
  Corsair: { slug: "corsair", ratio: 1.036, color: "#231F20" },
  Acer: { slug: "acer", ratio: 4.151, color: "#83B81A" },
  Samsung: { slug: "samsung", ratio: 6.543, color: "#1428A0" },
  NZXT: { slug: "nzxt", ratio: 3.916, color: "#000000" },
  Kingston: { slug: "kingstontechnology", ratio: 0.723, color: "#C8102E" },
  "Cooler Master": { slug: "coolermaster", ratio: 1.267, color: "#211F20" },
  Elgato: { slug: "elgato", ratio: 0.988, color: "#101010" },
  HyperX: { slug: "hyperx", ratio: 1.773 },
  "Western Digital": { slug: "westerndigital", ratio: 1.626, color: "#00529F" },
};

/**
 * Initials for a brand with no mark of its own. Two words give their two
 * first letters, one word gives its first two — "Sh" beats "S" when Shure
 * and Secretlab are three rows apart.
 */
export function monogram(name: string): string {
  const words = name.split(/[\s.]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}
