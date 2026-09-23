"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown, X } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { CATEGORIES } from "@/lib/products";
import { categoryCounts, subCounts, NO_FILTERS } from "@/lib/catalogue";

/* Counts come from the same selector the catalogue filters with, so the
   number beside a category here and the number of cards you land on are one
   calculation. PRODUCTS is static, so this is module work, not render work. */
const COUNTS = categoryCounts({ ...NO_FILTERS, q: "" });

/* Per-category sub counts, each measured inside its own category — the same
   reason as above, and it keeps a fourteen-way calculation out of the render. */
const SUB_COUNTS: Record<string, Record<string, number>> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, subCounts({ ...NO_FILTERS, cat: c.key, q: "" })]),
);

/**
 * The categories panel, opened from the header.
 *
 * It slides from the inline-end edge rather than covering the screen: the
 * other overlays in this site (cart, search, mobile menu) all take the whole
 * viewport because they are destinations, and this one is a way of choosing
 * where to go next — keeping the page visible behind it is what makes it read
 * as a shortcut rather than another place.
 *
 * The ground is the header's ink, because that is where the link that opens
 * it lives; the panel is meant to look like the header unfolding downward.
 *
 * Everything is set in logical properties and the slide is signed off `dir`,
 * so the panel enters from the right in French and English and from the left
 * in Arabic — the edge nearest the link that opened it in each direction.
 */
export function CategoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, dir } = useLocale();
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  /** one shelf open at a time — the panel is a list, not fourteen lists */
  const [expanded, setExpanded] = useState<string | null>(null);
  /* the element that had focus when the panel opened, so closing puts it back
     where the reader left it rather than at the top of the document */
  const restoreTo = useRef<HTMLElement | null>(null);

  // lock the page behind the panel, and close on Escape
  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    /* Released outright rather than restored to what it was: the menu can hand
       over to this panel while still holding its own "hidden", and putting
       that back on close would leave the page locked with nothing open. */
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  // the close button is the one control that is always present, so it is where
  // the keyboard lands — never inside the list, which would skip the heading
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  /* Reopening should not restore whatever was left expanded last time.
     Adjusted during render rather than in an effect — the panel is mid-exit
     when this runs, and collapsing a shelf from an effect would repaint it
     one frame after the slide had already started. */
  const [openSeen, setOpenSeen] = useState(open);
  if (open !== openSeen) {
    setOpenSeen(open);
    if (!open) setExpanded(null);
  }

  /** the panel's own edge: end in LTR, which `x` has to follow in RTL too */
  const hidden = dir === "rtl" ? "-100%" : "100%";

  const slide = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: hidden },
        animate: { x: "0%" },
        exit: { x: hidden },
      };

  const rows = CATEGORIES.map((c) => ({
    key: c.key,
    name: t(`cat.${c.key}`),
    image: c.image,
    count: COUNTS[c.key] ?? 0,
    subs: c.subs,
  }));

  return (
    <AnimatePresence>
      {open && (
        <div
          key="cat-drawer"
          className="cat-veil"
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.categories")}
        >
          <motion.span
            className="cat-scrim"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onMouseDown={onClose}
          />

          <motion.aside
            className="cat-panel"
            {...slide}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <h2 className="font-display text-xl font-bold text-white">{t("nav.categories")}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t("c.close")}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white/90 transition-colors hover:border-white hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <nav className="cat-list">
              {/* the whole catalogue keeps its own row, above the shelves */}
              <Link href="/catalogue" onClick={onClose} className="cat-row cat-row--all group">
                <span className="cat-thumb">
                  <img src="/products/apl-promo.jpg" alt="" draggable={false} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-bold text-white">
                    {t("c.allCatalogue")}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-white/45">
                    {COUNTS.all ?? 0} {t((COUNTS.all ?? 0) === 1 ? "cata.result" : "cata.results")}
                  </span>
                </span>
                <ArrowRight className="cat-go h-4 w-4 shrink-0 text-white/30 rtl:rotate-180" />
              </Link>

              {rows.map((c, i) => {
                const isOpen = expanded === c.key;
                return (
                  <motion.div
                    key={c.key}
                    initial={reduced ? false : { opacity: 0, x: dir === "rtl" ? -14 : 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.028 }}
                  >
                    {/* The row is split: the name is a link straight to the
                        whole category, and the chevron beside it is a separate
                        button that opens the shelves. Making the whole row do
                        both would mean you could not reach the category itself
                        once it had subs. */}
                    <div className="cat-head">
                      <Link
                        href={`/catalogue?cat=${c.key}`}
                        onClick={onClose}
                        className="cat-row cat-row--grow group"
                      >
                        <span className="cat-thumb">
                          <img src={c.image} alt="" draggable={false} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-[15px] font-bold text-white">
                            {c.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-white/45">
                            {c.count} {t(c.count === 1 ? "cata.result" : "cata.results")}
                          </span>
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : c.key)}
                        aria-expanded={isOpen}
                        aria-label={c.name}
                        className="cat-toggle"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.ul
                          key="subs"
                          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="cat-subs"
                        >
                          {c.subs.map((sb) => {
                            const n = SUB_COUNTS[c.key]?.[sb.key] ?? 0;
                            return (
                              <li key={sb.key}>
                                <Link
                                  href={`/catalogue?cat=${c.key}&sub=${sb.key}`}
                                  onClick={onClose}
                                  // listed either way — it says the store has
                                  // the shelf — but dimmed when it is bare
                                  data-empty={n === 0 || undefined}
                                  className="cat-sub group"
                                >
                                  <span className="flex-1 truncate">{t(`sub.${sb.key}`)}</span>
                                  <span className="cat-sub-n">{n}</span>
                                  <ArrowRight className="cat-go h-3.5 w-3.5 shrink-0 rtl:rotate-180" />
                                </Link>
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </nav>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
