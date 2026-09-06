"use client";

import { useEffect, useRef, useState } from "react";
import { Divider } from "./Section";
import { useLocale } from "@/components/i18n/LocaleProvider";

/* ── Isometric frame ───────────────────────────────────────────────────────
   One origin plus three basis vectors, so every edge is placed in board
   coordinates (along the card, across it, down through it) rather than by
   eye. That mattered in a shaded render; in a line drawing it is the whole
   game — parallels that are only nearly parallel read instantly as a
   mistake, and there is no shading left to hide behind. */
const O = [190, 220] as const;
const U = [50, -13] as const; // along the card's length
const V = [26, 20] as const; // across its depth
const D = [0, 70] as const; // thickness, downward

const f = (n: number) => Math.round(n * 100) / 100;
const at = (u: number, v: number, d = 0): [number, number] => [
  f(O[0] + u * U[0] + v * V[0] + d * D[0]),
  f(O[1] + u * U[1] + v * V[1] + d * D[1]),
];
const poly = (...pts: [number, number][]) => pts.map((p) => `${p[0]},${p[1]}`).join(" ");
/** rectangle on a plane parallel to the top, in board coords */
const face = (u0: number, v0: number, u1: number, v1: number, d = 0) =>
  poly(at(u0, v0, d), at(u1, v0, d), at(u1, v1, d), at(u0, v1, d));
/** the +v (front) face of a box, between two depths */
const front = (u0: number, u1: number, v: number, d0: number, d1: number) =>
  poly(at(u0, v, d0), at(u1, v, d0), at(u1, v, d1), at(u0, v, d1));

const uLen = Math.hypot(U[0], U[1]);
const vLen = Math.hypot(V[0], V[1]);
/** maps a unit circle onto the top plane, so the fans read as true ellipses */
const onPlane = (u: number, v: number) => {
  const [cx, cy] = at(u, v);
  return `matrix(${f(U[0] / uLen)} ${f(U[1] / uLen)} ${f(V[0] / vLen)} ${f(V[1] / vLen)} ${cx} ${cy})`;
};

/* ── The card ─────────────────────────────────────────────────────────────
   10 × 4 × 1 board units — roughly a 310 mm dual-slot card, the size the
   caption under the drawing quotes. */
const LEN = 10;
const DEPTH = 4;

/* ── Fans ──
   Radius is capped by the card's own depth: the shroud ring has to clear
   both long edges, which is exactly the constraint a real cooler is built
   against too. */
const FAN_R = 50;
const RING_R = 56;
const HUB_R = 0.3;
const TIP_R = 0.96;
const BLADES = 11;
const FANS = [
  { u: 3.15, cls: "gpu-spin-a" },
  { u: 6.55, cls: "gpu-spin-b" },
];

const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (r: number, deg: number): [number, number] => [
  f(r * Math.cos(rad(deg))),
  f(r * Math.sin(rad(deg))),
];

/** One swept blade: hub → leading edge → tip arc → trailing edge. The tip
    leads the root by `sweep`, which is what makes it read as a fan rather
    than a paddle wheel. */
function blade(span: number, sweep: number) {
  const rh = HUB_R * FAN_R;
  const rt = TIP_R * FAN_R;
  const mid = rh + (rt - rh) * 0.55;
  const out = rh + (rt - rh) * 0.86;
  const [h0x, h0y] = pt(rh, 0);
  const [h1x, h1y] = pt(rh, span);
  const [t0x, t0y] = pt(rt, sweep);
  const [t1x, t1y] = pt(rt, sweep + span * 0.66);
  const [c1x, c1y] = pt(mid, sweep * 0.2);
  const [c2x, c2y] = pt(out, sweep * 0.74);
  const [c3x, c3y] = pt(out, sweep + span * 0.92);
  const [c4x, c4y] = pt(mid, span + sweep * 0.34);
  return [
    `M ${h0x} ${h0y}`,
    `C ${c1x} ${c1y} ${c2x} ${c2y} ${t0x} ${t0y}`,
    `A ${rt} ${rt} 0 0 1 ${t1x} ${t1y}`,
    `C ${c3x} ${c3y} ${c4x} ${c4y} ${h1x} ${h1y}`,
    "Z",
  ].join(" ");
}

