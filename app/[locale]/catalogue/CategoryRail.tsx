"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type Cat = { key: string; name: string };

/** How far one arrow press travels — most of a screenful, so the chip you
    were reading is still on the row you land on. */
const STRIDE = 0.8;

/** Which ends of the rail still have categories past them. */
type Edges = { start: boolean; end: boolean };

/**
 * The category bar above the grid.
 *
 * A store with six categories fits its whole list on a laptop; this one no
 * longer does, and the row that used to be a static line of chips is now
 * genuinely a rail. Three things follow from that, and all three are driven
 * by measurement rather than by a breakpoint — the number of categories, the
 * length of their names in three languages and the width of the window all
 * decide whether anything is actually hidden:
 *
 *   · the ends fade only while there is something behind them,
 *   · an arrow appears at each end that has more to show, for the pointer
 *     users who have no swipe,
 *   · and the chosen category is pulled into view, so arriving on
 *     ?cat=chaises never lands you on a rail scrolled to the far end of it.
 */
export function CategoryRail({
  categories,
  active,
  onPick,
}: {
  categories: Cat[];
  active: string;
  onPick: (key: string) => void;
}) {
  const { t, dir } = useLocale();
  const reduced = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });

  /* scrollLeft runs from 0 down to -(overflow) in a right-to-left box and
     from 0 up to +(overflow) in a left-to-right one. Taking the distance
     from the start as an absolute value is all it takes for one measurement
     to serve both. */
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const over = el.scrollWidth - el.clientWidth;
    const from = Math.abs(el.scrollLeft);
    setEdges((e) => {
      const next = { start: from > 1, end: from < over - 1 };
      return e.start === next.start && e.end === next.end ? e : next;
    });
  }, []);

  /* Re-measured on anything that can change the answer: the window, the
     rail's own box, and the list itself — switching language rewrites every
     chip, and the row that fitted in English may not fit in French. */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, categories]);

  /* Centring the chosen chip, but only when it is not already comfortably in
     view: on a rail that fits, and on the common case of landing on "all",
     the delta is nil and nothing moves. Measured from the boxes on screen,
     so — like the edges above — it needs no separate right-to-left branch. */
  useEffect(() => {
    const el = rail.current;
    const chip = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el || !chip) return;
    const r = el.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    const delta = c.left + c.width / 2 - (r.left + r.width / 2);
    if (Math.abs(delta) < 8) return;
    el.scrollBy({ left: delta, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  /* The arrows are the one place the writing direction has to be spelled
     out: "further along the rail" is rightwards in French and leftwards in
     Arabic, and only the caller knows which. */
  const nudge = (towardEnd: boolean) => {
    const el = rail.current;
    if (!el) return;
    const sign = (dir === "rtl" ? -1 : 1) * (towardEnd ? 1 : -1);
    el.scrollBy({ left: sign * el.clientWidth * STRIDE, behavior: reduced ? "auto" : "smooth" });
  };

  const fade = edges.start ? (edges.end ? "both" : "start") : edges.end ? "end" : "none";

  return (
    <nav
      aria-label={t("cata.browse")}
      className="sticky top-[68px] z-30 border-b border-line bg-paper/85 backdrop-blur-md"
    >
      {/* No visible label over the chips: they are category names, which need
          no caption, and one that only appeared from lg pushed the rail out of
          line with the filter panel and grid underneath it. The nav keeps its
          aria-label for screen readers. */}
      <div className="mx-auto flex max-w-[1320px] items-center px-5 lg:px-8">
        <div className="relative min-w-0 flex-1">
          <div
            ref={rail}
            onScroll={measure}
            data-fade={fade}
            className="no-bar rail-scroll -mx-1 flex gap-2 overflow-x-auto px-1 py-4"
          >
            {categories.map((c) => {
              const on = active === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => onPick(c.key)}
                  aria-current={on ? "true" : undefined}
                  className={`cat-chip relative shrink-0 rounded-full px-5 py-3 text-[15px] font-medium ${
                    on ? "text-white" : "text-mute hover:text-ink"
                  }`}
                >
                  {/* the resting tint sits under the indicator rather than on
                      the button, so hovering the category you are already on
                      does not lighten the accent pill */}
                  {!on && <span className="cat-chip-hover" aria-hidden />}
                  {on && (
                    <motion.span
                      layoutId="cat-pill"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 36, mass: 0.7 }
                      }
                      className="bg-accent-gradient-x absolute inset-0 rounded-full shadow-[0_6px_16px_-8px_rgb(146_45_169/0.75)]"
                    />
                  )}
                  <span className="relative">{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Pointer-only, and out of the tab order: every category is
              already a tab stop of its own, and the browser scrolls the one
              you reach into view — two more stops in front of them would be
              furniture, not help. */}
          <AnimatePresence>
            {edges.start && (
              <RailArrow
                key="start"
                side="start"
                label={t("cata.railPrev")}
                onClick={() => nudge(false)}
              />
            )}
            {edges.end && (
              <RailArrow
                key="end"
                side="end"
                label={t("cata.railNext")}
                onClick={() => nudge(true)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

function RailArrow({
  side,
  label,
  onClick,
}: {
  side: "start" | "end";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "start" ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      aria-label={label}
      tabIndex={-1}
      className={`rail-arrow absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-mute lg:grid ${
        side === "start" ? "start-0" : "end-0"
      }`}
    >
      <Icon className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.5} />
    </motion.button>
  );
}
