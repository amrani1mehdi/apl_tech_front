/**
 * The tower, described once — geometry and timing for the assembly scene.
 *
 * Kept out of the component because it is data, and because data can be
 * checked. An SVG that is slightly wrong does not throw: a graphics card three
 * units too long simply pokes through the side panel, and a part whose
 * approach distance is too large flies in from outside the viewBox and appears
 * from nowhere. Neither shows up in a type check and both look like a bug in
 * the animation rather than a number in a table. `auditScene()` at the bottom
 * catches them.
 */

import { project, type Box, type P3 } from "./iso";

/* ── the machine, in its own space ──
   x runs across the tower's narrow axis and is the side parts go in through;
   y is up; z is front to back. Not to scale — a real tower is far deeper
   relative to its width, and drawn honestly it reads as a filing cabinet. */

export const SHELL: Box = { x: 0, y: 0, z: 0, dx: 60, dy: 150, dz: 140 };

/** The side panel, last on and drawn over everything. */
export const GLASS: Box = { x: 57, y: 3, z: 3, dx: 2, dy: 144, dz: 134 };

/**
 * The case itself, as solid panels rather than a wireframe.
 *
 * A wireframe shows all twelve edges including the three behind the object,
 * and the eye reads that as a glass box however much detail sits inside it.
 * Panels occlude each other, so hidden lines are removed for free, and their
 * cut edges give the case the few millimetres of steel that say it is a
 * physical thing.
 *
 * `divider` is the shelf over the power supply that every case has had for a
 * decade. It stops short of the front deliberately — real shrouds have that
 * cutout, and without it the supply disappears under a lid at the exact moment
 * the customer is watching it go in.
 */
export const PANELS = {
  floor: { x: 0, y: 0, z: 0, dx: 60, dy: 3, dz: 140 },
  rear: { x: 0, y: 0, z: 0, dx: 60, dy: 150, dz: 3 },
  tray: { x: 0, y: 0, z: 0, dx: 3, dy: 150, dz: 140 },
  roof: { x: 0, y: 147, z: 0, dx: 60, dy: 3, dz: 140 },
  front: { x: 0, y: 0, z: 137, dx: 60, dy: 150, dz: 3 },
  divider: { x: 3, y: 33, z: 3, dx: 54, dy: 2, dz: 52 },
} satisfies Record<string, Box>;

export type ToneName = "steel" | "slate" | "board" | "accent" | "dark" | "ink";

/**
 * Three flat tones per part — top, the front-left face, the right-hand face.
 *
 * Three tones is what makes a box read as solid with no gradient anywhere, and
 * it is how isometric drawing has always done it. The ratios between them are
 * the same for every tone, so a pale case and a dark board are lit by the same
 * imaginary light.
 *
 * `board` is deliberately the darkest structural tone. A real motherboard is
 * nearly black, and on a white drawing a pale one gives the sockets, slots and
 * connectors laid over it nothing to read against — every detail on the tray
 * disappears into the tray.
 */
export const TONES: Record<ToneName, { top: string; front: string; side: string }> = {
  steel: { top: "#ffffff", front: "#eceaf1", side: "#dedce6" },
  slate: { top: "#eeecf2", front: "#dbd9e4", side: "#c9c7d4" },
  board: { top: "#8f8a9e", front: "#7d788c", side: "#6d687b" },
  accent: { top: "#b563c9", front: "#9a34b0", side: "#7d2690" },
  dark: { top: "#cfccd9", front: "#b8b4c4", side: "#a5a1b2" },
  /* connectors, sockets, the rear I/O block — the near-black plastic bits */
  ink: { top: "#54505f", front: "#454150", side: "#393545" },
};

export type Piece = {
  id: string;
  box: Box;
  tone: ToneName;
  /** which of the case's own axes it arrives down, and from how far */
  from: { axis: "x" | "y" | "z"; d: number };
  /** ms into the sequence */
  delay: number;
};

