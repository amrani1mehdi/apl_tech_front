"use client";

import { useEffect, useSyncExternalStore } from "react";
import { stagger, useAnimate, useReducedMotion } from "motion/react";
import { APL_PATHS } from "@/lib/logo";
import type { DeliveryMethod } from "@/lib/checkout/shipping";
import type { OrderStatus } from "@/lib/checkout/tracking";
import { Parcel } from "./Parcel";

/**
 * Where the parcel is, drawn — the depot on one side, the customer's door (or
 * the pickup shop) on the other, a road between them.
 *
 * Every visit plays the order's story up to now, so the picture is earned
 * rather than simply shown: the parcel lands on the dock, is loaded, and the
 * van drives the share of the road the order has covered. Then it settles into
 * the state the order is actually in —
 *
 *   being prepared    the parcel waits on the dock, a ring pulsing under it
 *   on the road       the van keeps driving: wheels turning, the road moving
 *   at a pickup point the van has arrived; the parcel waits at the shop door
 *   delivered         the parcel is set on the doorstep, the windows light,
 *                     and a tick bursts above it
 *   cancelled         the parcel never leaves the dock, marked with a cross
 *
 * The whole scene is mirrored in Arabic so the van drives in the direction the
 * page reads — except the logo on the depot, which is flipped back.
 *
 * Choreographed with `useAnimate` rather than declared per element, because
 * the steps are a sequence that depends on the order: how far the van goes,
 * whether the parcel comes back out, whether anything pops at the end. Someone
 * who asked for less motion gets the last frame of the same sequence, with no
 * loops.
 *
 * Opacity is set as an attribute, never in `style`: Motion animates an SVG
 * element's opacity through the attribute, and an inline style would win over
 * it and keep the element hidden for good.
 */

const W = 960;
const ROAD = 196; // the road's top edge — everything stands on it

const VAN = { park: 236, shipped: 430, out: 590, arrive: 640, width: 138 };
const PARCEL = { dock: 192, door: 842, ground: ROAD - 30 };
/* the progress line runs from the depot's edge to the van's centre on arrival */
const LINE = { from: 184, to: VAN.arrive + VAN.width / 2 };

type Stage = "packing" | "transit" | "waiting" | "delivered" | "cancelled";

function stageOf(status: OrderStatus, method: DeliveryMethod): { stage: Stage; vanTo: number } {
  switch (status) {
    case "shipped":
      return { stage: "transit", vanTo: VAN.shipped };
    case "out":
      return method === "pickup" ? { stage: "waiting", vanTo: VAN.arrive } : { stage: "transit", vanTo: VAN.out };
    case "delivered":
      return { stage: "delivered", vanTo: VAN.arrive };
    case "cancelled":
      return { stage: "cancelled", vanTo: VAN.park };
    default:
      return { stage: "packing", vanTo: VAN.park };
  }
}

/* eight sparks around the tick, fixed rather than random — the same burst
   every time reads as designed, a different one each time reads as noise */
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
  return { dx: Math.cos(a) * 30, dy: Math.sin(a) * 30 };
});

/* On a phone the whole road, shrunk to fit, is a strip too thin to watch. It
   shows half the road instead, twice the size, and the camera follows the van
   from the depot to the door. */
const NARROW = "(max-width: 639px)";
const NARROW_VIEW = 480;

