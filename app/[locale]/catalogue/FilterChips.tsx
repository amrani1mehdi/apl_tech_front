"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName } from "@/lib/i18n";
import { formatDA } from "@/lib/products";
import { type FilterPatch, type FilterState } from "@/lib/catalogue";

const EASE = [0.22, 1, 0.36, 1] as const;

const AVAIL_LABEL = {
  all: "cata.avail.all",
  in: "cata.avail.in",
  pre: "cata.avail.pre",
  out: "cata.avail.out",
} as const;

/**
 * Everything currently narrowing the grid, in one row above it, each one
 * removable where it is read rather than by hunting for the control that set
 * it. The search term is one of them: it narrows the results exactly like a
 * tick in the panel does, and people expect to clear it the same way.
 */
export function FilterChips({
  state,
  patch,
  bounds,
  onClearSearch,
  onReset,
}: {
  state: FilterState;
  patch: (next: FilterPatch) => void;
  bounds: { min: number; max: number };
  onClearSearch: () => void;
  onReset: () => void;
}) {
  const { t, locale } = useLocale();

  /* Clearing has to be flagged one render BEFORE the chips go, or the exiting
     children carry the props from their last committed render — which would
     still say "no stagger" — and the row would blink out together. Marking
     it, then resetting on the next frame, gets the delays into the exit props
     the chips leave with. */
  const [clearing, setClearing] = useState(false);
  const clearAll = () => {
    setClearing(true);
    requestAnimationFrame(() => {
      onReset();
      // long enough for the last chip in a full row to finish leaving
      setTimeout(() => setClearing(false), 600);
    });
  };

  const priced = state.price !== null && (state.price.min > bounds.min || state.price.max < bounds.max);

  const chips: { id: string; label: string; clear: () => void }[] = [
    ...(state.q ? [{ id: `q:${state.q}`, label: `« ${state.q} »`, clear: onClearSearch }] : []),
    ...(state.cat !== "all"
      ? [{ id: `cat:${state.cat}`, label: catName(state.cat, locale), clear: () => patch({ cat: "all", specs: {} }) }]
      : []),
    ...state.brands.map((b) => ({
      id: `brand:${b}`,
      label: b,
      clear: () => patch({ brands: state.brands.filter((x) => x !== b) }),
    })),
    ...(priced && state.price
      ? [
          {
            id: "price",
            label: `${formatDA(state.price.min)} – ${formatDA(state.price.max)}`,
            clear: () => patch({ price: null }),
          },
        ]
      : []),
    ...(state.availability !== "all"
      ? [
          {
            id: `avail:${state.availability}`,
            label: t(AVAIL_LABEL[state.availability]),
            clear: () => patch({ availability: "all" }),
          },
        ]
      : []),
    ...(state.promoOnly
      ? [{ id: "promo", label: t("cata.promoOnly"), clear: () => patch({ promoOnly: false }) }]
      : []),
    ...Object.entries(state.specs).flatMap(([key, values]) =>
      values.map((v) => ({
        id: `spec:${key}:${v}`,
        label: `${key} · ${v}`,
        clear: () => {
          const next = values.filter((x) => x !== v);
          const specs = { ...state.specs };
          if (next.length) specs[key] = next;
          else delete specs[key];
          patch({ specs });
        },
      })),
    ),
  ];

  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="font-sans text-[10px] font-semibold uppercase text-faint">
              {t("cata.activeFilters")}
            </span>

            <AnimatePresence mode="popLayout" initial={false}>
              {chips.map((c, i) => (
                <motion.button
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.86,
                    /* Clearing everything runs the row off left to right
                       rather than blinking it out in one frame. A single
                       removal has no delay: the chip you clicked has to go
                       the instant you click it. */
                    transition: { duration: 0.18, ease: EASE, delay: clearing ? i * 0.035 : 0 },
                  }}
                  transition={{ duration: 0.22, ease: EASE }}
                  onClick={c.clear}
                  aria-label={`${t("cata.remove")} — ${c.label}`}
                  className="chip flex items-center gap-1.5 rounded-full border border-line bg-cloud py-1.5 pe-1.5 ps-3 text-xs font-medium text-ink sm:py-1 sm:pe-1"
                >
                  {c.label}
                  <span className="chip-x grid h-5 w-5 place-items-center rounded-full text-faint">
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>

            {chips.length > 1 && (
              <motion.button
                layout
                onClick={clearAll}
                className="clear-all ms-1 flex items-center gap-1 text-xs font-semibold text-accent"
              >
                <RotateCcw className="clear-all-icon h-3 w-3" />
                {t("cata.clearAll")}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