/**
 * Draw order is not build order.
 *
 * This array is ordered back to front so the painter's algorithm resolves
 * occlusion correctly — the board behind the card, the card behind the cooler,
 * the glass in front of everything. When a part *arrives* is set by its
 * `delay`, which is free to run in a completely different sequence, and does:
 * the supply goes in first and the graphics card second-to-last, which is the
 * order a person actually builds in.
 *
 * Sorting by depth at runtime was the first approach and it was wrong. These
 * boxes differ so much in size that no single centre-point key orders them
 * all correctly — a thin full-height board in particular sorts in front of a
 * card that is plainly sitting on top of it.
 */
export const PIECES: Piece[] = [
  { id: "mb",      box: { x: 4,  y: 38, z: 15, dx: 3,  dy: 92, dz: 105 }, tone: "board",  from: { axis: "x", d: 90 }, delay: 750 },
  { id: "psu",     box: { x: 5,  y: 5,  z: 12, dx: 45, dy: 25, dz: 72 },  tone: "dark",   from: { axis: "y", d: 70 }, delay: 500 },
  { id: "ssd",     box: { x: 7,  y: 46, z: 22, dx: 2,  dy: 10, dz: 22 },  tone: "slate",  from: { axis: "x", d: 55 }, delay: 1680 },
  { id: "cpu",     box: { x: 7,  y: 92, z: 52, dx: 5,  dy: 12, dz: 12 },  tone: "accent", from: { axis: "y", d: 55 }, delay: 1050 },
  { id: "ram-a",   box: { x: 7,  y: 90, z: 76, dx: 3,  dy: 30, dz: 4 },   tone: "accent", from: { axis: "y", d: 50 }, delay: 1450 },
  { id: "ram-b",   box: { x: 7,  y: 90, z: 84, dx: 3,  dy: 30, dz: 4 },   tone: "accent", from: { axis: "y", d: 50 }, delay: 1530 },
  /* 16 tall, not 12: a 13-unit fan pair does not fit inside a 12-unit shroud,
     and the overhang reads as the fans poking through the card. `auditScene`
     is what caught it — nothing about it is visible in a still frame. */
  { id: "gpu",     box: { x: 7,  y: 56, z: 20, dx: 19, dy: 16, dz: 88 },  tone: "accent", from: { axis: "x", d: 85 }, delay: 1850 },
  { id: "cooling", box: { x: 12, y: 84, z: 44, dx: 24, dy: 30, dz: 28 },  tone: "steel",  from: { axis: "y", d: 65 }, delay: 1250 },
];

/** Fans, placed on the max-x face of the part they belong to. */
export const FANS: { on: string; at: P3; r: number }[] = [
  { on: "gpu", at: [26, 64, 42], r: 6.5 },
  { on: "gpu", at: [26, 64, 78], r: 6.5 },
  { on: "cooling", at: [36, 99, 58], r: 10.5 },
];

export const GLASS_DELAY = 2150;
/**
 * When the fans start turning — the machine coming up, once the panel is on.
 *
 * There is no light. A purple bloom inside the case was the original ending
 * and it was wrong twice over: the drawing is a technical illustration, where
 * a glow is the one thing that cannot be measured off the page, and the module
 * sells compatibility rather than RGB. Fans that begin to spin say the machine
 * is running without claiming anything about how it looks.
 *
 * Mirrored by the fan-spin delay in globals.css.
 */
export const SPIN_DELAY = 2450;
export const ASSEMBLY_MS = 2950;

/** Computed from the shell's own corners — see `auditScene`. */
export const VIEW_BOX = "-135 -164 201 278";

/* ── the guard rail ─────────────────────────────────────────────────────── */

/** every corner of a box */
const corners = (b: Box): P3[] => {
  const out: P3[] = [];
  for (const x of [b.x, b.x + b.dx])
    for (const y of [b.y, b.y + b.dy])
      for (const z of [b.z, b.z + b.dz]) out.push([x, y, z]);
  return out;
};

