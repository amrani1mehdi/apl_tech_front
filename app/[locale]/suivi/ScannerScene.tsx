"use client";

import { useEffect, useId } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { Parcel } from "./Parcel";

/**
 * What the scanner is doing, as the form sees it —
 *
 *   idle      nothing entered: the parcel floats above the plate
 *   ready     something entered, attention elsewhere: settled, framed, waiting
 *   reading   a field in use: a slow sweep, the label being typed flashing
 *   scanning  the search: a fast sweep, the plate filling like a progress bar
 *   found     a tick bursts from the parcel before the order opens
 *   miss      the frame turns red, a cross, one shake
 */
export type ScanPhase = "idle" | "ready" | "reading" | "scanning" | "found" | "miss";

/**
 * The lookup's illustration — a parcel on the scanner, read as the customer
 * types.
 *
 * The two fields map onto the parcel's two labels: the order number is its
 * barcode, the phone its address label. A keystroke flashes the label it
 * writes, and a label gets its tick the moment its field is valid — so the
 * drawing answers "is this right?" before the button is pressed.
 *
 * `missKey` increments on every miss, so a second wrong number shakes again
 * rather than doing nothing because the state was already "miss".
 */
export function ScannerScene({
  phase,
  numberOk,
  phoneOk,
  numberKeys,
  phoneKeys,
  missKey,
}: {
  phase: ScanPhase;
  numberOk: boolean;
  phoneOk: boolean;
  /** bumped on every change to the number field */
  numberKeys: number;
  /** bumped on every change to the phone field */
  phoneKeys: number;
  missKey: number;
}) {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<SVGSVGElement>();
  const glow = `${useId()}-glow`;

  const framed = phase !== "idle";
  const sweeping = !reduced && (phase === "reading" || phase === "scanning");

  /* a keystroke lights the label it writes */
  useEffect(() => {
    if (numberKeys === 0 || reduced) return;
    animate("[data-flash-number]", { opacity: [0.85, 0] }, { duration: 0.45, ease: "easeOut" });
  }, [animate, numberKeys, reduced]);

  useEffect(() => {
    if (phoneKeys === 0 || reduced) return;
    animate("[data-flash-phone]", { opacity: [0.85, 0] }, { duration: 0.45, ease: "easeOut" });
  }, [animate, phoneKeys, reduced]);

  /* the shake */
  useEffect(() => {
    if (missKey === 0 || reduced) return;
    animate("[data-box]", { x: [0, -9, 8, -6, 4, 0] }, { duration: 0.5, ease: "easeInOut" });
  }, [animate, missKey, reduced]);

  return (
    <svg ref={scope} viewBox="0 58 320 176" className="h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={glow} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-accent-lit)", stopOpacity: 0 }} />
          <stop offset="0.5" style={{ stopColor: "var(--color-accent-lit)", stopOpacity: 0.4 }} />
          <stop offset="1" style={{ stopColor: "var(--color-accent-lit)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      {/* the plate's shadow, breathing with the float */}
      <motion.ellipse
        cx={160}
        cy={214}
        rx={92}
        ry={9}
        className="fill-ink/10"
        /* narrowed with a transform, not by animating `rx` — Motion writes an
           animated SVG attribute directly, and between loops it can write an
           empty one */
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={reduced || phase !== "idle" ? { scaleX: 1, opacity: 1 } : { scaleX: [1, 0.87, 1], opacity: [1, 0.7, 1] }}
        transition={!reduced && phase === "idle" ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      />

      {/* ── the scanner plate ── */}
      <rect x={64} y={186} width={192} height={18} rx={9} className="fill-ink" />
      <rect x={84} y={192} width={152} height={4} rx={2} className="fill-accent" opacity={0.8} />
      {phase === "scanning" && !reduced && (
        <motion.rect
          x={84}
          y={192}
          width={152}
          height={4}
          rx={2}
          className="fill-accent-lit"
          style={{ originX: 0 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* Keyed by phase, so a loop restarts when the phase changes — and
          prefixed, because the beam below is keyed the same way and siblings
          sharing a key are never cleaned up. */}
      <motion.circle
        key={`led-${phase}`}
        cx={244}
        cy={195}
        r={3}
        className={phase === "miss" ? "fill-alert" : "fill-accent-lit"}
        animate={
          !reduced && (phase === "reading" || phase === "scanning" || phase === "miss")
            ? { opacity: [1, 0.2, 1] }
            : { opacity: phase === "idle" ? 0.4 : 1 }
        }
        transition={
          reduced
            ? { duration: 0 }
            : phase === "reading"
              ? { duration: 1.2, repeat: Infinity }
              : phase === "scanning"
                ? { duration: 0.35, repeat: Infinity }
                : phase === "miss"
                  ? { duration: 0.3, repeat: 2 }
                  : { duration: 0.3 }
        }
      />

      {/* ── the parcel — floats at rest, settles to be read, hops when found ── */}
      <motion.g
        animate={reduced ? { y: 0 } : phase === "idle" ? { y: [0, -7, 0] } : phase === "found" ? { y: [0, -12, 0] } : { y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : phase === "idle"
              ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
              : phase === "found"
                ? { duration: 0.5, ease: "easeOut" }
                : { duration: 0.35, ease: "easeOut" }
        }
      >
        <g data-box>
          <g transform="translate(106 84) scale(3)">
            <Parcel label />

            {/* the order number is the barcode… */}
            <rect data-flash-number x={2.5} y={17} width={7} height={9} rx={0.8} className="fill-accent-lit" opacity={0} />
            <motion.rect
              x={1.5}
              y={16}
              width={9}
              height={11}
              rx={1.4}
              className="fill-none stroke-accent"
              strokeWidth={0.7}
              initial={false}
              animate={{ opacity: numberOk ? 1 : 0 }}
              transition={{ duration: 0.25 }}
            />
            <Tick x={10.2} y={16.2} on={numberOk} />

            {/* …and the phone, the address label */}
            <rect data-flash-phone x={18} y={11} width={8} height={5} rx={0.8} className="fill-accent-lit" opacity={0} />
            <motion.rect
              x={17}
              y={10}
              width={10}
              height={7}
              rx={1.4}
              className="fill-none stroke-accent"
              strokeWidth={0.7}
              initial={false}
              animate={{ opacity: phoneOk ? 1 : 0 }}
              transition={{ duration: 0.25 }}
            />
            <Tick x={26.8} y={10} on={phoneOk} />
          </g>

          {/* the verdict */}
          {phase === "found" && (
            <>
              {!reduced && (
                <motion.circle
                  cx={160}
                  cy={129}
                  r={56}
                  className="fill-none stroke-accent-lit"
                  strokeWidth={3}
                  initial={{ scale: 0.6, opacity: 0.8 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              )}
              <Badge tone="ok" reduced={Boolean(reduced)} />
            </>
          )}
          {phase === "miss" && <Badge tone="miss" reduced={Boolean(reduced)} />}
        </g>
      </motion.g>

      {/* ── the frame — closes in when there is something to read ── */}
      <motion.g
        className={`fill-none transition-colors duration-300 ${
          phase === "miss" ? "stroke-alert" : phase === "ready" ? "stroke-ink/30" : "stroke-accent"
        }`}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ opacity: framed ? 1 : 0, scale: phase === "scanning" ? 0.95 : framed ? 1 : 1.12 }}
        transition={{ duration: reduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <path d="M88 88 V70 H106" />
        <path d="M214 70 H232 V88" />
        <path d="M88 162 V180 H106" />
        <path d="M214 180 H232 V162" />
      </motion.g>

      {/* ── the beam ── */}
      {sweeping && (
        <motion.g
          key={`beam-${phase}`}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, 96, 0], opacity: 1 }}
          transition={{
            y: { duration: phase === "scanning" ? 0.8 : 2.6, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.25 },
          }}
        >
          <rect x={94} y={68} width={132} height={24} fill={`url(#${glow})`} />
          <rect x={92} y={79} width={136} height={2.5} rx={1.25} className="fill-accent" />
          <circle cx={92} cy={80.25} r={3} className="fill-accent-lit" />
          <circle cx={228} cy={80.25} r={3} className="fill-accent-lit" />
        </motion.g>
      )}
    </svg>
  );
}

/** A label's tick, in the parcel's own units. */
function Tick({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <motion.g
      initial={false}
      animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
      transition={on ? { type: "spring", stiffness: 520, damping: 22 } : { duration: 0.15 }}
    >
      <circle cx={x} cy={y} r={2.7} className="fill-accent" />
      <path
        d={`M${x - 1.2} ${y} L${x - 0.3} ${y + 0.9} L${x + 1.3} ${y - 0.8}`}
        className="fill-none stroke-white"
        strokeWidth={0.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.g>
  );
}

/** The verdict on the parcel's corner — a tick, or a cross. */
function Badge({ tone, reduced }: { tone: "ok" | "miss"; reduced: boolean }) {
  return (
    <motion.g
      initial={reduced ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { scale: [0, 1.2, 1], opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.45, ease: "easeOut" }}
    >
      <circle cx={214} cy={86} r={14} className={tone === "ok" ? "fill-accent" : "fill-alert"} />
      {tone === "ok" ? (
        <path d="M207 86 L212 91 L221 81" className="fill-none stroke-white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M208.5 80.5 L219.5 91.5 M219.5 80.5 L208.5 91.5" className="fill-none stroke-white" strokeWidth={3} strokeLinecap="round" />
      )}
    </motion.g>
  );
}
