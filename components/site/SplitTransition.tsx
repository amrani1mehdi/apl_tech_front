"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * A jagged bolt of light tears down the catalogue, top to bottom, and the two
 * halves fall away with the product page behind them.
 *
 * Both halves are the same page, photographed. On the way out of a click we
 * take one copy of the live DOM per half, clip each to its side of the tear,
 * and lay them over the top. Nothing has visibly happened yet — it is an exact
 * copy of what was already on screen. The router swaps the real page
 * underneath, and only once it has does the bolt come down.
 *
 * Deliberately not the View Transitions API, which this originally used: that
 * gives exactly one snapshot per name, and pieces travelling in different
 * directions need one each.
 */

/* ── geometry ── */

/** how many cuts; there is always one more piece than there are cuts */
const CUTS = 1;
/** how far the cut leans overall, as a fraction of viewport width top to bottom */
const LEAN = 0.06;

/* The tear is a run of straight segments thrown alternately to either side of
 * the line the cut would otherwise take. Five segments over the height of a
 * screen is coarse enough that each one reads as its own stroke; at ten it
 * turns back into a line with a texture.
 *
 * The swings are uneven on purpose, and always the same unevenness: a perfect
 * sawtooth reads as a graphic, and a swing drawn fresh from Math.random() each
 * time reads as a bug the first time a customer sees two different ones. */
const ZAGS = 5;
/** how far a corner is thrown off the mean line, as a fraction of viewport width */
const AMP = 0.045;
/** per-corner multipliers on that throw, one for each interior corner */
const JITTER = [1, 0.72, 0.95, 0.8];

/** how far past the top and bottom edges the bolt runs, so it enters and leaves off-screen */
const RUNUP = 160;

/* ── timing ── */

/** how long the flash takes to run the whole length of the tear */
const SLASH_MS = 380;
/** a beat at full length — without it the stroke reads as a glitch */
const HOLD_MS = 110;
const FADE_MS = 260;
/** how long the sun-glint takes to sweep the finished tear */
const SHINE_MS = 420;
/** the glint sets off while the flash is still travelling, and trails it */
const SHINE_DELAY = Math.round(SLASH_MS * 0.6);
const BOLT_MS = SLASH_MS + HOLD_MS + FADE_MS;
/** the gap between one cut and the next, should CUTS ever go back up */
const BOLT_STAGGER = 110;

/** the halves are pushed apart, not flung off-screen */
const PART_MS = 1400;
/** and they go while the flash is still travelling, not once it has landed */
const PART_DELAY = SLASH_MS + BOLT_STAGGER * (CUTS - 1) - 70;

/* How long the halves are actually watched is set here more than by PART_MS.
   Every ease-out front-loads, and the question is only by how much: an expo-out
   — `cubic-bezier(0.16, 1, 0.3, 1)`, where this started — puts about
   eighty-five per cent of the distance in its first quarter, so at 380ms the
   halves were gone inside 120 and lengthening the duration only stretched a
   tail that had already left. `(0.45, 0.75, …)` was half that, and still spent
   its first fifth crossing a third of the screen.

   This one has no kick at all: it leaves at a steady pace and settles at the
   end, which is the slowest a departure can look without stalling on the
   opening frames — and a slow start is its own failure, reading as a page
   sliding rather than as something coming apart. Past here the honest lever is
   PART_MS. */
const EASE_PART = "cubic-bezier(0, 0, 0.58, 1)";
/* Fast, but not so front-loaded that the stroke is over before it is seen: an
   earlier curve here spent seventy per cent of its distance in its first
   fifth, which at this duration is two frames. */
const EASE_SLASH = "cubic-bezier(0.25, 0.45, 0.3, 1)";
const EASE_SHINE = "cubic-bezier(0.35, 0, 0.25, 1)";

/** never hold the halves together longer than this, whatever the network does */
const MAX_HOLD_MS = 4000;