const inside = (outer: Box, inner: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.z >= outer.z &&
  inner.x + inner.dx <= outer.x + outer.dx &&
  inner.y + inner.dy <= outer.y + outer.dy &&
  inner.z + inner.dz <= outer.z + outer.dz;

/**
 * Things about the scene that would look like animation bugs.
 *
 * A part outside the shell pokes through the case. A part whose projected
 * corners fall outside the viewBox is clipped. A part whose approach offset
 * starts it beyond the drawing appears out of nowhere instead of sliding in —
 * that last one is the reason this exists at all, because it is invisible in
 * every still frame and only shows up in motion.
 */
/** Do two boxes share any volume? Touching faces do not count — parts are
    supposed to sit against each other. */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.dx &&
    b.x < a.x + a.dx &&
    a.y < b.y + b.dy &&
    b.y < a.y + a.dy &&
    a.z < b.z + b.dz &&
    b.z < a.z + a.dz
  );
}

export function auditScene(): string[] {
  const problems: string[] = [];
  const [vx, vy, vw, vh] = VIEW_BOX.split(" ").map(Number);

  /* Two parts in the same place is the one error that looks like a rendering
     bug rather than a modelling one: whichever is drawn second simply wins,
     and the result is a part that appears to have swallowed its neighbour. */
  for (let i = 0; i < PIECES.length; i += 1) {
    for (let j = i + 1; j < PIECES.length; j += 1) {
      if (overlaps(PIECES[i].box, PIECES[j].box)) {
        problems.push(`${PIECES[i].id} and ${PIECES[j].id} occupy the same space`);
      }
    }
  }

  for (const piece of PIECES) {
    if (!inside(SHELL, piece.box)) problems.push(`${piece.id}: sticks out of the case`);

    for (const c of corners(piece.box)) {
      const [sx, sy] = project(c);
      if (sx < vx || sx > vx + vw || sy < vy || sy > vy + vh) {
        problems.push(`${piece.id}: a corner lands outside the viewBox at ${sx.toFixed(0)},${sy.toFixed(0)}`);
        break;
      }
    }

    if (piece.delay < 0 || piece.delay > ASSEMBLY_MS) {
      problems.push(`${piece.id}: seats at ${piece.delay}ms, outside the ${ASSEMBLY_MS}ms sequence`);
    }
  }

  /* A component inside a case panel is the bug that looks most like a
     rendering fault: the panel is drawn in a different pass, so the part is
     half-swallowed by a wall rather than sitting against it. */
  for (const [name, panel] of Object.entries(PANELS)) {
    if (!inside(SHELL, panel)) problems.push(`panel ${name}: sticks out of the case`);
    for (const piece of PIECES) {
      if (overlaps(panel, piece.box)) problems.push(`${piece.id} is buried in the ${name} panel`);
    }
  }

  if (!inside(SHELL, GLASS)) problems.push("glass: sticks out of the case");
  if (GLASS_DELAY > ASSEMBLY_MS) problems.push("glass: arrives after the sequence ends");
  if (SPIN_DELAY > ASSEMBLY_MS) problems.push("fans: start after the sequence ends");

  /* Every fan has to sit on the face of the part it belongs to, or it hangs in
     space next to it. */
  for (const fan of FANS) {
    const host = PIECES.find((p) => p.id === fan.on);
    if (!host) {
      problems.push(`fan on "${fan.on}": no such piece`);
      continue;
    }
    const faceX = host.box.x + host.box.dx;
    if (Math.abs(fan.at[0] - faceX) > 0.01) {
      problems.push(`fan on ${fan.on}: at x=${fan.at[0]}, the part's face is x=${faceX}`);
    }
    const [, fy, fz] = fan.at;
    if (fy - fan.r < host.box.y || fy + fan.r > host.box.y + host.box.dy) {
      problems.push(`fan on ${fan.on}: overhangs the part vertically`);
    }
    if (fz - fan.r < host.box.z || fz + fan.r > host.box.z + host.box.dz) {
      problems.push(`fan on ${fan.on}: overhangs the part along z`);
    }
  }

  return problems;
}
