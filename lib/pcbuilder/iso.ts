/**
 * Isometric projection, for the assembly scene.
 *
 * The build animation shows a tower being put together, and a tower is a box
 * with boxes inside it. Drawing that by hand in SVG means authoring twenty-odd
 * polygons whose corners all have to agree about where "up" is — and the first
 * time a component moves, every one of them has to be re-derived. So the parts
 * are described where they actually live, in three dimensions, and the flat
 * shapes are computed.
 *
 * A true isometric projection, not a perspective one: parallel edges stay
 * parallel, and a part is the same size wherever it sits in the case. That is
 * what technical illustration has always used for exploded assembly drawings,
 * and it is the reason those drawings are readable — under perspective the
 * same graphics card is two different shapes depending on which slot it went
 * into, and the eye reads that as two different cards.
 */

/** cos 30° — the horizontal run of one unit along either ground axis */
export const ISO_K = Math.cos(Math.PI / 6);

/** A point in the case's own space: x across, y up, z front-to-back. */
export type P3 = readonly [number, number, number];

/**
 * Space to screen.
 *
 * The viewer stands off the +x,+y,+z corner, so: +x runs down-right, +z runs
 * down-left, +y runs straight up. Which means the face at max-x is the tower's
 * open side (where components go in), the face at max-z is its front panel,
 * and max-y is the top.
 */
export function project([x, y, z]: P3): [number, number] {
  return [(x - z) * ISO_K, (x + z) * 0.5 - y];
}

/** An SVG path through a ring of 3D points. */
export function poly(points: readonly P3[]): string {
  return (
    points
      .map((p, i) => {
        const [sx, sy] = project(p);
        return `${i === 0 ? "M" : "L"}${sx.toFixed(2)} ${sy.toFixed(2)}`;
      })
      .join("") + "Z"
  );
}

/** A line between two points in space. */
export function seg(a: P3, b: P3): string {
  const [ax, ay] = project(a);
  const [bx, by] = project(b);
  return `M${ax.toFixed(2)} ${ay.toFixed(2)}L${bx.toFixed(2)} ${by.toFixed(2)}`;
}

/** Where a point lands on screen — for placing a circle or a label. */
export const at = (p: P3): { cx: number; cy: number } => {
  const [cx, cy] = project(p);
  return { cx, cy };
};

/** A box in space: a corner and three extents. */
export type Box = {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
};

/**
 * The three faces of a box the viewer can see.
 *
 * Always the same three — top, the max-z face, and the max-x face — because
 * the camera never moves. Returned separately rather than as one silhouette so
 * each can take its own tone: three flat tones is what makes a box read as
 * solid without a single gradient, and it is how an isometric drawing has
 * always done it.
 */
export function faces(b: Box): { top: string; front: string; side: string } {
  const { x, y, z, dx, dy, dz } = b;
  const X = x + dx;
  const Y = y + dy;
  const Z = z + dz;

  return {
    top: poly([
      [x, Y, z],
      [X, Y, z],
      [X, Y, Z],
      [x, Y, Z],
    ]),
    /* the max-z face — down-left on screen, the tower's front */
    front: poly([
      [x, y, Z],
      [X, y, Z],
      [X, Y, Z],
      [x, Y, Z],
    ]),
    /* the max-x face — down-right on screen, the open side */
    side: poly([
      [X, y, z],
      [X, y, Z],
      [X, Y, Z],
      [X, Y, z],
    ]),
  };
}

/** The outline of a box, all twelve edges — for the case frame, which is drawn
    as a wireframe rather than filled so the build inside stays visible. */
export function edges(b: Box): string {
  const { x, y, z, dx, dy, dz } = b;
  const X = x + dx;
  const Y = y + dy;
  const Z = z + dz;

  const corners: Record<string, P3> = {
    a: [x, y, z], b: [X, y, z], c: [X, y, Z], d: [x, y, Z],
    e: [x, Y, z], f: [X, Y, z], g: [X, Y, Z], h: [x, Y, Z],
  };

  return [
    // floor ring
    seg(corners.a, corners.b), seg(corners.b, corners.c),
    seg(corners.c, corners.d), seg(corners.d, corners.a),
    // ceiling ring
    seg(corners.e, corners.f), seg(corners.f, corners.g),
    seg(corners.g, corners.h), seg(corners.h, corners.e),
    // uprights
    seg(corners.a, corners.e), seg(corners.b, corners.f),
    seg(corners.c, corners.g), seg(corners.d, corners.h),
  ].join("");
}

