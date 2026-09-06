"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { Star, Heart, ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName } from "@/lib/i18n";
import { ProductBadges, StockLine } from "./ProductBadges";
import { isOrderable, type Product } from "@/lib/products";

/** how long the button stays on its confirmed state after a click */
const ADDED_MS = 1400;

export function ProductCard({ product: p }: { product: Product }) {
  const { addItem } = useCart();
  const { t, locale } = useLocale();

  /* Starts false so the server — and a browser with no JS — renders the shot
     plainly visible. It only turns true once a ref has confirmed the image is
     still loading, which is the one case where a placeholder is worth having;
     a cached image never dims at all. */
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shotRef = useCallback((el: HTMLImageElement | null) => {
    if (el && !el.complete) setPending(true);
  }, []);

  // a card can be filtered out mid-confirmation
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

  return (
    <div className="group product-card" data-card>
      <div className="product-frame relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-paper">
        {/* only painted while a shot is genuinely in flight, so it never
            flashes over an image the browser already had */}
        {pending && <span className="skeleton absolute inset-0" aria-hidden />}

        <Link href={`/produit/${p.slug}`} aria-label={p.name}>
          <img
            ref={shotRef}
            src={p.image}
            alt={p.name}
            draggable={false}
            onLoad={() => setPending(false)}
            data-pending={pending || undefined}
            // A small push-in on hover — 4%, which crops about two percent off
            // each edge. The frame clips, so anything larger starts cutting
            // the product out of its own photograph; this is the most that
            // reads as the card leaning towards you rather than as a crop.
            className="product-shot absolute inset-0 h-full w-full object-cover"
          />
        </Link>

        {/* over the shot, under everything that has to stay readable */}
        <span className="product-wash" aria-hidden />

        {/* what is on offer, at the start edge */}
        <ProductBadges product={p} only="offer" className="absolute start-3 top-3" />
        {/* whether you can have it, at the end edge — where the heart would be
            if it were orderable, so the two never collide */}
        <ProductBadges product={p} only="availability" className="absolute end-3 top-3" />

        {isOrderable(p) && (
          <button
            aria-label="favoris"
            aria-pressed={wished}
            onClick={() => setWished((v) => !v)}
            className="wish absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink opacity-0 backdrop-blur group-hover:opacity-100"
            data-on={wished || undefined}
          >
            <Heart className="wish-heart h-[17px] w-[17px]" />
          </button>
        )}

        <button
          disabled={!isOrderable(p)}
          onClick={add}
          // the bar only ever shows on hover, so it carries the accent too —
          // except out of stock, where a live-looking CTA would be a lie
          className={`product-add absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 py-3 text-sm font-semibold text-paper group-hover:translate-y-0 disabled:cursor-not-allowed ${
            isOrderable(p) ? "bg-accent-gradient-x" : "bg-ink"
          }`}
        >
          {/* Both states occupy the same cell, so the bar keeps its width and
              nothing under the cursor moves as the label swaps.

              The hide is written in utilities rather than a class of our own
              on purpose: these are generated from this file, so they cannot
              go missing while the markup that needs them stays. A stylesheet
              that failed to reach the page would leave both labels painted
              over each other. */}
          <span className="grid">
            <span
              className={`col-start-1 row-start-1 flex items-center justify-center gap-2 transition-all duration-200 ease-out ${
                added ? "-translate-y-[70%] opacity-0" : "translate-y-0 opacity-100"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              {p.preorder
                ? t("c.preorder")
                : p.stock
                  ? t("c.addToCart")
                  : t("c.unavailable")}
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

      <div className="mt-3.5">
        {/* Brand first, category after it. The brand is what people scan a
            grid for — "is that the ASUS one" — and the category is already
            settled by the rail they came through. */}
        <p className="flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase leading-none">
          <span className="text-ink">{p.brand}</span>
          <span className="text-line">/</span>
          <span className="truncate text-faint">{catName(p.category, locale)}</span>
        </p>
        <Link
          href={`/produit/${p.slug}`}
          className="mt-1.5 block font-medium text-ink transition-colors group-hover:text-accent"
        >
          {p.name}
        </Link>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold text-ink">
              {p.price.toLocaleString("fr-FR")}
            </span>
            <span className="text-xs font-medium text-mute">DA</span>
            {p.oldPrice && (
              <span className="text-xs text-faint line-through">
                {p.oldPrice.toLocaleString("fr-FR")}
              </span>
            )}
          </p>
          <span className="flex shrink-0 items-center gap-1 text-xs text-mute">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {p.rating.toFixed(1)}
            <span className="text-faint">({p.reviews})</span>
          </span>
        </div>

        <StockLine product={p} className="mt-2" />
      </div>
    </div>
  );
}