/* ── Heatsink comb ──
   The fin block is cut by a curve rather than a straight rule: it is the one
   line on the card that is not on the isometric grid, so it carries all the
   drawing's movement. Frame and fins are sampled from the same function, so
   the tops sit exactly on the cut. */
const COMB = { u0: 1.15, u1: 8.6, foot: 0.93, fins: 50, steps: 48 };
/* Rises fast off the left end and then levels — the shape a shroud cut takes
   when it has to clear the first fan and then run flat to the far end. */
const combTop = (t: number) => 0.44 - 0.22 * (1 - (1 - t) ** 2.2);
const combAt = (t: number, d?: number) =>
  at(COMB.u0 + t * (COMB.u1 - COMB.u0), DEPTH, d ?? combTop(t));

const combFrame = (() => {
  const top = Array.from({ length: COMB.steps + 1 }, (_, i) => combAt(i / COMB.steps));
  return `M ${top.map((p) => `${p[0]} ${p[1]}`).join(" L ")} L ${combAt(1, COMB.foot).join(" ")} L ${combAt(0, COMB.foot).join(" ")} Z`;
})();

/* ── Callouts ──
   Pin sits on the part, label sits clear of the drawing. Leaders leave in
   five different directions so none of them crosses the card. */
const TAGS: {
  k: string;
  pin: [number, number];
  label: [number, number];
  anchor: "start" | "middle" | "end";
  d: string;
}[] = [
  { k: "pcie", pin: [362, 168], label: [300, 108], anchor: "end", d: "1.95s" },
  { k: "power", pin: [700, 118], label: [762, 74], anchor: "start", d: "2.2s" },
  { k: "heatsink", pin: [700, 232], label: [846, 288], anchor: "start", d: "2.45s" },
  { k: "fans", pin: [525, 136], label: [520, 56], anchor: "middle", d: "2.7s" },
  { k: "outputs", pin: [232, 300], label: [150, 404], anchor: "end", d: "2.95s" },
];

/* The plate is drawn inside a box wide enough for the callouts to sit clear of
   it. Both boxes are cropped to what is actually in them — the wide one to the
   topmost and lowest label, the narrow one to the card — because any slack
   here is height the section charges the reader for and shows nothing in.
   Below the breakpoint where the labels are dropped, their side gutters are a
   third of the width, so the narrow box drops those too. */
const PLATE = "0 26 980 396";
const PLATE_TIGHT = "175 80 629 313";