/* ── drawing on a face ──────────────────────────────────────────────────────
   Detail — a slot, a vent, a label, a stack of cooler fins — is a flat shape
   lying in one of the three planes. Rather than a second projection routine
   for flat things, each is a box with one extent set to zero, which reduces to
   exactly the face wanted. Same maths, no second implementation to keep in
   step with this one. */

/** A flat panel in the plane x = `x` — the faces that look down-right. */
export const panelX = (x: number, y: number, z: number, dy: number, dz: number): string =>
  faces({ x, y, z, dx: 0, dy, dz }).side;

/** A flat panel in the plane z = `z` — the faces that look down-left. */
export const panelZ = (x: number, y: number, z: number, dx: number, dy: number): string =>
  faces({ x, y, z, dx, dy, dz: 0 }).front;

/** A flat panel in the plane y = `y` — the ones that look up. */
export const panelY = (x: number, y: number, z: number, dx: number, dz: number): string =>
  faces({ x, y, z, dx, dy: 0, dz }).top;

/**
 * The edges of a stack of fins, cut across a box's two visible faces.
 *
 * A heatsink is the one component nobody mistakes for anything else, and it is
 * entirely legible from the line spacing alone — which makes it the cheapest
 * realism in the whole drawing. Lines rather than modelled plates: at this
 * scale a fin is under a pixel thick, and drawing each as a solid would turn
 * the stack into a grey smear.
 */
export function fins(b: Box, count: number): string {
  const out: string[] = [];
  for (let i = 1; i < count; i += 1) {
    const y = b.y + (b.dy * i) / count;
    out.push(seg([b.x + b.dx, y, b.z], [b.x + b.dx, y, b.z + b.dz]));
    out.push(seg([b.x, y, b.z + b.dz], [b.x + b.dx, y, b.z + b.dz]));
  }
  return out.join("");
}

/** Evenly spaced slots across a face in the plane z = `z` — front-panel mesh,
    top vents, the heatspreader ridges on a memory stick. */
export function slotsZ(x: number, y: number, z: number, dx: number, dy: number, count: number): string {
  const out: string[] = [];
  for (let i = 1; i < count; i += 1) {
    const at = x + (dx * i) / count;
    out.push(seg([at, y, z], [at, y + dy, z]));
  }
  return out.join("");
}

/* ── circles on a face ──
   A circle lying in a face projects to an ellipse. Rather than deriving that
   ellipse, the circle is drawn round and the face's own two screen axes are
   handed to it as a matrix. SVG does the foreshortening, and the circle stays
   a circle in the file — which is what makes it possible to move a fan without
   re-deriving an ellipse. */

/** for a circle lying in an x-plane (looking down-right) */
export const faceMatrixX = (cx: number, cy: number) => `matrix(${-ISO_K} 0.5 0 -1 ${cx} ${cy})`;
/** for a circle lying in a z-plane (looking down-left) */
export const faceMatrixZ = (cx: number, cy: number) => `matrix(${ISO_K} 0.5 0 -1 ${cx} ${cy})`;
/** for a circle lying flat in a y-plane (looking up) */
export const faceMatrixY = (cx: number, cy: number) =>
  `matrix(${ISO_K} 0.5 ${-ISO_K} 0.5 ${cx} ${cy})`;

/**
 * How far a part must travel to arrive along one of the case's own axes.
 *
 * A component that flies in from a screen direction looks pasted on; one that
 * comes down the +x axis looks like it was slid into the open side of the
 * case, because that is the move a person makes. Returns the screen offset to
 * start from, which is all the CSS needs.
 */
export function approach(axis: "x" | "y" | "z", distance: number): [number, number] {
  if (axis === "y") return [0, -distance];
  const sign = axis === "x" ? 1 : -1;
  return [sign * distance * ISO_K, distance * 0.5];
}