/* ── the light ──
 *
 * SVG, because the light has to lie exactly along a jagged path and a rotated
 * <div> can only ever be a straight bar.
 *
 * Each part is a blurred pair of wide strokes with sharp strokes over the top.
 * Stacking flat strokes alone — five of them, widest and faintest first — was
 * the first attempt and it bands: every stroke ends in a hard edge, and over a
 * pale product page that reads as nested ribbons rather than as a glow. One
 * blurred layer per part is three filtered surfaces for half a second, which
 * is the cheapest honest falloff available.
 *
 * Round joins are not decoration. A miter join on a stroke this wide at a
 * corner this sharp throws a spike several hundred pixels past the corner. */
const BEAM = {
  blur: 11,
  glow: [
    { width: 46, color: "rgb(168 55 214 / 0.6)" },
    { width: 15, color: "rgb(224 165 255 / 0.85)" },
  ],
  core: [
    { width: 6, color: "rgb(243 221 255 / 0.8)" },
    { width: 2.5, color: "#ffffff" },
  ],
};
/** the burst that rides the tip: dots, so round caps do the work */
const HEAD = {
  blur: 14,
  glow: [
    { width: 62, color: "rgb(191 90 242 / 0.75)" },
    { width: 27, color: "rgb(240 214 255 / 0.9)" },
  ],
  core: [{ width: 8, color: "#ffffff" }],
};
/** the light that runs the finished tear */
const GLINT = {
  blur: 7,
  glow: [{ width: 11, color: "rgb(233 205 255 / 0.7)" }],
  core: [{ width: 3, color: "rgb(255 255 255 / 0.95)" }],
};

const SVG_NS = "http://www.w3.org/2000/svg";

type Bolt = {
  root: SVGSVGElement;
  /** grouped so the hold-and-fade is one animation rather than one per stroke */
  beamG: SVGGElement;
  /** the beam's blurred half, which swells on its own as the tear lands */
  beamGlow: SVGGElement;
  headG: SVGGElement;
  glintG: SVGGElement;
  /** every stroke of each part, blurred and sharp alike, for the draw */
  beam: SVGPathElement[];
  head: SVGPathElement[];
  glint: SVGPathElement[];
  /** the path's length, and the two dash lengths measured against it */
  total: number;
  headDot: number;
  glintLen: number;
};
type Rig = { host: HTMLElement; strips: HTMLElement[]; bolts: Bolt[] };