const subscribeNarrow = (onChange: () => void) => {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Where the camera sits to keep the van in frame — 0 is the depot end. */
function cameraOn(vanX: number, view: number, dir: "ltr" | "rtl"): number {
  const travel = W - view;
  const x = Math.min(0, Math.max(-travel, view / 2 - (vanX + VAN.width / 2)));
  /* the drawing is mirrored inside the camera, so the camera pans the other way */
  return dir === "rtl" ? -travel - x : x;
}

export function DeliveryScene({
  status,
  method,
  dir,
  label,
  replay,
}: {
  status: OrderStatus;
  method: DeliveryMethod;
  dir: "ltr" | "rtl";
  /** what the scene shows, for anyone who cannot see it */
  label: string;
  /** bump to play the sequence again */
  replay: number;
}) {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<SVGSVGElement>();
  const { stage, vanTo } = stageOf(status, method);
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const view = narrow ? NARROW_VIEW : W;
  /* the opening shot always has the whole depot in it */
  const camFrom = cameraOn(0, view, dir);
  const camTo = cameraOn(vanTo, view, dir);

  useEffect(() => {
    let live = true;
    const loops: { stop: () => void }[] = [];
    const fast = Boolean(reduced);
    const d = (s: number) => (fast ? 0 : s);
    const loop = (c: { stop: () => void }) => {
      if (fast) c.stop();
      else loops.push(c);
    };

    const run = async () => {
      /* the opening frame */
      animate("[data-camera]", { x: camFrom }, { duration: 0 });
      animate("[data-van]", { x: VAN.park, opacity: stage === "cancelled" ? 0.4 : 1 }, { duration: 0 });
      animate("[data-van-body]", { y: 0 }, { duration: 0 });
      animate("[data-wheel]", { rotate: 0 }, { duration: 0 });
      animate("[data-parcel]", { x: PARCEL.dock, y: PARCEL.ground - 70, opacity: 0 }, { duration: 0 });
      animate("[data-badge]", { scale: 0, opacity: 0 }, { duration: 0 });
      animate("[data-ring]", { opacity: 0 }, { duration: 0 });
      animate("[data-spark]", { x: 0, y: 0, opacity: 0 }, { duration: 0 });
      animate("[data-light]", { opacity: 0 }, { duration: 0 });
      animate("[data-puff]", { opacity: 0 }, { duration: 0 });
      animate("[data-dash]", { strokeDashoffset: 0 }, { duration: 0 });
      /* grown from the depot end — Motion otherwise re-centres the origin */
      animate("[data-progress]", { scaleX: 0, originX: 0 }, { duration: 0 });

      /* 1 — the parcel lands on the dock */
      await animate(
        "[data-parcel]",
        { y: [PARCEL.ground - 70, PARCEL.ground], opacity: [0, 1] },
        { duration: d(0.6), ease: [0.34, 1.4, 0.64, 1], delay: d(0.25) },
      );
      if (!live) return;

      if (stage === "packing") {
        loop(animate("[data-ring]", { scale: [1, 1.8], opacity: [0.55, 0] }, { duration: 1.6, repeat: Infinity, ease: "easeOut" }));
        return;
      }

      if (stage === "cancelled") {
        await animate("[data-badge-x]", { scale: [0, 1.2, 1], opacity: [0, 1, 1] }, { duration: d(0.45) });
        return;
      }

      /* 2 — loaded into the van */
      await animate(
        "[data-parcel]",
        { x: [PARCEL.dock, VAN.park + 34], y: [PARCEL.ground, PARCEL.ground - 46, PARCEL.ground - 22], opacity: [1, 1, 0] },
        { duration: d(0.62), ease: "easeInOut" },
      );
      if (!live) return;

      /* 3 — the drive */
      const drive = fast ? 0 : 0.9 + (vanTo - VAN.park) / 260;
      const wheels = animate("[data-wheel]", { rotate: [0, 360] }, { duration: 0.45, repeat: Infinity, ease: "linear" });
      const road = animate("[data-dash]", { strokeDashoffset: [0, 36] }, { duration: 0.3, repeat: Infinity, ease: "linear" });
      const bob = animate("[data-van-body]", { y: [0, -1.6, 0] }, { duration: 0.28, repeat: Infinity, ease: "easeInOut" });
      const puff = animate(
        "[data-puff]",
        { x: [0, -16], scale: [0.5, 1.6], opacity: [0.5, 0] },
        { duration: 0.7, repeat: Infinity, ease: "easeOut", delay: stagger(0.23) },
      );
      /* Registered for cleanup the moment they start, not once the van
         arrives — a replay pressed mid-drive would otherwise leave these
         turning on top of the new run's. */
      [wheels, road, bob, puff].forEach(loop);

      animate(
        "[data-progress]",
        { scaleX: (vanTo + VAN.width / 2 - LINE.from) / (LINE.to - LINE.from) },
        { duration: drive, ease: [0.45, 0, 0.2, 1] },
      );
      animate("[data-camera]", { x: [camFrom, camTo] }, { duration: drive, ease: [0.45, 0, 0.2, 1] });
      await animate("[data-van]", { x: [VAN.park, vanTo] }, { duration: drive, ease: [0.45, 0, 0.2, 1] });
      if (!live) return;

      /* still on the road — it keeps driving where it is */
      if (stage === "transit") return;

      /* 4 — arrived */
      [wheels, road, bob, puff].forEach((c) => c.stop());
      animate("[data-puff]", { opacity: 0 }, { duration: d(0.2) });
      await animate("[data-van-body]", { y: [0, 2.5, 0] }, { duration: d(0.3), ease: "easeOut" });
      if (!live) return;

      /* 5 — the parcel to the door */
      await animate(
        "[data-parcel]",
        { x: [vanTo + 96, PARCEL.door], y: [PARCEL.ground - 22, PARCEL.ground - 58, PARCEL.ground], opacity: [0, 1, 1] },
        { duration: d(0.7), ease: "easeInOut" },
      );
      if (!live) return;

      if (stage === "waiting") {
        loop(animate("[data-ring]", { scale: [1, 1.8], opacity: [0.55, 0] }, { duration: 1.6, repeat: Infinity, ease: "easeOut" }));
        return;
      }

      /* 6 — delivered */
      animate("[data-light]", { opacity: [0, 1] }, { duration: d(0.5) });
      await animate("[data-badge-ok]", { scale: [0, 1.25, 1], opacity: [0, 1, 1] }, { duration: d(0.55), ease: "easeOut" });
      if (!live || fast) return;
      scope.current?.querySelectorAll("[data-spark]").forEach((el, i) => {
        animate(el, { x: [0, SPARKS[i].dx], y: [0, SPARKS[i].dy], opacity: [1, 0] }, { duration: 0.7, ease: "easeOut" });
      });
    };

    void run();

    return () => {
      live = false;
      loops.forEach((c) => c.stop());
    };
  }, [animate, camFrom, camTo, reduced, replay, scope, stage, vanTo]);

  const mirror = dir === "rtl" ? `translate(${W} 0) scale(-1 1)` : undefined;
  const pickup = method === "pickup";

  return (
    <svg ref={scope} viewBox={`0 44 ${view} 196`} role="img" aria-label={label} className="h-auto w-full">
      <g data-camera style={{ transform: `translateX(${camFrom}px)` }}>
        <g transform={mirror}>
          {/* ── the road ── */}
          <rect x={0} y={ROAD} width={W} height={34} className="fill-paper" />
          <line x1={0} y1={ROAD} x2={W} y2={ROAD} className="stroke-line" strokeWidth={2} />
          <line
            data-dash
            x1={0}
            y1={ROAD + 17}
            x2={W}
            y2={ROAD + 17}
            className="stroke-white"
            strokeWidth={3}
            strokeDasharray="20 16"
            strokeLinecap="round"
          />
          {/* how far the order has come */}
          <rect
            data-progress
            x={LINE.from}
            y={ROAD - 2}
            width={LINE.to - LINE.from}
            height={4}
            rx={2}
            className="fill-accent"
            style={{ transformBox: "fill-box", transformOrigin: "left center" }}
          />

          {/* ── scenery ── */}
          {[[470, 0.9], [548, 0.7]].map(([x, s]) => (
            <g key={x} transform={`translate(${x} ${ROAD}) scale(${s})`}>
              <line x1={0} y1={0} x2={0} y2={-30} className="stroke-ink" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={0} cy={-44} r={18} className="fill-white stroke-ink" strokeWidth={2.5} />
            </g>
          ))}

          {/* ── the depot ── */}
          <g transform="translate(28 56)">
            <path d="M0 48 L82 4 L164 48 Z" className="fill-accent stroke-ink" strokeWidth={2.5} strokeLinejoin="round" />
            <rect x={8} y={46} width={148} height={94} className="fill-white stroke-ink" strokeWidth={2.5} />
            <rect x={44} y={78} width={76} height={62} className="fill-paper stroke-ink" strokeWidth={2} />
            {[88, 97, 106, 115, 124, 133].map((y) => (
              <line key={y} x1={48} y1={y} x2={116} y2={y} className="stroke-line" strokeWidth={2} />
            ))}
            {/* the mark — flipped back in Arabic so it never reads backwards */}
            <g transform={dir === "rtl" ? "translate(164 0) scale(-1 1)" : undefined}>
              <g transform="translate(59 18) scale(0.0975) translate(-30 -30)" className="fill-white">
                {APL_PATHS.map((p) => (
                  <path key={p} d={p} />
                ))}
              </g>
            </g>
          </g>

          {/* ── the destination ── */}
          {pickup ? (
            <g transform="translate(790 70)">
              <rect x={0} y={46} width={140} height={80} className="fill-white stroke-ink" strokeWidth={2.5} />
              {Array.from({ length: 6 }, (_, i) => (
                <rect
                  key={i}
                  x={-6 + i * 25.3}
                  y={34}
                  width={25.3}
                  height={18}
                  className={`${i % 2 ? "fill-white" : "fill-accent"} stroke-ink`}
                  strokeWidth={2}
                />
              ))}
              {/* lockers */}
              <rect x={12} y={66} width={62} height={52} className="fill-paper stroke-ink" strokeWidth={2} />
              <line x1={43} y1={66} x2={43} y2={118} className="stroke-ink" strokeWidth={1.5} />
              {[83, 100].map((y) => (
                <line key={y} x1={12} y1={y} x2={74} y2={y} className="stroke-ink" strokeWidth={1.5} />
              ))}
              <rect data-light x={13} y={67} width={29} height={15} className="fill-accent-lit" opacity={0} />
              <rect x={88} y={76} width={38} height={50} className="fill-paper stroke-ink" strokeWidth={2} />
            </g>
          ) : (
            <g transform="translate(790 64)">
              <path d="M-10 56 L70 6 L150 56 Z" className="fill-ink stroke-ink" strokeWidth={2.5} strokeLinejoin="round" />
              <rect x={0} y={52} width={140} height={80} className="fill-white stroke-ink" strokeWidth={2.5} />
              {[16, 100].map((x) => (
                <g key={x}>
                  <rect x={x} y={70} width={24} height={22} className="fill-paper stroke-ink" strokeWidth={2} />
                  <rect data-light x={x + 1} y={71} width={22} height={20} className="fill-accent-lit" opacity={0} />
                  <line x1={x + 12} y1={70} x2={x + 12} y2={92} className="stroke-ink" strokeWidth={1.5} />
                </g>
              ))}
              <rect x={56} y={88} width={28} height={44} className="fill-paper stroke-ink" strokeWidth={2} />
              <circle cx={78} cy={111} r={1.8} className="fill-ink" />
            </g>
          )}

          {/* ── the van ── */}
          <g transform={`translate(0 ${ROAD - 74})`}>
            {/* Opening positions set inline as well, so the first paint — before the
                sequence starts — never shows the van or the parcel at the origin. */}
            <g data-van style={{ transform: `translateX(${VAN.park}px)` }}>
              {/* exhaust, behind the van */}
              {[0, 1, 2].map((i) => (
                <circle key={i} data-puff cx={-4} cy={54} r={4} className="fill-ink/15" opacity={0} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
              ))}
              <g data-van-body>
                <rect x={0} y={4} width={96} height={54} rx={6} className="fill-white stroke-ink" strokeWidth={2.5} />
                <rect x={1.5} y={40} width={93} height={7} className="fill-accent" />
                <path
                  d="M96 18 H118 Q127 18 131 27 L138 40 V58 H96 Z"
                  className="fill-white stroke-ink"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
                <path d="M102 24 H116 Q122 24 125 30 L130 40 H102 Z" className="fill-paper stroke-ink" strokeWidth={2} strokeLinejoin="round" />
                <rect x={133} y={45} width={5} height={5} rx={1} className="fill-accent-lit" />
                <line x1={0} y1={58} x2={138} y2={58} className="stroke-ink" strokeWidth={2.5} />
              </g>
              {[26, 112].map((cx) => (
                <g key={cx} transform={`translate(${cx} 62)`}>
                  <g data-wheel style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                    <circle r={12} className="fill-ink" />
                    <circle r={5} className="fill-white" />
                    <line x1={-9} y1={0} x2={9} y2={0} className="stroke-white" strokeWidth={2} />
                  </g>
                </g>
              ))}
            </g>
          </g>

          {/* ── the parcel, with what travels with it ── */}
          <g data-parcel opacity={0} style={{ transform: `translate(${PARCEL.dock}px, ${PARCEL.ground}px)` }}>
            {/* the waiting ring, on the ground under it */}
            <ellipse
              data-ring
              cx={18}
              cy={30}
              rx={26}
              ry={6}
              className="fill-none stroke-accent"
              strokeWidth={2.5}
              opacity={0}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
            <Parcel />

            {/* delivered */}
            <g data-badge data-badge-ok opacity={0} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
              <circle cx={18} cy={-24} r={15} className="fill-accent" />
              {/* flipped back in Arabic, like the mark — a mirrored tick reads as a chevron */}
              <g transform={dir === "rtl" ? "translate(36 0) scale(-1 1)" : undefined}>
                <path d="M11 -24 L16 -19 L25 -29" className="fill-none stroke-white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
            {SPARKS.map((_, i) => (
              <circle key={i} data-spark cx={18} cy={-24} r={2.6} className="fill-accent-lit" opacity={0} />
            ))}

            {/* cancelled */}
            <g data-badge data-badge-x opacity={0} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
              <circle cx={18} cy={-24} r={15} className="fill-alert" />
              <path d="M12 -30 L24 -18 M24 -30 L12 -18" className="fill-none stroke-white" strokeWidth={3} strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
