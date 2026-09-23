"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { RotateCcw, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductRow } from "@/components/site/ProductRow";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName, withLocale } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/products";
import {
  NO_FILTERS,
  activeFilterCount,
  priceBounds,
  selectProducts,
  parseFilters,
  serializeFilters,
  type FilterPatch,
  type FilterState,
} from "@/lib/catalogue";
import { CategoryRail } from "./CategoryRail";
import { FilterPanel } from "./FilterPanel";
import { FilterChips } from "./FilterChips";
import { SortMenu } from "./SortMenu";
import { CountRoll } from "@/components/site/CountRoll";
import { ViewToggle, type View } from "./ViewToggle";
import { LoadMore, Pagination } from "./Pagination";
import { useMediaQuery } from "./useMediaQuery";

const SORTS = ["pop", "new", "asc", "desc", "rating"] as const;
type SortKey = (typeof SORTS)[number];

/** the house ease — a fast start that settles rather than stops */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * How a card leaves when the page turns.
 *
 * A leaving card can no longer be told anything. AnimatePresence re-renders
 * the element it kept from *before* the click, so the card's own props still
 * describe the page it was on — read the direction from them and every turn
 * sweeps the way the previous one did. It arrives through AnimatePresence's
 * `custom` instead, which is read at exit time.
 *
 * That custom is a plain number rather than an object on purpose: a keystroke
 * in the search field re-renders this whole column, and a fresh object each
 * time would re-resolve — and so restart — an exit already in flight.
 *
 * `sweep` is 0 when nothing was actually turned: a filter changed, or the
 * reader has asked for less motion. The card then fades where it stands.
 */
const leaving = (drift: number, shrink: number): Variants => ({
  gone: (sweep: number) => ({
    opacity: 0,
    scale: shrink,
    x: sweep * -drift,
    transition: { duration: 0.22, ease: "easeOut" },
  }),
});

/* Far enough that the direction is unmistakable. The first pass used about
   half these distances and the turn was too polite to register — the cards
   barely moved before the fade did the rest of the work, which reads as a
   dissolve rather than as a page going somewhere. The clip edge on the grid
   below is what makes the extra distance affordable: the cards are cut off at
   the column boundary instead of drifting across the sidebar. */
const CARD_EXIT = leaving(112, 0.94);
const ROW_EXIT = leaving(150, 0.98);

