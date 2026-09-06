"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  type FilterPatch,
  type FilterState,
} from "@/lib/catalogue";
import { FilterPanel } from "./FilterPanel";
import { FilterChips } from "./FilterChips";
import { SortMenu } from "./SortMenu";
import { CountRoll } from "./CountRoll";
import { ViewToggle, type View } from "./ViewToggle";
import { LoadMore, Pagination } from "./Pagination";
import { useMediaQuery } from "./useMediaQuery";

const SORTS = ["pop", "asc", "desc", "rating"] as const;

/** the house ease — a fast start that settles rather than stops */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function CatalogueClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();

  const urlCat = params.get("cat") ?? "all";
  const q = (params.get("q") ?? "").trim();

  const [filters, setFilters] = useState({ ...NO_FILTERS, cat: urlCat });
  const [sort, setSort] = useState<(typeof SORTS)[number]>("pop");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState<View>("grid");
  /** the top of the results column, so a page change lands there */
  const gridTop = useRef<HTMLDivElement>(null);

  /* The header and the home page both link in with ?cat=…, and that has to
     win over whatever the rail was last set to — but only when the URL itself
     changes, or picking a category here would be undone on the next render.
     Adjusted during render rather than in an effect: React re-runs this
     component before committing, so the grid never paints the stale one. */
  const [urlCatSeen, setUrlCatSeen] = useState(urlCat);
  if (urlCat !== urlCatSeen) {
    setUrlCatSeen(urlCat);
    setFilters((f) => ({ ...f, cat: urlCat, specs: {} }));
  }

  /* The bar above the grid owns the term from here on. It starts from ?q= —
     the header search still lands here with one — but typing in it filters in
     place rather than navigating, so the grid never reloads under you. A new
     ?q= arriving later still wins, the same way ?cat= does. */
  const [query, setQuery] = useState(q);
  const [urlQSeen, setUrlQSeen] = useState(q);
  if (q !== urlQSeen) {
    setUrlQSeen(q);
    setQuery(q);
  }

  const state: FilterState = useMemo(() => ({ ...filters, q: query }), [filters, query]);
  const patch = (next: FilterPatch) => setFilters((f) => ({ ...f, ...next }));

  const clearSearch = () => {
    setQuery("");
    // only worth a navigation if the term is actually in the URL
    if (q) router.push(withLocale("/catalogue", locale));
  };

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
  }

  const shown = paged
    ? results.slice((page - 1) * pageSize, page * pageSize)
    : results.slice(0, page * pageSize);

  const goToPage = (next: number) => {
    setPage(next);
    // a new page starts at its own top, not wherever the last one ended
    gridTop.current?.scrollIntoView({ block: "start" });
  };

  /* No scroll on this one: the button sits under the last row, the new rows
     appear above where the thumb already is, and yanking the page would lose
     that place. */
  const loadMore = () => setPage((p) => p + 1);

  const countLabel = `${results.length} ${
    results.length > 1 ? t("cata.productsP") : t("cata.products")
  }`;

  const categories = [
    { key: "all", name: t("c.allCatalogue") },
    ...CATEGORIES.map((c) => ({ key: c.key, name: catName(c.key, locale) })),
  ];

  return (
    <>
      {/* ── Category navigation ──
          The one choice people arrive already knowing the answer to, so it is
          lifted out of the filter panel into a bar of its own: visible at any
          width, one tap away, and docked under the header as the grid scrolls
          past it. The panel keeps its own copy — this is navigation, that is
          the filter set. */}
      <nav
        aria-label={t("cata.browse")}
        className="sticky top-[68px] z-30 border-b border-line bg-paper/85 backdrop-blur-md"
      >
        {/* No visible label over the chips: they are category names, which
            need no caption, and the one that used to sit here only appeared
            from lg — so it also pushed the rail out of line with the filter
            panel and grid underneath it. The nav keeps its aria-label, which
            is what a screen reader needs to announce the landmark. */}
        <div className="mx-auto flex max-w-[1320px] items-center px-5 lg:px-8">
          <div className="no-bar rail-scroll -mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-4">
            {categories.map((c) => {
              const on = state.cat === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => patch({ cat: c.key, specs: {} })}
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
        </div>
      </nav>

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

              <div className="flex items-center gap-2.5">
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
                    className="mt-10 flex flex-col gap-3"
                  >
                    <AnimatePresence mode="popLayout">
                      {shown.map((p, i) => (
                        <motion.div
                          key={p.slug}
                          layout
                          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: reduced ? 0.15 : 0.36,
                              ease: EASE_OUT,
                              delay: reduced ? 0 : Math.min(i, 8) * 0.03,
                            },
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.98,
                            transition: { duration: reduced ? 0.1 : 0.2, ease: "easeOut" },
                          }}
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
                    className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3"
                  >
                {/* popLayout takes a leaving card out of the flow the moment
                    it starts fading, so the cards behind it begin travelling
                    to their new places straight away rather than waiting for
                    the gap to close. Sorting keeps every key, so nothing
                    re-enters — the whole grid just springs into its new
                    order. */}
                <AnimatePresence mode="popLayout">
                  {shown.map((p, i) => (
                    <motion.div
                      key={p.slug}
                      layout
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          duration: reduced ? 0.15 : 0.42,
                          ease: EASE_OUT,
                          // the stagger only ever runs on cards that are
                          // genuinely new, and is capped so a wide result
                          // set is not still arriving a second later
                          delay: reduced ? 0 : Math.min(i, 8) * 0.04,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.94,
                        transition: { duration: reduced ? 0.1 : 0.22, ease: "easeOut" },
                      }}
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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
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
