"use client";

import { at, edges, faces, type Box } from "@/lib/pcbuilder/iso";
import { SHELL, VIEW_BOX } from "@/lib/pcbuilder/scene";

/**
 * The ground the conversation sits on.
 *
 * A blueprint, not a photograph and not a gradient. Every other surface in
 * this module is technical drawing — an isometric tower, fin stacks, call-out
 * leaders, millimetre clearances — and the one place a page can say what it is
 * before a word is read is the ground it is printed on.
 *
 * ─── on the composition ───
 * Everything lives in the two margins. The conversation sits on a sheet down
 * the centre, so the centre of the drawing is the one place nothing can go —
 * anything put there is either covered or fighting the copy for the same
 * pixels. The graph paper is masked to match: full strength at both edges,
 * gone through the middle.
 *
 * Two views of the same machine at two scales, one in each margin, which is
 * how a drawing sheet is actually laid out. It also means neither margin is
 * the dead one.
 *
 * ─── on the motion ───
 * Six layers, each on its own period: the sheet drifts (26s), current runs
 * each frame (9s and 14s), the junctions breathe (4s), components drift up
 * both margins (28–44s), and the tower rises and settles (19s). The periods
 * share no common multiple on purpose — fall into step and six quiet things
 * become one loud thing with a heartbeat.
 */

/**
 * The ink the whole sheet is drawn in.
 *
 * A blueprint is drawn in *a* colour, and this one was being drawn in near-
 * black at five-hundredths alpha — which is not a faint purple, it is a grey
 * so close to the page it reads as a rendering fault. The brand accent at the
 * same strengths is a drawing; the same hue as the current already running the
 * frame, the nodes, and every other accent on the page.
 *
 * Written as a function rather than as a token because these are SVG stroke
 * and fill *attributes*. `var(--color-accent)` can only be used at full
 * strength there — varying it per layer would need the token stored as bare
 * channels for `rgb(var(--x) / 0.1)`, and it is stored as a hex.
 */
const ink = (a: number) => `rgba(146,45,169,${a})`;

/** Corners of the case that read as junctions on the sheet. Each takes its own
    delay, so they breathe in sequence rather than together. */
const NODES: { x: number; y: number; z: number; d: number }[] = [
  { x: 0, y: 0, z: 0, d: 0 },
  { x: 60, y: 0, z: 0, d: 0.9 },
  { x: 60, y: 150, z: 0, d: 1.8 },
  { x: 0, y: 150, z: 140, d: 2.6 },
  { x: 60, y: 150, z: 140, d: 3.4 },
  { x: 0, y: 0, z: 140, d: 1.3 },
];

/**
 * Loose components drifting up the margins.
 *
 * The shapes are the proportions of real parts rather than generic cubes — a
 * long flat card, a tall thin memory stick, a squat supply — because at this
 * opacity proportion is the only cue left, and a field of identical boxes
 * reads as wallpaper rather than as hardware.
 *
 * Positions are fixed rather than random: a layout drawn fresh on every load
 * means two people never see the same page, and the first person to notice
 * reports it as a bug. They are kept inside the outer fifth on each side, so
 * none of them crosses under the sheet where it would only be occluded.
 */
const FLOATERS: { box: Box; cls: string; dur: number; delay: number }[] = [
  // ── start margin ──
  { box: { x: 0, y: 0, z: 0, dx: 15, dy: 5, dz: 34 }, cls: "start-[2%] top-[56%] w-24", dur: 34, delay: 0 },
  { box: { x: 0, y: 0, z: 0, dx: 4, dy: 20, dz: 5 }, cls: "start-[12%] top-[80%] w-14", dur: 28, delay: 6 },
  { box: { x: 0, y: 0, z: 0, dx: 10, dy: 3, dz: 14 }, cls: "start-[5%] top-[28%] w-16", dur: 40, delay: 2 },
  // ── end margin ──
  { box: { x: 0, y: 0, z: 0, dx: 15, dy: 17, dz: 15 }, cls: "start-[85%] top-[62%] w-20", dur: 44, delay: 11 },
  { box: { x: 0, y: 0, z: 0, dx: 20, dy: 11, dz: 26 }, cls: "start-[91%] top-[32%] w-24", dur: 31, delay: 17 },
  { box: { x: 0, y: 0, z: 0, dx: 12, dy: 4, dz: 20 }, cls: "start-[80%] top-[86%] w-16", dur: 37, delay: 23 },
];