export function CatalogueClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { t, locale, dir } = useLocale();
  const reduced = useReducedMotion();

  /* Everything starts from the query string, so a shared link opens on the
     view it was copied from. */
  const initial = useMemo(() => parseFilters(params.toString()), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [filters, setFilters] = useState(initial.filters);
  const [query, setQuery] = useState(initial.q);
  const [sort, setSort] = useState<SortKey>(
    SORTS.includes(initial.sort as SortKey) ? (initial.sort as SortKey) : "pop",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState<View>("grid");
  /** the top of the results column, so a page change lands there */
  const gridTop = useRef<HTMLDivElement>(null);

  const state: FilterState = useMemo(() => ({ ...filters, q: query }), [filters, query]);
  const patch = (next: FilterPatch) => setFilters((f) => ({ ...f, ...next }));

  const clearSearch = () => setQuery("");

  /* ── URL ⇄ state ──
     One direction at a time, told apart by what we last wrote.

     State → URL is debounced: typing in the search field would otherwise
     rewrite the address bar on every keystroke. `replace` rather than `push`,
     so tightening a filter does not bury the previous page under a dozen
     history entries — the back button still leaves the catalogue.

     URL → state only fires when the query string is something we did not
     write, which is what an incoming link or a header ?cat= link looks like.
     Without that test the two directions feed each other forever. */
  const url = serializeFilters(filters, query, sort);

  /* State, not a ref: this is read while rendering to decide whether an
     incoming query string is ours or someone else's, and a ref read during
     render is both disallowed and unreliable under concurrent rendering. */
  const [written, setWritten] = useState<string | null>(null);

  useEffect(() => {
    if (written === url) return;
    const id = setTimeout(() => {
      setWritten(url);
      router.replace(`${withLocale("/catalogue", locale)}${url ? `?${url}` : ""}`, {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [url, written, router, locale]);

  const live = params.toString();
  const [liveSeen, setLiveSeen] = useState(live);
  if (live !== liveSeen) {
    setLiveSeen(live);
    if (live !== written && live !== url) {
      const next = parseFilters(live);
      setWritten(live);
      setFilters(next.filters);
      setQuery(next.q);
      if (SORTS.includes(next.sort as SortKey)) setSort(next.sort as SortKey);
    }
  }

  /** Back to the full catalogue — the search term is a filter here too. */
  const resetAll = () => {
    setFilters({ ...NO_FILTERS });
    clearSearch();
  };

  const bounds = useMemo(() => priceBounds(state), [state]);
  const activeCount = activeFilterCount(state, bounds);

  const results = useMemo(() => {
    const list = selectProducts(state);
    if (sort === "asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "desc") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating") return [...list].sort((a, b) => b.rating - a.rating);
    // no date on a product, so "nouveautés" is the isNew flag brought forward,
    // with the catalogue order kept underneath it
    if (sort === "new") return [...list].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    return list;
  }, [state, sort]);

  /* A batch is whole rows, never a row and a bit. The grid is two columns
     until md and three from there, so the count has to follow the columns:
     eight is four clean rows on a phone, nine is three on everything wider.
     Nine on a phone would leave one card stranded on a fifth row. */
  const threeUp = useMediaQuery("(min-width: 768px)");
  const pageSize = threeUp ? 9 : 8;

  /* Pages from lg, appending below it. Derived from the viewport rather than
     from which button was last pressed, so resizing across the breakpoint
     cannot leave the pager marking page 3 over a list that was appended. */
  const paged = useMediaQuery("(min-width: 1024px)");

  const [page, setPage] = useState(1);
  /* Which way the last change went — +1 on, -1 back, 0 for a change that was
     not a page turn at all. The grid reads it to decide whether the cards
     travel sideways or simply rise into place. */
  const [turn, setTurn] = useState(0);
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));

  /* Any change to the filters, the sort or the search produces a new results
     array, and page 3 of the old list means nothing in the new one. The same
     goes for a change of batch size under a resize. Compared during render —
     `results` is memoised, so this fires exactly when something really
     changed and never on a page click. */
  const [seen, setSeen] = useState({ results, pageSize, paged });
  if (seen.results !== results || seen.pageSize !== pageSize || seen.paged !== paged) {
    setSeen({ results, pageSize, paged });
    setPage(1);
    // landing back on page 1 because the results changed is not a turn: there
    // is no "back" to sweep towards when the list underneath is a new one
    setTurn(0);
  }

  const shown = paged
    ? results.slice((page - 1) * pageSize, page * pageSize)
    : results.slice(0, page * pageSize);

  const goToPage = (next: number) => {
    if (next === page) return;
    setTurn(next > page ? 1 : -1);
    setPage(next);
    // a new page starts at its own top, not wherever the last one ended
    gridTop.current?.scrollIntoView({ block: "start" });
  };

  /* No scroll on this one: the button sits under the last row, the new rows
     appear above where the thumb already is, and yanking the page would lose
     that place. */
  const loadMore = () => {
    // appending rather than turning: the rows already read stay exactly where
    // they are and the new ones rise in underneath them
    setTurn(0);
    setPage((p) => p + 1);
  };

  /* The drawer is pinned to the start edge, which is the right one in
     Arabic — so the side it slides in from has to follow the writing
     direction too, or it crosses the whole screen to arrive at the edge it
     was already next to. */
  const drawerOff = dir === "rtl" ? "100%" : "-100%";

  /* Forward is whichever way the language reads: page 2 arrives from the
     right in French, from the left in Arabic — the same direction the eye
     travels to reach the "next" button that asked for it. */
  const sweep = reduced ? 0 : turn * (dir === "rtl" ? -1 : 1);

  const countLabel = `${results.length} ${
    results.length > 1 ? t("cata.productsP") : t("cata.products")
  }`;

  /* Held steady between renders: the rail re-measures itself whenever this
     list changes identity, and a fresh array on every keystroke in the search
     field would have it doing that for nothing. */
  const categories = useMemo(
    () => [
      { key: "all", name: t("c.allCatalogue") },
      ...CATEGORIES.map((c) => ({ key: c.key, name: catName(c.key, locale) })),
    ],
    [t, locale],
  );

  return (
    <>
      {/* ── Category navigation ──
          The one choice people arrive already knowing the answer to, so it is
          lifted out of the filter panel into a bar of its own: visible at any
          width, one tap away, and docked under the header as the grid scrolls
          past it. The panel keeps its own copy — this is navigation, that is
          the filter set. */}
      <CategoryRail
        categories={categories}
        active={state.cat}
        // same rule as the filter panel: the shelf changes, the sub goes with it
        onPick={(key) => patch({ cat: key, sub: "all" })}
      />

      <section className="mx-auto max-w-[1320px] px-5 pb-14 pt-10 lg:px-8 lg:pb-20 lg:pt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[268px_1fr] lg:gap-12">
          {/* ── Filter area ── */}
          <aside className="hidden lg:block">
            {/* No scrollbox and nothing pinned: the panel is a plain column
                that travels with the page. A scroller inside a sticky card
                meant two scrollbars on one screen and a panel whose bottom
                you could only reach by scrolling the right thing. */}
            <div>
              <div
                className="filter-card rounded-2xl border border-line bg-cloud p-5"
                data-active={activeCount > 0 || undefined}
              >
                <div className="mb-5 flex items-center justify-between gap-3 border-b border-line-soft pb-4">
                  {/* the same word as the drawer and as the button that
                      opens it — one control, one name */}
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                    {t("cata.filters")}
                    <AnimatePresence>
                      {activeCount > 0 && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="bg-accent-gradient grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold text-white"
                        >
                          <CountRoll value={activeCount} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </h2>
                  <AnimatePresence>
                    {activeCount > 0 && (
                      <motion.button
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        onClick={resetAll}
                        aria-label={t("cata.reset")}
                        /* The short label here, not the full sentence: this
                           sits in a 268px column beside a heading, and
                           "Réinitialiser les filtres" wrapped to two lines.
                           The full wording stays on the wide controls — the
                           empty state and the drawer footer — and on this
                           button's accessible name. */
                        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-accent transition-opacity hover:opacity-70"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t("cata.clearAll")}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <FilterPanel state={state} patch={patch} idPrefix="side" />
              </div>
            </div>
          </aside>

          {/* ── Product area ── */}
          <div ref={gridTop} className="scroll-mt-32">
            {/* ── search ──
                Short on purpose: it narrows what is already on the page, so
                it does not need the width of the header's full-screen one. */}
            <div className="store-search mb-5 flex max-w-sm items-center gap-2.5 rounded-full border border-line bg-cloud px-4 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-faint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                aria-label={t("c.search")}
                autoComplete="off"
                spellCheck={false}
                className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  aria-label={t("c.close")}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-line-soft hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4">
              <p className="text-sm text-mute">
                <CountRoll
                  value={results.length}
                  className="inline-grid align-bottom font-display text-lg font-bold text-ink"
                />{" "}
                {results.length > 1 ? t("cata.productsP") : t("cata.products")}
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-line bg-cloud px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 sm:py-2 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("cata.filters")}
                  {activeCount > 0 && (
                    <span className="bg-accent-gradient grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] font-bold text-white">
                      <CountRoll value={activeCount} />
                    </span>
                  )}
                </button>

                <ViewToggle value={view} onChange={setView} />

                <div className="flex items-center gap-2 text-sm">
                  <span className="hidden font-sans text-[10px] font-semibold uppercase text-faint sm:inline">
                    {t("cata.sort")}
                  </span>
                  <SortMenu
                    value={sort}
                    options={SORTS.map((s) => ({ value: s, label: t(`cata.sort.${s}`) }))}
                    onChange={setSort}
                    label={t("cata.sort")}
                  />
                </div>
              </div>
            </div>

            <FilterChips
              state={state}
              patch={patch}
              bounds={bounds}
              onClearSearch={clearSearch}
              onReset={resetAll}
            />

            {results.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-line bg-cloud px-6 py-20 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-white text-faint">
                  <SearchX className="h-5 w-5" />
                </span>
                <p className="mt-5 font-display text-2xl font-bold text-ink">{t("cata.none")}</p>
                <p className="mt-2 text-mute">{t("cata.noneDesc")}</p>
                <button
                  onClick={resetAll}
                  className="btn-accent mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("cata.reset")}
                </button>
              </div>
            ) : (
              /* One AnimatePresence across both views, keyed by the view
                 itself: the outgoing layout leaves before the incoming one is
                 measured, which is what stops a grid of cards trying to
                 spring into a stack of rows and back. Inside each, the cards
                 keep their own keys, so filtering and sorting still animate
                 per product exactly as before. */
              <AnimatePresence mode="wait" initial={false}>
                {view === "list" ? (
                  <motion.div
                    key="list"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reduced ? 0.12 : 0.26, ease: EASE_OUT }}
                    className="mt-10 flex flex-col gap-3 overflow-x-clip"
                  >
                    <AnimatePresence mode="popLayout" custom={sweep}>
                      {shown.map((p, i) => (
                        // A row is the full width of the column, so it carries
                        // further than a card before it reads as travel.
                        <motion.div
                          key={p.slug}
                          layout
                          custom={sweep}
                          variants={ROW_EXIT}
                          initial={
                            reduced
                              ? { opacity: 0 }
                              : sweep
                                ? { opacity: 0, x: sweep * 150 }
                                : { opacity: 0, y: 16 }
                          }
                          animate={{
                            opacity: 1,
                            x: 0,
                            y: 0,
                            transition: {
                              duration: reduced ? 0.15 : 0.36,
                              ease: EASE_OUT,
                              delay: reduced ? 0 : Math.min(i, 8) * 0.03,
                            },
                          }}
                          exit="gone"
                          transition={
                            reduced
                              ? { duration: 0 }
                              : { layout: { type: "spring", stiffness: 320, damping: 34 } }
                          }
                        >
                          <ProductRow product={p} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  /* Three across on desktop rather than four: the sidebar has
                     already taken its column, and a fourth would shrink every
                     shot below the size the product actually needs. */
                  <motion.div
                    key="grid"
                    layout
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reduced ? 0.12 : 0.26, ease: EASE_OUT }}
                    /* `overflow-x-clip`, not `overflow-hidden`: cards have to
                       be cut off at the column edge as they leave, but the
                       vertical axis must stay free or the hover lift and the
                       card's own shadow get sliced off along with them. Clip
                       on one axis is also not a scroll container, so nothing
                       here starts capturing wheel events. */
                    className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 overflow-x-clip sm:mt-10 sm:gap-x-6 sm:gap-y-9 md:grid-cols-3"
                  >
                {/* popLayout takes a leaving card out of the flow the moment
                    it starts fading, so the cards behind it begin travelling
                    to their new places straight away rather than waiting for
                    the gap to close. Sorting keeps every key, so nothing
                    re-enters — the whole grid just springs into its new
                    order. */}
                <AnimatePresence mode="popLayout" custom={sweep}>
                  {shown.map((p, i) => (
                    // A turned page enters from the side it came from and the
                    // old one leaves the opposite way, so the two never look
                    // like the same set of cards rearranging itself. A filter
                    // change has no side to come from — those still rise.
                    // popLayout takes the leaving cards out of the flow at
                    // once, so both halves occupy the same space and the
                    // column below never jumps while they cross.
                    <motion.div
                      key={p.slug}
                      layout
                      custom={sweep}
                      variants={CARD_EXIT}
                      initial={
                        reduced
                          ? { opacity: 0 }
                          : sweep
                            ? { opacity: 0, x: sweep * 112, scale: 0.97 }
                            : { opacity: 0, y: 20, scale: 0.97 }
                      }
                      animate={{
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                        transition: {
                          duration: reduced ? 0.15 : 0.46,
                          ease: EASE_OUT,
                          // the stagger only ever runs on cards that are
                          // genuinely new, and is capped so a wide result
                          // set is not still arriving a second later
                          delay: reduced ? 0 : Math.min(i, 8) * 0.04,
                        },
                      }}
                      exit="gone"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { layout: { type: "spring", stiffness: 320, damping: 34, mass: 0.9 } }
                      }
                    >
                      <ProductCard product={p} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            <Pagination page={page} pageCount={pageCount} onChange={goToPage} />
            <LoadMore shown={shown.length} total={results.length} onMore={loadMore} />
          </div>
        </div>
      </section>

      {/* ── Filter drawer, below lg ──
          The same panel as the sidebar, on the same state, with the result
          count on the button that dismisses it — the number is the reason you
          opened the drawer, so it belongs on the way out. */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-ink/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: drawerOff }}
              animate={{ x: 0 }}
              exit={{ x: drawerOff }}
              transition={{ type: "spring", stiffness: 320, damping: 36 }}
              className="fixed inset-y-0 start-0 z-[70] flex w-[88%] max-w-sm flex-col bg-paper lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  {t("cata.filters")}
                  {activeCount > 0 && (
                    <span className="bg-accent-gradient grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold text-white">
                      <CountRoll value={activeCount} />
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("c.close")}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <FilterPanel state={state} patch={patch} idPrefix="drawer" />
              </div>

              <div className="border-t border-line p-5">
                {activeCount > 0 && (
                  <button
                    onClick={resetAll}
                    className="mb-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-accent"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("cata.reset")}
                  </button>
                )}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="btn-accent w-full rounded-full py-3.5 text-sm font-semibold"
                >
                  {t("cata.seeN1")} {countLabel}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
