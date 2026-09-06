"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * A number that rolls rather than swaps.
 *
 * The direction carries the meaning: a count going up arrives from below, one
 * coming down leaves downward, so the badge says which way the results moved
 * before the eye has read the digit. Both numbers occupy the same grid cell,
 * so the outgoing one does not push the layout around on its way out.
 */
export function CountRoll({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();

  /* Direction is derived during render rather than in an effect: the new
     digit has to know which way it came from on the very frame it mounts,
     and an effect would only tell it afterwards. */
  const [seen, setSeen] = useState(value);
  const [dir, setDir] = useState(1);
  if (seen !== value) {
    setDir(value > seen ? 1 : -1);
    setSeen(value);
  }

  if (reduced) return <span className={className}>{value}</span>;

  return (
    <span className={`relative grid overflow-hidden tabular-nums ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: dir * 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: dir * -14, opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="[grid-area:1/1]"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
