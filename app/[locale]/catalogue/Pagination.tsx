"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * Page numbers for the current page, with gaps where the run is too long to
 * print in full: always the first and last, always the current and its
 * neighbours, an ellipsis for whatever that skips.
 */
function pagesFor(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const out: (number | "gap")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);

  if (from > 2) out.push("gap");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push("gap");

  out.push(total);
  return out;
}

/* `relative` so the travelling pill has something to sit inside, and every
   box carries a border — transparent on the current page — so that turning a
   page cannot shift the row by the two pixels a border occupies. */
const BOX =
  "relative grid h-10 min-w-10 place-items-center rounded-full border px-3 text-sm font-medium transition-colors";

/**
 * Numbered pages — the desktop control.
 *
 * Hidden below lg in CSS rather than by a viewport check in JS: the server
 * cannot know the width, and a control that appears only after hydration
 * flickers. Both controls ship in the HTML and the breakpoint picks one.
 */
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  if (pageCount <= 1) return null;

  const step = (delta: number) => onChange(Math.min(pageCount, Math.max(1, page + delta)));

  return (
    <nav
      aria-label={t("cata.pagination")}
      className="mt-10 hidden flex-wrap items-center justify-center gap-1.5 border-t border-line pt-8 lg:flex"
    >
      <motion.button
        onClick={() => step(-1)}
        disabled={page === 1}
        whileTap={reduced ? undefined : { scale: 0.88 }}
        aria-label={t("cata.prev")}
        className={`${BOX} border-line text-ink disabled:cursor-not-allowed disabled:border-line-soft disabled:text-faint enabled:hover:border-ink/30`}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </motion.button>

      {pagesFor(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={`${BOX} border-transparent text-faint`} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-label={`${t("cata.page")} ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={`${BOX} ${
              p === page
                ? "border-transparent font-semibold text-white"
                : "border-line text-mute hover:border-ink/30 hover:text-ink"
            }`}
          >
            {/* The same travelling pill as the view toggle and the category
                rail: rather than the highlight blinking out on 1 and in on 2,
                one pill walks the row and the eye follows it to the page it
                landed on. Softer than the toggle's spring because it covers
                far more ground — the row can be seven boxes wide, and a
                stiffer one overshoots the far end. */}
            {p === page && (
              <motion.span
                layoutId="page-pill"
                transition={
                  reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                }
                className="bg-accent-gradient-x absolute inset-0 rounded-full"
              />
            )}
            <span className="relative">{p}</span>
          </button>
        ),
      )}

      <motion.button
        onClick={() => step(1)}
        disabled={page === pageCount}
        whileTap={reduced ? undefined : { scale: 0.88 }}
        aria-label={t("cata.next")}
        className={`${BOX} border-line text-ink disabled:cursor-not-allowed disabled:border-line-soft disabled:text-faint enabled:hover:border-ink/30`}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </motion.button>
    </nav>
  );
}

/**
 * Load more — the small-screen control.
 *
 * A thumb reaching a row of numbers at the end of a long scroll is worse than
 * one more tap where it already is, so the phone appends instead of turning
 * pages.
 *
 * One button and nothing else. It had a "9 / 13" line and a remaining count
 * beside the label, but the toolbar at the top of the results already says
 * how many there are — three numbers for one decision, and the decision is
 * only ever "more" or "stop scrolling".
 */
export function LoadMore({
  shown,
  total,
  onMore,
}: {
  shown: number;
  total: number;
  onMore: () => void;
}) {
  const { t } = useLocale();
  if (total - shown <= 0) return null;

  return (
    <div className="mt-10 lg:hidden">
      <button
        onClick={onMore}
        className="btn-accent w-full rounded-full py-3.5 text-sm font-semibold"
      >
        {t("cata.loadMore")}
      </button>
    </div>
  );
}