export function Anatomy() {
  const { t, dir } = useLocale();
  const [armed, setArmed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  /** the ambient loops (fans, light bar, float) only run while on screen */
  const [live, setLive] = useState(false);
  const [tight, setTight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      return;
    }
    // armed is client-only, so server HTML renders the plate complete rather
    // than blank if the observer never runs
    setArmed(true);
    const narrow = window.matchMedia("(max-width: 640px)");
    const syncBox = () => setTight(narrow.matches);
    syncBox();
    narrow.addEventListener("change", syncBox);
    // Stays connected rather than disconnecting on first sight: `drawn` is
    // one-way (the plate inks itself once) but `live` tracks visibility so the
    // infinite animations stop costing frames once it scrolls away.
    let heard = false;
    const io = new IntersectionObserver(
      (entries) => {
        heard = true;
        const visible = entries.some((e) => e.isIntersecting);
        setLive(visible);
        if (visible) setDrawn(true);
      },
      { rootMargin: "200px 0px 200px 0px" },
    );
    io.observe(el);
    const bail = setTimeout(() => {
      if (!heard) {
        setDrawn(true);
        setLive(true);
      }
    }, 1200);
    return () => {
      io.disconnect();
      clearTimeout(bail);
      narrow.removeEventListener("change", syncBox);
    };
  }, []);

  return (
    <section className="relative overflow-hidden py-12 lg:py-16">
      <Divider index="03" label={t("sec.anat.divider")} />

      <div
        ref={ref}
        data-armed={armed || undefined}
        data-drawn={drawn || undefined}
        data-live={(drawn && live) || undefined}
        className="gpu mx-auto mt-6 max-w-[1320px] px-5 lg:mt-8 lg:px-8"
      >
        <svg
          viewBox={tight ? PLATE_TIGHT : PLATE}
          className="gpu-svg mx-auto w-full max-w-[1040px]"
          role="img"
          aria-label={t("sec.anat.alt")}
        >
          <g className="gpu-body">
            {/* ── PCIe fingers ──
                Drawn wholly outside the board's far edge, so nothing of the
                card has to be erased to sit them behind it. */}
            <g className="gpu-part" style={{ ["--d" as string]: "1.05s" }}>
              <polyline
                className="gpu-ink gpu-w3"
                pathLength={1}
                points={poly(at(1.45, 0), at(1.45, -0.42), at(6.5, -0.42), at(6.5, 0))}
              />
              <g className="gpu-detail" style={{ ["--d" as string]: "1.25s" }}>
                {/* the key notch, then the contacts either side of it */}
                <polyline
                  className="gpu-ink gpu-w3"
                  points={poly(at(2.62, -0.42), at(2.62, -0.14), at(2.92, -0.14), at(2.92, -0.42))}
                />
                {Array.from({ length: 17 }, (_, i) => {
                  const u = 1.58 + i * 0.28;
                  if (u > 2.44 && u < 3.02) return null;
                  return (
                    <polygon
                      key={i}
                      className="gpu-ink gpu-w4"
                      points={poly(
                        at(u, -0.36),
                        at(u + 0.15, -0.36),
                        at(u + 0.15, -0.07),
                        at(u, -0.07),
                      )}
                    />
                  );
                })}
              </g>
            </g>

            {/* ── shell ──
                Silhouette carries the heaviest line; the two interior corners
                that face the viewer are a step lighter, which is what tells
                the eye which edges are against the paper. */}
            <g className="gpu-part" style={{ ["--d" as string]: "0s" }}>
              <polygon
                className="gpu-ink gpu-w1"
                pathLength={1}
                points={poly(
                  at(0, 0),
                  at(LEN, 0),
                  at(LEN, DEPTH),
                  at(LEN, DEPTH, 1),
                  at(0, DEPTH, 1),
                  at(0, 0, 1),
                )}
              />
              <polyline
                className="gpu-ink gpu-w2"
                pathLength={1}
                points={poly(at(0, 0, 1), at(0, 0), at(0, DEPTH), at(LEN, DEPTH))}
              />
              <line
                className="gpu-ink gpu-w2"
                pathLength={1}
                x1={at(0, DEPTH)[0]}
                y1={at(0, DEPTH)[1]}
                x2={at(0, DEPTH, 1)[0]}
                y2={at(0, DEPTH, 1)[1]}
              />
            </g>

            {/* ── shroud plate, chamfered at the corners ── */}
            <g className="gpu-part" style={{ ["--d" as string]: "0.2s" }}>
              <polygon
                className="gpu-ink gpu-w2"
                pathLength={1}
                points={poly(
                  at(0.22, 0.52),
                  at(0.52, 0.22),
                  at(9.48, 0.22),
                  at(9.78, 0.52),
                  at(9.78, 3.48),
                  at(9.48, 3.78),
                  at(0.52, 3.78),
                  at(0.22, 3.48),
                )}
              />
              <line
                className="gpu-ink gpu-w3"
                pathLength={1}
                x1={at(1.15, 0.28)[0]}
                y1={at(1.15, 0.28)[1]}
                x2={at(1.15, 3.72)[0]}
                y2={at(1.15, 3.72)[1]}
              />
              <g className="gpu-detail" style={{ ["--d" as string]: "0.5s" }}>
                {[
                  [0.75, 0.62],
                  [0.75, 3.38],
                  [9.25, 0.62],
                  [9.25, 3.38],
                ].map(([u, v]) => (
                  <g key={`${u}-${v}`} transform={onPlane(u, v)}>
                    <circle className="gpu-ink gpu-w3" r="7.5" />
                    <circle className="gpu-ink gpu-w4" r="3.4" />
                    <line className="gpu-ink gpu-w4" x1="-5.6" y1="0" x2="5.6" y2="0" />
                    <line className="gpu-ink gpu-w4" x1="0" y1="-5.6" x2="0" y2="5.6" />
                  </g>
                ))}
              </g>
            </g>

            {/* ── heatsink comb ── */}
            <g className="gpu-part" style={{ ["--d" as string]: "0.38s" }}>
              <path className="gpu-ink gpu-w2" pathLength={1} d={combFrame} />
              <g className="gpu-detail" style={{ ["--d" as string]: "0.72s" }}>
                {Array.from({ length: COMB.fins }, (_, i) => {
                  const t = (i + 0.5) / COMB.fins;
                  const a = combAt(t, combTop(t) + 0.035);
                  const b = combAt(t, COMB.foot - 0.03);
                  return (
                    <line
                      key={i}
                      className="gpu-ink gpu-w4"
                      x1={a[0]}
                      y1={a[1]}
                      x2={b[0]}
                      y2={b[1]}
                    />
                  );
                })}
              </g>
            </g>

            {/* ── the trim groove along the shroud's front lip ── */}
            <g className="gpu-part" style={{ ["--d" as string]: "1.2s" }}>
              <polygon
                className="gpu-ink gpu-w3"
                pathLength={1}
                points={front(0.75, 9.25, DEPTH, 0.04, 0.11)}
              />
            </g>

            {/* ── fans ──
                Blades are filled with the page, so an overlapping blade
                occludes the one under it without any hidden-line work. */}
            <g className="gpu-part" style={{ ["--d" as string]: "0.55s" }}>
              {FANS.map(({ u, cls }) => (
                <g key={u} transform={onPlane(u, 2)}>
                  <circle className="gpu-ink gpu-w2" pathLength={1} r={RING_R} />
                  <circle className="gpu-ink gpu-w3" pathLength={1} r={FAN_R} />

                  <g className="gpu-detail" style={{ ["--d" as string]: "0.85s" }}>
                    <g className={cls}>
                      {Array.from({ length: BLADES }, (_, i) => (
                        <path
                          key={i}
                          className="gpu-ink gpu-w3 gpu-blade"
                          d={blade(24, 30)}
                          transform={`rotate(${f((i * 360) / BLADES)})`}
                        />
                      ))}
                    </g>
                    <circle className="gpu-ink gpu-w3 gpu-blade" r={HUB_R * FAN_R} />
                    <circle className="gpu-ink gpu-w4" r={HUB_R * FAN_R * 0.42} />
                  </g>
                </g>
              ))}
            </g>

            {/* ── 8-pin power ── */}
            <g className="gpu-part" style={{ ["--d" as string]: "0.9s" }}>
              <polygon
                className="gpu-ink gpu-w2"
                pathLength={1}
                points={poly(
                  at(8.5, 1.05, -0.32),
                  at(9.5, 1.05, -0.32),
                  at(9.5, 2.95, -0.32),
                  at(9.5, 2.95, 0),
                  at(8.5, 2.95, 0),
                  at(8.5, 1.05, -0.32),
                )}
              />
              <polyline
                className="gpu-ink gpu-w3"
                pathLength={1}
                points={poly(at(8.5, 2.95, -0.32), at(9.5, 2.95, -0.32))}
              />
              <line
                className="gpu-ink gpu-w3"
                pathLength={1}
                x1={at(8.5, 2.95, -0.32)[0]}
                y1={at(8.5, 2.95, -0.32)[1]}
                x2={at(8.5, 2.95, 0)[0]}
                y2={at(8.5, 2.95, 0)[1]}
              />
              <g className="gpu-detail" style={{ ["--d" as string]: "1.15s" }}>
                {Array.from({ length: 8 }, (_, i) => {
                  const u = 8.66 + (i % 4) * 0.23;
                  const v = 1.35 + Math.floor(i / 4) * 0.72;
                  return (
                    <polygon
                      key={i}
                      className="gpu-ink gpu-w4"
                      points={face(u, v, u + 0.15, v + 0.5, -0.32)}
                    />
                  );
                })}
              </g>
            </g>

            {/* ── I/O bracket ──
                Sits a hair proud of the card's end plane and is filled with
                the page, so it occludes the corner behind it the way the real
                plate does. */}
            <g className="gpu-part" style={{ ["--d" as string]: "0.75s" }}>
              <polygon
                className="gpu-ink gpu-w1 gpu-plate"
                pathLength={1}
                points={poly(
                  at(-0.1, 0, -0.26),
                  at(-0.1, DEPTH, -0.26),
                  at(-0.1, DEPTH, 1.16),
                  at(-0.1, 0, 1.16),
                )}
              />
              <g className="gpu-detail" style={{ ["--d" as string]: "1.05s" }}>
                {/* three DisplayPorts over one HDMI */}
                {[0.42, 1.62, 2.82].map((v) => (
                  <polygon
                    key={v}
                    className="gpu-ink gpu-w3"
                    points={poly(
                      at(-0.1, v, 0.06),
                      at(-0.1, v + 0.76, 0.06),
                      at(-0.1, v + 0.76, 0.4),
                      at(-0.1, v, 0.4),
                    )}
                  />
                ))}
                <polygon
                  className="gpu-ink gpu-w3"
                  points={poly(
                    at(-0.1, 1.05, 0.56),
                    at(-0.1, 2.2, 0.56),
                    at(-0.1, 2.2, 0.9),
                    at(-0.1, 1.05, 0.9),
                  )}
                />
                {/* vent slots below the ports */}
                {Array.from({ length: 9 }, (_, i) => {
                  const v = 2.45 + i * 0.16;
                  return (
                    <line
                      key={i}
                      className="gpu-ink gpu-w4"
                      x1={at(-0.1, v, 0.58)[0]}
                      y1={at(-0.1, v, 0.58)[1]}
                      x2={at(-0.1, v, 1.04)[0]}
                      y2={at(-0.1, v, 1.04)[1]}
                    />
                  );
                })}
              </g>
            </g>

            {/* callout ticks — each draws out after the plate has inked */}
            {TAGS.map(({ k, pin, label, anchor, d }) => (
              <g key={k} className="gpu-tag" style={{ ["--cd" as string]: d }}>
                <line
                  className="gpu-tag-line"
                  x1={pin[0]}
                  y1={pin[1]}
                  x2={label[0]}
                  y2={label[1]}
                  pathLength={1}
                />
                <circle className="gpu-tag-dot" cx={pin[0]} cy={pin[1]} r="3.5" />
                <text
                  className="gpu-tag-text"
                  x={label[0] + (anchor === "start" ? 9 : anchor === "end" ? -9 : 0)}
                  y={label[1] + (anchor === "middle" ? -8 : 4)}
                  textAnchor={
                    dir === "rtl" && anchor !== "middle"
                      ? anchor === "start"
                        ? "end"
                        : "start"
                      : anchor
                  }
                >
                  {t(`anat.${k}.n`)}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}