function photograph(): Rig | null {
  if (!document.body) return null;

  /* The host is `position:fixed;inset:0`, so its box is the initial containing
     block — the viewport *without* the scrollbar. The clip percentages and the
     SVG's own coordinate system both resolve against that, so the two agree
     only if the light is measured from the same width the clips are. */
  const w = document.documentElement.clientWidth;
  const h = document.documentElement.clientHeight;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;inset:0;z-index:95;pointer-events:none;overflow:hidden;";

  /* A clone copies the whole document, so it has to be pulled up by the scroll
     position or it shows the top of the page while the reader is halfway down
     it. */
  const offset = -window.scrollY;

  /* One cut, as a run of corners from the top edge to the bottom edge, in
     fractions of the viewport — so the same numbers describe the clip polygons
     as percentages and the stroked path in pixels. The ends stay on the mean
     line: a cut that starts off it looks like it missed. */
  const at = (i: number) => (i + 1) / (CUTS + 1);
  const corners = (i: number) => {
    const pts: [number, number][] = [];
    for (let k = 0; k <= ZAGS; k++) {
      const t = k / ZAGS;
      const mid = at(i) + LEAN - 2 * LEAN * t;
      const end = k === 0 || k === ZAGS;
      const swing = end ? 0 : (k % 2 ? 1 : -1) * AMP * JITTER[(k - 1) % JITTER.length];
      pts.push([mid + swing, t]);
    }
    return pts;
  };

  /* The two clips share a boundary and each anti-aliases its own side of it,
     so two half-covered pixel edges sit over the dark host and leave a visible
     hairline down the whole page — there from the moment the copies go up,
     before the bolt exists. On an effect whose entire subject is a line of
     light arriving, a line that is already there is the worst possible
     artefact.

     Each half is grown a hair past the cut so they overlap instead of abutting.
     They are the same photograph, so the overlapping sliver is the same pixels
     drawn twice and cannot be seen — and once they part it is one pixel of the
     far side travelling with the near one, at a speed nothing is legible at. */
  const OVERLAP = 0.001;
  const edge = (pts: [number, number][], dx: number) =>
    pts.map(([x, y]) => `${((x + dx) * 100).toFixed(3)}% ${(y * 100).toFixed(3)}%`);

  const strips: HTMLElement[] = [];
  for (let i = 0; i <= CUTS; i++) {
    /* Down the left boundary, then back up the right one. */
    const left = i === 0 ? ["0% 0%", "0% 100%"] : edge(corners(i - 1), -OVERLAP);
    const right = i === CUTS ? ["100% 100%", "100% 0%"] : edge(corners(i), OVERLAP).reverse();

    const el = document.createElement("div");
    el.style.cssText =
      `position:absolute;inset:0;overflow:hidden;will-change:transform;` +
      `clip-path:polygon(${[...left, ...right].join(", ")});`;

    const inner = document.createElement("div");
    inner.style.cssText = `position:absolute;top:${offset}px;left:0;width:100vw;`;
    inner.appendChild(document.body.cloneNode(true));
    el.appendChild(inner);
    strips.push(el);
  }

  const bolts: Bolt[] = [];
  for (let i = 0; i < CUTS; i++) {
    const pts = corners(i).map(([x, y]) => [x * w, y * h] as [number, number]);

    /* Carry the first and last segments on past the edges of the screen, so
       the flash enters from off-screen and leaves the same way instead of
       starting and stopping in mid-air. */
    const beyond = (a: [number, number], b: [number, number]): [number, number] => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const m = Math.hypot(dx, dy) || 1;
      return [a[0] + (dx / m) * RUNUP, a[1] + (dy / m) * RUNUP];
    };
    const line = [
      beyond(pts[0], pts[1]),
      ...pts,
      beyond(pts[pts.length - 1], pts[pts.length - 2]),
    ];

    const d = "M " + line.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
    /* Measured rather than asked for: `getTotalLength` needs the element in a
       document and a layout to have happened, and on a polyline the sum of the
       segments is the same number without either. */
    const total = line.reduce(
      (sum, p, k) => (k ? sum + Math.hypot(p[0] - line[k - 1][0], p[1] - line[k - 1][1]) : 0),
      0,
    );
    const headDot = 0.5;
    const glintLen = Math.round(total * 0.16);

    const root = document.createElementNS(SVG_NS, "svg");
    root.setAttribute("viewBox", `0 0 ${w} ${h}`);
    /* The bolt runs past the viewBox at both ends and every stroke spills
       sideways; an <svg> clips to its own viewport unless told not to. */
    root.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;";

    const group = () => document.createElementNS(SVG_NS, "g");

    const stroke = (
      parent: SVGGElement,
      spec: { width: number; color: string },
      dash: string,
      offsetAt: number,
    ) => {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", spec.color);
      p.setAttribute("stroke-width", String(spec.width));
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      p.style.strokeDasharray = dash;
      p.style.strokeDashoffset = String(offsetAt);
      p.style.willChange = "stroke-dashoffset";
      parent.appendChild(p);
      return p;
    };

    /* One dash as long as the whole path, held one whole path-length back:
       nothing is drawn, and walking the offset to zero draws it from the top
       down. The head and the glint are the same trick with a short dash, so
       every one of them is a linear function of the same offset and they stay
       welded together under any easing. */
    const part = (
      spec: { blur: number; glow: { width: number; color: string }[]; core: { width: number; color: string }[] },
      dash: string,
      offsetAt: number,
    ) => {
      const root = group();
      const glow = group();
      glow.style.filter = `blur(${spec.blur}px)`;
      root.appendChild(glow);
      const paths = [
        ...spec.glow.map((s) => stroke(glow, s, dash, offsetAt)),
        ...spec.core.map((s) => stroke(root, s, dash, offsetAt)),
      ];
      return { root, glow, paths };
    };

    const beamPart = part(BEAM, `${total} ${total}`, total);
    const headPart = part(HEAD, `${headDot} ${total * 2}`, headDot / 2);
    const glintPart = part(GLINT, `${glintLen} ${total * 2}`, glintLen);
    headPart.root.style.opacity = "0";
    glintPart.root.style.opacity = "0";

    root.append(beamPart.root, glintPart.root, headPart.root);
    bolts.push({
      root,
      beamG: beamPart.root,
      beamGlow: beamPart.glow,
      headG: headPart.root,
      glintG: glintPart.root,
      beam: beamPart.paths,
      head: headPart.paths,
      glint: glintPart.paths,
      total,
      headDot,
      glintLen,
    });
  }

  host.append(...strips, ...bolts.map((b) => b.root));
  return { host, strips, bolts };
}

