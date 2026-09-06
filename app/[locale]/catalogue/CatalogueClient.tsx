"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { ProductCard } from "@/components/site/ProductCard";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName, withLocale } from "@/lib/i18n";
import { PRODUCTS, CATEGORIES, BRANDS } from "@/lib/products";

const SORTS = ["pop", "asc", "desc", "rating"] as const;
const PRICES = [
  { key: "all", test: () => true },
  { key: "lt50", test: (p: number) => p < 50000 },
  { key: "mid", test: (p: number) => p >= 50000 && p <= 150000 },
  { key: "gt150", test: (p: number) => p > 150000 },
] as const;
const PRICE_LABEL: Record<string, string> = {
  all: "cata.allPrices",
  lt50: "cata.lt50",
  mid: "cata.mid",
  gt150: "cata.gt150",
};

export function CatalogueClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { t, locale } = useLocale();

  const urlCat = params.get("cat") ?? "all";
  const q = (params.get("q") ?? "").trim();

  const [cat, setCat] = useState(urlCat);
  const [brands, setBrands] = useState<string[]>([]);
  const [price, setPrice] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("pop");
  const [inStock, setInStock] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setCat(urlCat), [urlCat]);

  const toggleBrand = (b: string) =>
    setBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const reset = () => {
    setCat("all");
    setBrands([]);
    setPrice("all");
    setInStock(false);
  };

  const results = useMemo(() => {
    const priceTest = PRICES.find((p) => p.key === price)!.test;
    const term = q.toLowerCase();
    let list = PRODUCTS.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (brands.length && !brands.includes(p.brand)) return false;
      if (!priceTest(p.price)) return false;
      if (inStock && !p.stock) return false;
      if (term) {
        const hay = `${p.name} ${p.brand} ${p.specs.map((s) => s.v).join(" ")}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    list = [...list];
    if (sort === "asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [cat, brands, price, sort, inStock, q]);

  const activeCount =
    (cat !== "all" ? 1 : 0) + brands.length + (price !== "all" ? 1 : 0) + (inStock ? 1 : 0);

  const Filters = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-sans text-[11px] font-semibold uppercase text-faint">{t("cata.category")}</h3>
        <div className="mt-3 flex flex-col gap-1">
          {[{ key: "all", name: t("c.allCatalogue") }, ...CATEGORIES.map((c) => ({ key: c.key, name: catName(c.key, locale) }))].map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                cat === c.key ? "bg-accent text-white" : "text-mute hover:bg-cloud hover:text-ink"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-sans text-[11px] font-semibold uppercase text-faint">{t("cata.brand")}</h3>
        <div className="mt-3 space-y-1">
          {BRANDS.map((b) => {
            const on = brands.includes(b);
            return (
              <button
                key={b}
                onClick={() => toggleBrand(b)}
                className="flex w-full items-center gap-2.5 px-1 py-1.5 text-start text-sm text-mute transition-colors hover:text-ink"
              >
                <span className={`grid h-4 w-4 place-items-center rounded border transition-colors ${on ? "border-accent bg-accent text-white" : "border-line"}`}>
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {b}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-sans text-[11px] font-semibold uppercase text-faint">{t("cata.price")}</h3>
        <div className="mt-3 flex flex-col gap-1">
          {PRICES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPrice(p.key)}
              className={`rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                price === p.key ? "bg-accent text-white" : "text-mute hover:bg-cloud hover:text-ink"
              }`}
            >
              {t(PRICE_LABEL[p.key])}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setInStock((v) => !v)}
        className="flex w-full items-center gap-2.5 text-start text-sm text-mute transition-colors hover:text-ink"
      >
        <span className={`grid h-4 w-4 place-items-center rounded border transition-colors ${inStock ? "border-accent bg-accent text-white" : "border-line"}`}>
          {inStock && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        {t("cata.inStockOnly")}
      </button>

      {activeCount > 0 && (
        <button onClick={reset} className="text-sm font-medium text-accent transition-opacity hover:opacity-70">
          {t("cata.reset")}
        </button>
      )}
    </div>
  );

  const countLabel = `${results.length} ${results.length > 1 ? t("cata.productsP") : t("cata.products")}`;

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-12 lg:px-8 lg:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <Filters />
          </div>
        </aside>

        <div>
          {q && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-mute">
                {t("search.results")} «&nbsp;{q}&nbsp;»
              </span>
              <button
                onClick={() => router.push(withLocale("/catalogue", locale))}
                className="text-mute transition-colors hover:text-ink"
                aria-label={t("c.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-mute">
              <span className="font-semibold text-ink">{results.length}</span>{" "}
              {results.length > 1 ? t("cata.productsP") : t("cata.products")}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t("cata.filters")}
                {activeCount > 0 && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </button>
              <label className="flex items-center gap-2 text-sm">
                <span className="hidden text-mute sm:inline">{t("cata.sort")}</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
                  className="rounded-full border border-line bg-cloud px-4 py-2 text-sm font-medium text-ink focus:outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`cata.sort.${s}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-2xl font-bold text-ink">{t("cata.none")}</p>
              <p className="mt-2 text-mute">{t("cata.noneDesc")}</p>
              <button onClick={reset} className="mt-5 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper">
                {t("cata.reset")}
              </button>
            </div>
          ) : (
            <motion.div layout className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {results.map((p) => (
                  <motion.div
                    key={p.slug}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 36 }}
              className="fixed inset-y-0 start-0 z-[70] w-[85%] max-w-sm overflow-y-auto bg-paper p-6 lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">{t("cata.filters")}</h2>
                <button onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Filters />
              <button onClick={() => setMobileOpen(false)} className="mt-8 w-full rounded-full bg-ink py-3.5 text-sm font-semibold text-paper">
                {t("cata.seeN1")} {countLabel}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
