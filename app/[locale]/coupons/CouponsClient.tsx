"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RotateCcw, SearchX, SlidersHorizontal, X } from "lucide-react";
import { StoreHero } from "@/components/site/StoreHero";
import { CountRoll } from "@/components/site/CountRoll";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useLoyalty } from "@/components/loyalty/useLoyalty";
import { withLocale } from "@/lib/i18n";
import { fill } from "@/lib/pcbuilder/engine";
import { buyCoupon } from "@/lib/loyalty/card";
import { type Coupon } from "@/lib/loyalty/program";
import {
  KINDS,
  SORTS,
  activeFilterCount,
  noFilters,
  selectCoupons,
  type ShopFilters,
  type ShopSort,
} from "@/lib/loyalty/shop";
import { CategoryRail } from "@/app/[locale]/catalogue/CategoryRail";
import { SortMenu } from "@/app/[locale]/catalogue/SortMenu";
import { BalanceBar } from "./BalanceBar";
import { CouponCard } from "./CouponCard";
import { CouponFilters } from "./CouponFilters";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The coupon shop — MODULE 8, FID-05.
 *
 * Built as a shop, because that is what it is: the same hero, the same rail
 * of kinds across the top, the same filter column and toolbar the catalogue
 * uses, and a grid of cards with a price and a button. A customer who has
 * browsed the catalogue already knows how to use this page, which is the
 * whole argument for not inventing a second way to show a shelf.
 *
 * What it does not borrow is the catalogue's search field: twelve coupons
 * fit on one screen, and a box to type into would be furniture.
 *
 * FID-07 makes an account the condition for spending points, so signed out
 * there is no shelf to show — the page goes straight to signing in, carrying
 * where it was headed.
 */
export function CouponsClient() {
  const { account, ready, card } = useLoyalty();
  const { t, locale } = useLocale();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [state, setState] = useState<ShopFilters>(noFilters);
  const [sort, setSort] = useState<ShopSort>("tier");
  const [mobileOpen, setMobileOpen] = useState(false);

  /* One coupon at a time: the id being bought, the id just bought, and any
     refusal — all keyed by id so a message can only appear on its own card. */
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (ready && !account) {
      router.replace(`${withLocale("/connexion", locale)}?retour=${encodeURIComponent("/coupons")}`);
    }
  }, [ready, account, router, locale]);

  const patch = (next: Partial<ShopFilters>) => setState((s) => ({ ...s, ...next }));
  const resetAll = () => setState(noFilters());
  const activeCount = activeFilterCount(state);

  const results = useMemo(() => (card ? selectCoupons(state, sort, card) : []), [state, sort, card]);

  const buy = async (coupon: Coupon) => {
    if (!account) return;
    setBusy(coupon.id);
    setError(null);
    const result = await buyCoupon(account, coupon.id);
    setBusy(null);

    if (!result.ok) {
      setError({ id: coupon.id, message: t(`fid.shop.err.${result.reason}`) });
      return;
    }
    setDone(coupon.id);
    window.setTimeout(() => setDone((id) => (id === coupon.id ? null : id)), 2600);
  };

  if (!ready || !account || !card) return <main className="min-h-svh" />;

  return (
    <main className="min-h-svh">
      <StoreHero crumbKey="fid.crumb" titleKey="fid.shop.title" />

      <CategoryRail
        categories={KINDS.map((k) => ({ key: k, name: t(`fid.kind.${k}`) }))}
        active={state.kind}
        onPick={(key) => patch({ kind: key as ShopFilters["kind"] })}
      />

      <section className="mx-auto max-w-[1320px] px-5 pb-14 pt-10 lg:px-8 lg:pb-20 lg:pt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[268px_1fr] lg:gap-12">
          {/* ── the filters ── */}
          <aside className="hidden lg:block">
            <div
              data-active={activeCount > 0 || undefined}
              className="filter-card sticky top-32 rounded-2xl border border-line bg-cloud p-5"
            >
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-line-soft pb-4">
                <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                  {t("cata.filters")}
                  {activeCount > 0 && (
                    <span className="bg-accent-gradient grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold text-white">
                      <CountRoll value={activeCount} />
                    </span>
                  )}
                </h2>
                {activeCount > 0 && (
                  <button
                    onClick={resetAll}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-accent transition-opacity hover:opacity-70"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("cata.reset")}
                  </button>
                )}
              </div>

              <CouponFilters state={state} patch={patch} idPrefix="side" />
            </div>
          </aside>

          {/* ── the shelf ── */}
          <div>
            <BalanceBar card={card} />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4">
              <p className="text-sm text-mute">
                <CountRoll
                  value={results.length}
                  className="inline-grid align-bottom font-display text-lg font-bold text-ink"
                />{" "}
                {results.length > 1 ? t("fid.couponsP") : t("fid.coupons")}
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

                <div className="flex items-center gap-2 text-sm">
                  <span className="hidden font-sans text-[10px] font-semibold uppercase text-faint sm:inline">
                    {t("cata.sort")}
                  </span>
                  <SortMenu
                    value={sort}
                    options={SORTS.map((s) => ({ value: s, label: t(`fid.sort.${s}`) }))}
                    onChange={setSort}
                    label={t("cata.sort")}
                  />
                </div>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-line bg-cloud px-6 py-20 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-white text-faint">
                  <SearchX className="h-5 w-5" />
                </span>
                <p className="mt-5 font-display text-2xl font-bold text-ink">{t("fid.none")}</p>
                <p className="mt-2 text-mute">{t("fid.noneDesc")}</p>
                <button
                  onClick={resetAll}
                  className="btn-accent mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("cata.reset")}
                </button>
              </div>
            ) : (
              <ul className="mt-7 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {results.map((coupon) => (
                    <motion.li
                      key={coupon.id}
                      layout={!reduced}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.18 } }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      <CouponCard
                        coupon={coupon}
                        card={card}
                        busy={busy === coupon.id}
                        done={done === coupon.id}
                        error={error?.id === coupon.id ? error.message : null}
                        onBuy={() => void buy(coupon)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── the filters, on a phone ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={reduced ? { opacity: 0 } : { y: "100%" }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: 0.35, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-3xl bg-paper p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-4">
                <h2 className="font-display text-lg font-bold text-ink">{t("cata.filters")}</h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("c.close")}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line text-mute"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <CouponFilters state={state} patch={patch} idPrefix="sheet" />

              <button
                onClick={() => setMobileOpen(false)}
                className="btn-accent mt-6 w-full rounded-full py-3.5 text-sm font-semibold"
              >
                {fill(t("fid.showCoupons"), { n: results.length })}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
