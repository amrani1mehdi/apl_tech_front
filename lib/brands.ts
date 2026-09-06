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
