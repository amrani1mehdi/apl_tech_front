"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The face on an empty cart.
 *
 * An empty state is the one screen with nothing on it, so it is the one place
 * a little life is worth the bytes: a profile in the shop's own line weight,
 * wearing the headset half the catalogue sells, looking down the page at the
 * way out of the emptiness.
 *
 * It faces the reading direction — mirrored in Arabic — so it is always
 * looking *into* the page rather than off the edge of it.
 *
 * Two loops, both slow: a blink, and a breath that tips the head a couple of
 * degrees. Nothing here answers a click, so it stays quiet enough to ignore;
 * with reduced motion asked for, it holds still entirely.
 */
export function EmptyFace({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  /* One long cycle carries both the tip and the blink, so the head is never
     caught blinking at the top of a nod — they are the same clock. */
  const breathe = reduced
    ? {}
    : {
        animate: { rotate: [0, -2.4, 0, -1.2, 0] },
        transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const, times: [0, 0.3, 0.55, 0.75, 1] },
      };

  const blink = reduced
    ? {}
    : {
        animate: { scaleY: [1, 1, 0.08, 1, 1, 1, 0.08, 1] },
        transition: {
          duration: 7,
          repeat: Infinity,
          ease: "easeOut" as const,
          times: [0, 0.34, 0.37, 0.4, 0.78, 0.82, 0.85, 0.88],
        },
      };

  return (
    <svg
      viewBox="0 0 120 140"
      role="img"
      aria-hidden
      className={`overflow-visible rtl:-scale-x-100 ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.g style={{ transformOrigin: "56px 110px" }} {...breathe}>
        {/* ── the head ──
               Drawn round rather than anatomical. A true profile's brow, lip
               and jaw inflections are finer than the 80px this is shown at,
               and at that size they collapse into a jagged edge; a cartoon
               skull with one small nose survives the reduction and still
               reads, instantly, as someone looking. */}
        <path
          d="M56 24
             C76 24 90 38 90 55
             C93 57 95 60 95 64
             C95 68 92 69 88 69
             C86 73 85 77 87 81
             C89 86 85 92 78 96
             C70 100 62 100 56 100
             C36 100 22 82 22 61
             C22 40 36 24 56 24
             Z"
          fill="#fff"
          stroke="var(--color-ink)"
          strokeWidth="2.4"
        />

        {/* The band rides over the crown and tucks back into the skull at the
            far end, where a real one carries on to the ear you cannot see. */}
        <path d="M43 53C39 28 56 18 76 31" stroke="var(--color-accent)" strokeWidth="2.6" />

        {/* the eye, set just behind the nose */}
        <motion.ellipse
          cx="79"
          cy="55"
          rx="3.1"
          ry="3.1"
          style={{ transformOrigin: "79px 55px" }}
          fill="var(--color-ink)"
          {...blink}
        />

        {/* the mouth — a small, patient line */}
        <path d="M85 79c-1.8 1.6-4 1.9-6 1.2" stroke="var(--color-mute)" strokeWidth="2.2" />

        {/* the ear cup, over the head rather than behind it */}
        <circle
          cx="43"
          cy="66"
          r="13"
          fill="var(--color-accent)"
          fillOpacity="0.08"
          stroke="var(--color-accent)"
          strokeWidth="2.6"
        />
      </motion.g>
    </svg>
  );
}
