"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { Star, ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName } from "@/lib/i18n";
import { ProductBadges, StockLine } from "./ProductBadges";
import { isOrderable, type Product } from "@/lib/products";

/** how long the button stays on its confirmed state after a click */
const ADDED_MS = 1400;
/** enough specs to tell two products apart, few enough to stay one line each */
const SPEC_LIMIT = 4;

/**
 * The list view's row.
 *
 * It carries everything the card does and adds the thing a card has no room
 * for: the specs. They are laid out as a label/value table rather than as
 * chips, because the point of a list is reading down a column — two graphics
 * cards' memory lines end up directly above one another, which is the whole
 * reason to switch away from the grid.
 */
export function ProductRow({ product: p }: { product: Product }) {
  const { addItem } = useCart();
  const { t, locale } = useLocale();

  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shotRef = useCallback((el: HTMLImageElement | null) => {
    if (el && !el.complete) setPending(true);
  }, []);

  useEffect(() => () => clearTimeout(addedTimer.current ?? undefined), []);

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    addItem(
      { slug: p.slug, name: p.name, image: p.image, price: p.price },
      1,
      e.currentTarget.closest("[data-card]")?.querySelector("img"),
    );
    setAdded(true);
    clearTimeout(addedTimer.current ?? undefined);
    addedTimer.current = setTimeout(() => setAdded(false), ADDED_MS);
  };

  const specs = p.specs.slice(0, SPEC_LIMIT);

  return (
    <div
      className="product-row group flex gap-4 rounded-2xl border border-line bg-cloud p-3 sm:gap-5 sm:p-4"
      data-card
    >
      {/* ── shot ── */}
      <Link
        href={`/produit/${p.slug}`}
        aria-label={p.name}
        className="product-frame relative aspect-square w-24 shrink-0 self-start overflow-hidden rounded-xl border border-line bg-paper sm:w-36 lg:w-40"
      >
        {pending && <span className="skeleton absolute inset-0" aria-hidden />}
        <img
          ref={shotRef}
          src={p.image}
          alt={p.name}
          draggable={false}
          onLoad={() => setPending(false)}
          data-pending={pending || undefined}
          className="product-shot absolute inset-0 h-full w-full object-cover"
        />
        <span className="product-wash" aria-hidden />
      </Link>

      {/* ── everything else ──
          One column below sm, two from lg: the price and its button need to
          sit together, and on a phone that means under the specs rather than
          squeezed beside them. */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-sans text-[10px] font-semibold uppercase leading-none">
            <span className="text-ink">{p.brand}</span>
            <span className="text-line">/</span>
            <span className="text-faint">{catName(p.category, locale)}</span>
            <ProductBadges product={p} className="ms-1" />
          </div>

          <Link
            href={`/produit/${p.slug}`}
            className="mt-2 block font-display text-base font-bold leading-tight text-ink transition-colors group-hover:text-accent sm:text-lg"
          >
            {p.name}
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <StockLine product={p} />
            <span className="flex items-center gap-1 text-xs text-mute">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {p.rating.toFixed(1)}
              <span className="text-faint">({p.reviews})</span>
            </span>
          </div>

          {specs.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-line-soft pt-3 sm:grid-cols-2">
              {specs.map((s) => (
                <div key={s.k} className="flex min-w-0 items-baseline gap-2 text-xs">
                  <dt className="shrink-0 text-faint">{s.k}</dt>
                  <span aria-hidden className="h-px min-w-3 flex-1 bg-line-soft" />
                  <dd className="truncate font-medium text-mute">{s.v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* ── price and action ── */}
        <div className="flex shrink-0 items-end justify-between gap-3 lg:w-44 lg:flex-col lg:items-end lg:justify-start lg:border-s lg:border-line-soft lg:ps-6">
          <div className="lg:text-end">
            <p className="flex items-baseline gap-1.5 lg:justify-end">
              <span className="font-display text-xl font-bold text-ink">
                {p.price.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs font-medium text-mute">DA</span>
            </p>
            {p.oldPrice && (
              <p className="mt-0.5 text-xs text-faint line-through lg:text-end">
                {p.oldPrice.toLocaleString("fr-FR")} DA
              </p>
            )}
          </div>

          <button
            disabled={!isOrderable(p)}
            onClick={add}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed lg:mt-3 lg:w-full ${
              isOrderable(p)
                ? "btn-accent"
                : "border border-line bg-paper text-mute"
            }`}
          >
            <span className="grid">
              <span
                className={`col-start-1 row-start-1 flex items-center justify-center gap-2 transition-all duration-200 ease-out ${
                  added ? "-translate-y-[70%] opacity-0" : "translate-y-0 opacity-100"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                {p.preorder ? t("c.preorder") : p.stock ? t("c.addToCart") : t("c.unavailable")}
              </span>
              <span
                aria-hidden={!added}
                className={`pointer-events-none col-start-1 row-start-1 flex items-center justify-center gap-2 transition-all duration-200 ease-out ${
                  added ? "translate-y-0 opacity-100" : "translate-y-[70%] opacity-0"
                }`}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                {t("c.added")}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
