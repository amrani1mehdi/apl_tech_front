import { writeFileSync, mkdirSync } from "node:fs";

/**
 * Cover tiles for the titles that have no supplied artwork.
 *
 * Six of the thirteen now carry the publisher's own mark, provided by the
 * shop, and are not generated here — deleting a game from the table below is
 * how a title graduates from a drawn tile to a real one. The rest are drawn
 * from scratch: one saturated ground per title and one bold geometric
 * mark that points at the *genre* rather than imitating anyone's logo.
 *
 * Drawn at 3:2 to match the tile they are shown in, so a generated tile and a
 * supplied logo sit in the same row without one looking letterboxed against
 * the other. Sized for roughly 74px wide. At that
 * size detail is invisible and thin strokes disappear, so each mark is two to
 * four shapes at a heavy weight and nothing else. A cover that needs to be
 * enlarged to be recognised is not doing its job in a list.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** repo-relative, so the script runs from anywhere */
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "games");

/** ground: a dark saturated wash, so a white mark reads at any size */
const ground = (h, s = 52) => `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${h} ${s}% 34%)"/>
      <stop offset="100%" stop-color="hsl(${(h + 18) % 360} ${s + 8}% 17%)"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#g)"/>`;

const W = "#ffffff";
const stroke = (d, w = 24, extra = "") =>
  `<path d="${d}" fill="none" stroke="${W}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

/* Each mark is built around the same 200×200 box centred on the tile, so the
   set reads as one family however different the shapes are. */
const GAMES = {
  /* tactical shooter — a hard crosshair, four bars and a centre pip */
  /* the other tactical shooter — a ringed reticle, so the two never read alike */
  /* MOBA — a rune, angular and symmetrical */
  lol: {
    h: 205,
    art: `
      ${stroke("M200 84 314 150V266L200 332 86 266V150Z", 22)}
      ${stroke("M200 156 258 190V258L200 292 142 258V190Z", 18)}`,
  },
  /* cars and a ball */
  /* football — a pentagon on a round field */
  fc: {
    h: 132,
    art: `
      <circle cx="200" cy="200" r="118" fill="none" stroke="${W}" stroke-width="22"/>
      <path d="M200 128 262 173 238 246H162L138 173Z" fill="${W}"/>`,
  },
  /* battle royale — an apex, one triangle inside another */
  apex: {
    h: 2,
    art: `
      ${stroke("M200 92 322 302H78Z", 24)}
      ${stroke("M200 188 250 274H150Z", 20)}`,
  },
  /* the storm closing in */
  /* the drop — a canopy and its lines */
  pubg: {
    h: 40,
    art: `
      ${stroke("M84 210A116 116 0 0 1 316 210", 24)}
      ${stroke("M110 222 196 300", 18)}${stroke("M290 222 204 300", 18)}
      ${stroke("M200 300V332", 18)}`,
  },
  /* open-world city — a skyline */
  gta5: {
    h: 166,
    art: `
      <rect x="92" y="196" width="56" height="132" fill="${W}"/>
      <rect x="170" y="128" width="60" height="200" fill="${W}"/>
      <rect x="252" y="172" width="56" height="156" fill="${W}"/>
      <circle cx="286" cy="106" r="30" fill="${W}"/>`,
  },
  /* blocks — the one place an isometric cube is the obvious answer */
  minecraft: {
    h: 104,
    art: `
      <path d="M200 96 306 156 200 216 94 156Z" fill="${W}"/>
      <path d="M94 156 200 216V330L94 270Z" fill="${W}" opacity="0.72"/>
      <path d="M306 156 200 216V330L306 270Z" fill="${W}" opacity="0.46"/>`,
  },
  /* the ring */
  eldenring: {
    h: 44,
    art: `
      <circle cx="200" cy="200" r="112" fill="none" stroke="${W}" stroke-width="22"
              stroke-dasharray="440 264" transform="rotate(-56 200 200)"/>
      <circle cx="200" cy="200" r="44" fill="${W}"/>`,
  },
  /* the supply crate */
  /* circuitry, hard angles */
};

mkdirSync(OUT, { recursive: true });

for (const [id, { h, art }] of Object.entries(GAMES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400" role="img" aria-label="${id}">${ground(h)}<g transform="translate(100,0)">${art}</g></svg>`;
  writeFileSync(`${OUT}/${id}.svg`, svg.replace(/\n\s+/g, "\n  ").trim() + "\n", "utf8");
  console.log(`  ${id}.svg`);
}
console.log(`\n${Object.keys(GAMES).length} tiles written to ${OUT}`);