export function SplitTransition() {
  const pathname = usePathname();

  /* Refs throughout: none of this belongs in React's render output, and
     putting it there would re-render the whole app for a detached <div>. */
  const rig = useRef<Rig | null>(null);
  const raisedOn = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    rig.current?.host.remove();
    rig.current = null;
    raisedOn.current = null;
  }, []);

  const strike = useCallback(() => {
    const set = rig.current;
    if (!set) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drop();
      return;
    }

    /* Every leg records when it is due to finish, because the last one to end
       is the one that may take the copies down. That used to be assumed to be
       the strips, and once the split was sped up it no longer was: removing
       the host on the last strip cut the bolt's fade off mid-glow. */
    const running: { anim: Animation; end: number }[] = [];
    const run = (el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      running.push({
        anim: el.animate(frames, opts),
        end: Number(opts.delay ?? 0) + Number(opts.duration ?? 0),
      });
    };

    /* Easing sits on the keyframes, not on the effect.
     *
     * On the effect it warps the whole timeline, so a keyframe written at
     * `SLASH_MS / BOLT_MS` is not reached at SLASH_MS — it is reached when the
     * *eased* progress passes that fraction, which under a front-loaded curve
     * is a fraction of the time named. The stroke ran four times faster than
     * the constant naming it and the fade four times slower. Per-keyframe
     * easing shapes each leg and leaves the clock alone, so the numbers at the
     * top of this file are the numbers on screen. */
    set.bolts.forEach(({ beamG, beamGlow, headG, glintG, beam, head, glint, total, headDot, glintLen }, i) => {
      const delay = i * BOLT_STAGGER;
      const drawn = SLASH_MS / BOLT_MS;

      // the tear itself, drawn from the top down
      beam.forEach((p) =>
        run(
          p,
          [
            { strokeDashoffset: String(total), easing: EASE_SLASH },
            { strokeDashoffset: "0", offset: drawn },
            { strokeDashoffset: "0" },
          ],
          { duration: BOLT_MS, delay, fill: "forwards" },
        ),
      );

      // it holds a beat at full length, then goes
      run(
        beamG,
        [
          { opacity: 1 },
          { opacity: 1, offset: (SLASH_MS + HOLD_MS) / BOLT_MS, easing: "ease-in" },
          { opacity: 0 },
        ],
        { duration: BOLT_MS, delay, fill: "forwards" },
      );

      /* The haze swells as the tear lands. Opacity on the blurred half, not
         stroke-width: widening a stroke re-walks the path geometry every
         frame, where opacity is a compositor job. */
      run(
        beamGlow,
        [
          { opacity: 0.4, easing: "ease-out" },
          { opacity: 1, offset: drawn, easing: "ease-in" },
          { opacity: 0.55, offset: (SLASH_MS + HOLD_MS) / BOLT_MS },
          { opacity: 0.55 },
        ],
        { duration: BOLT_MS, delay, fill: "forwards" },
      );

      /* The burst, welded to the drawing tip: one dot chasing the same length
         down the same path, so it is wherever the tear has actually got to
         rather than somewhere near it. */
      head.forEach((p) =>
        run(
          p,
          [
            { strokeDashoffset: String(headDot / 2), easing: EASE_SLASH },
            { strokeDashoffset: String(headDot / 2 - total), offset: drawn },
            { strokeDashoffset: String(headDot / 2 - total) },
          ],
          { duration: BOLT_MS, delay, fill: "forwards" },
        ),
      );

      run(
        headG,
        [
          { opacity: 0.9 },
          { opacity: 1, offset: drawn, easing: "ease-out" },
          { opacity: 0, offset: (SLASH_MS + HOLD_MS * 0.7) / BOLT_MS },
          { opacity: 0 },
        ],
        { duration: BOLT_MS, delay, fill: "forwards" },
      );

      /* The sun sweep: a short dash run the length of the finished tear. It
         sets off before the flash has landed, so the two read as one movement,
         and dims on the way out so it does not outlive the light it is
         running along. */
      glint.forEach((p) =>
        run(
          p,
          [
            { strokeDashoffset: String(glintLen), easing: EASE_SHINE },
            { strokeDashoffset: String(-total) },
          ],
          { duration: SHINE_MS, delay: delay + SHINE_DELAY, fill: "forwards" },
        ),
      );

      run(
        glintG,
        [
          { opacity: 0, easing: "ease-out" },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, offset: 0.8 },
          { opacity: 0 },
        ],
        { duration: SHINE_MS, delay: delay + SHINE_DELAY, fill: "forwards" },
      );
    });

    /* The two halves go opposite ways, which is what makes it read as being
       torn in two rather than opened like a door. One travels a little further
       than the other so they are not an exact mirror, and both drift slightly
       along the cut so the whole thing looks sheared.

       They leave together. A stagger between them, which is what this had,
       gives the eye time to see them as two separate departures — at this
       speed that is the difference between a split and a shuffle. */
    set.strips.forEach((strip, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      const distance = 110 + i * 6;
      run(
        strip,
        [
          { transform: "translate(0,0)" },
          { transform: `translate(${dir * distance}%, ${dir * -2.5}%)` },
        ],
        { duration: PART_MS, delay: PART_DELAY, easing: EASE_PART, fill: "forwards" },
      );
    });

    /* Whichever leg ends last takes the copies down with it. */
    const tail = running.length ? running.reduce((a, b) => (b.end > a.end ? b : a)).anim : null;
    if (tail) {
      tail.addEventListener("finish", drop, { once: true });
      tail.addEventListener("cancel", drop, { once: true });
    } else {
      drop();
    }
  }, [drop]);

  /* ── raise the copies on the way out of a click ── */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || (anchor.target && anchor.target !== "_self")) return;

      // a product, under any locale, and not the page we are already on
      if (!/(^|\/)produit\//.test(href)) return;
      if (new URL(anchor.href, location.href).pathname === location.pathname) return;

      // one cut at a time
      if (rig.current) return;

      const built = photograph();
      if (!built) return;

      document.body.appendChild(built.host);

      /* Freeze the copies. A clone carries no JavaScript, but it still matches
         the stylesheet, so anything the page animates in CSS — the neon pulse
         on the mark, the brand marquee — starts running again the moment it is
         in the document. Cancelling pins each element where it stood when the
         copy was taken, which is also what makes the copy match the page it
         came from. */
      built.host.getAnimations({ subtree: true }).forEach((a) => a.cancel());

      rig.current = built;
      raisedOn.current = location.pathname;

      /* If the navigation never lands, cut anyway: a stalled route must not
         leave a copy of the old page pinned over the real one. */
      timer.current = setTimeout(strike, MAX_HOLD_MS);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      drop();
    };
  }, [strike, drop]);

  /* ── swing once the product page is actually behind ── */
  useEffect(() => {
    if (!rig.current) return;
    // the render that raised them still reports the path they were raised on
    if (raisedOn.current === pathname) return;
    strike();
  }, [pathname, strike]);

  return null;
}