function IsoGhost({ box }: { box: Box }) {
  const f = faces(box);
  const line = ink(0.24);
  return (
    <svg viewBox="-52 -46 104 104" className="h-auto w-full overflow-visible">
      {/* The fill is tinted rather than white: a white face on a purple
          outline over a purple wash reads as a hole punched in the sheet. */}
      <g strokeWidth={1} strokeLinejoin="round" fill="rgba(250,245,252,0.6)">
        <path d={f.front} stroke={line} />
        <path d={f.side} stroke={line} />
        <path d={f.top} stroke={line} />
      </g>
    </svg>
  );
}

/** One view of the machine. `nodes` is off on the smaller view — six pulsing
    dots on a drawing a third the size is a cluster, not a set of junctions. */
function TowerView({ nodes = false, thin = false }: { nodes?: boolean; thin?: boolean }) {
  return (
    <svg viewBox={VIEW_BOX} className="h-auto w-full overflow-visible">
      <path
        className="pcb-blueprint"
        d={edges(SHELL)}
        pathLength={1}
        fill="none"
        stroke={thin ? ink(0.22) : ink(0.28)}
        strokeWidth={thin ? 0.9 : 1.1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Current running the frame, once the frame exists to run it — the
          circuitry language the entry curtain opens on, carried through to the
          page it opens onto. */}
      <path
        className="pcb-current"
        d={edges(SHELL)}
        pathLength={1}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.6}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {!thin && (
        <path
          className="pcb-current pcb-current-b"
          d={edges(SHELL)}
          pathLength={1}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {nodes &&
        NODES.map((n) => {
          const { cx, cy } = at([n.x, n.y, n.z]);
          return (
            <circle
              key={`${n.x}-${n.y}-${n.z}`}
              className="pcb-node"
              cx={cx}
              cy={cy}
              r={2.4}
              fill="var(--color-accent)"
              style={{ animationDelay: `${5.4 + n.d}s` }}
            />
          );
        })}
    </svg>
  );
}

/**
 * @param variant
 *   `stage` — behind a full-screen takeover, scoped to the stage it sits in.
 *   `page`  — behind the result, which scrolls. Fixed, so the drawing stays
 *             put while the parts table moves over it: the board on the desk
 *             does not travel with the paper. Dimmer too, because the result
 *             is dense with content that has to win.
 */
export function Blueprint({ variant = "stage" }: { variant?: "stage" | "page" }) {
  const page = variant === "page";

  return (
    <div
      aria-hidden
      className={`pointer-events-none overflow-hidden ${
        page ? "fixed inset-0 z-0 opacity-[0.78]" : "absolute inset-0"
      }`}
    >
      {/* ── the wash ──
          Two soft pools of accent, one under each tower.

          Linework this fine needs something to sit on. On flat --color-cloud
          the sheet had to carry the whole effect on its own strokes, which is
          the trap the old near-black grid fell into: strong enough to read and
          it is a grid ruled across the page, faint enough to recede and it is
          nothing at all. A ground the drawing is *printed on* takes that job
          off the strokes, so they can stay light and still be visible.

          Positioned with logical utilities and sized as a rounded box with a
          closest-side gradient, not a blur filter — same falloff, no filter
          pass over a layer that already has six things animating on it, and
          it mirrors with the writing direction the way the towers do. */}
      <div className="absolute -bottom-[28%] -end-[18%] h-[80%] w-[62%] rounded-full bg-[radial-gradient(closest-side,rgba(146,45,169,0.17),rgba(146,45,169,0))]" />
      <div className="absolute -start-[14%] -top-[12%] h-[58%] w-[46%] rounded-full bg-[radial-gradient(closest-side,rgba(146,45,169,0.12),rgba(146,45,169,0))]" />

      {/* ── the sheet ──
          Isometric graph paper, drifting one tile down-right on a 26s loop.
          Exactly one tile, so the pattern repeats onto itself and the loop has
          no seam. */}
      <svg className="absolute inset-0 h-full w-full" width="100%" height="100%">
        <defs>
          <pattern id="pcb-iso-grid" width="52" height="30.02" patternUnits="userSpaceOnUse">
            {/* 30° each way: height ÷ width = tan 30°, which is what makes the
                cells read as cubes rather than as generic diamonds */}
            <path
              d="M0 30.02L52 0M0 0L52 30.02"
              fill="none"
              stroke={ink(0.1)}
              strokeWidth="1"
            />
          </pattern>
          {/* Full strength in both margins, nothing through the middle. The
              sheet with the conversation on it lands in that gap, so the grid
              never runs underneath the copy — and the two flanks read as the
              drawing the page is printed on rather than as a texture behind
              everything. */}
          <linearGradient id="pcb-iso-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="26%" stopColor="#fff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0" />
            <stop offset="74%" stopColor="#fff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id="pcb-iso-mask">
            <rect width="100%" height="100%" fill="url(#pcb-iso-fade)" />
          </mask>
        </defs>
        <g mask="url(#pcb-iso-mask)">
          {/* Oversized in percentages, not `calc()`. `calc()` is reliable in
              CSS but patchy as an SVG geometry *attribute*, and a rect that
              silently falls back to zero width takes the whole sheet with it.
              The overhang is what the drift walks off the edge. */}
          <rect
            className="pcb-sheet"
            x="-6%"
            y="-6%"
            width="112%"
            height="112%"
            fill="url(#pcb-iso-grid)"
          />
        </g>
      </svg>

      {/* ── loose parts drifting up both margins ──
          Halved on the result. Six things drifting past a spec table someone
          is reading prices off is a distraction; three at the extreme edges
          is a room that happens to be moving. */}
      {(page ? FLOATERS.filter((_, i) => i % 2 === 0) : FLOATERS).map((f, i) => (
        <div
          key={i}
          className={`pcb-floater absolute ${f.cls}`}
          style={{ animationDuration: `${f.dur}s`, animationDelay: `-${f.delay}s` }}
        >
          <IsoGhost box={f.box} />
        </div>
      ))}

      {/* ── the detail view, end margin ──
          Large, unfilled, running off the corner, rising and settling on a very
          long period. Outline only: a solid tower here would be a second
          drawing competing with the one the customer is about to be shown, and
          the assembly sequence has to still be the first time they see it
          built. */}
      <div
        className={`pcb-drift absolute opacity-[0.78] ${
          page
            ? "-bottom-[10%] -end-[18%] w-[min(38vw,520px)]"
            : "-bottom-[16%] -end-[12%] w-[min(46vw,620px)]"
        }`}
      >
        <TowerView nodes />
      </div>

      {/* ── the second view, start margin ──
          Smaller and higher, the way a drawing sheet carries the same object at
          more than one scale. It is what keeps the two margins balanced instead
          of one of them being the dead one. */}
      <div
        className={`pcb-drift-slow absolute hidden opacity-[0.66] lg:block ${
          page
            ? "-start-[16%] top-[12%] w-[min(24vw,300px)]"
            : "-start-[10%] top-[8%] w-[min(28vw,360px)]"
        }`}
      >
        <TowerView thin />
      </div>
    </div>
  );
}
