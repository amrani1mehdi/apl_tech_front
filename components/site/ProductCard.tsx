"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/components/i18n/LocaleLink";
import { Star, Cpu, ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName, withLocale } from "@/lib/i18n";
import { ProductBadges, StockLine } from "./ProductBadges";
import { WishHeart } from "./WishHeart";
import { enterBuilder } from "./BuilderTransition";
import { defaultVariantOf, isOrderable, saleModeOf, type Product } from "@/lib/products";

/** how long the button stays on its confirmed state after a click */
const ADDED_MS = 1400;

export function ProductCard({ product: p }: { product: Product }) {
  const { addItem } = useCart();
  const { t, locale } = useLocale();
  const router = useRouter();
  const builderOnly = saleModeOf(p) === "builder";

  /* Starts false so the server — and a browser with no JS — renders the shot
     plainly visible. It only turns true once a ref has confirmed the image is
     still loading, which is the one case where a placeholder is worth having;
     a cached image never dims at all. */
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shotRef = useCallback((el: HTMLImageElement | null) => {
    if (el && !el.complete) setPending(true);
  }, []);

  // a card can be filtered out mid-confirmation
  useEffect(() => () => clearTimeout(addedTimer.current ?? undefined), []);

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    addItem(
      { slug: p.slug, name: p.name, image: p.image, price: p.price, variant: defaultVariantOf(p) },
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

{/* Both kinds of badge stack at the start edge now. The heart used to
            share the end corner with the availability badge and was therefore
            hidden on anything you could not order — which is exactly the case
            where saving a product for later is most useful. It owns that
            corner outright instead, and the badges queue up opposite. */}
        <div className="pointer-events-none absolute start-3 top-3 flex flex-col items-start gap-1.5">
          <ProductBadges product={p} only="offer" />
          <ProductBadges product={p} only="availability" />
        </div>

        {/* PRD-13 — on every card, whatever the product's state. Stays put on
            touch, where there is no hover to reveal it. */}
        <WishHeart
          slug={p.slug}
          className="absolute end-3 top-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        />

        <button
          disabled={!builderOnly && !isOrderable(p)}
          onClick={
            builderOnly
              ? (e) => {
                  e.preventDefault();
                  /* A button, so the builder's entry transition never sees the
                     click — offer it the navigation, and make it ourselves if
                     it declines. */
                  const href = withLocale(`/configurateur?part=${encodeURIComponent(p.slug)}`, locale);
                  if (!enterBuilder(href)) router.push(href);
                }
              : add
          }
          // The bar only ever shows on hover, so it carries the accent too —
          // except out of stock, where a live-looking CTA would be a lie. A
          // builder-only part keeps the accent: it leads somewhere real.
          className={`product-add absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 py-3 text-sm font-semibold text-paper group-hover:translate-y-0 disabled:cursor-not-allowed ${
            builderOnly || isOrderable(p) ? "bg-accent-gradient-x" : "bg-ink"
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
              {saleModeOf(p) === "builder" ? (
                <Cpu className="h-4 w-4" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              {saleModeOf(p) === "builder"
                ? t("pd.addToBuilder")
                : p.preorder
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

      <div className="mt-3 sm:mt-3.5">
        {/* Brand first, category after it. The brand is what people scan a
            grid for — "is that the ASUS one" — and the category is already
            settled by the rail they came through. */}
        <p className="flex min-w-0 items-center gap-1.5 font-sans text-[10px] font-semibold uppercase leading-none">
          <span className="shrink-0 text-ink">{p.brand}</span>
          <span className="text-line">/</span>
          <span className="truncate text-faint">{catName(p.category, locale)}</span>
        </p>
        <Link
          href={`/produit/${p.slug}`}
          className="mt-1.5 block text-sm font-medium leading-snug text-ink transition-colors group-hover:text-accent sm:text-base"
        >
          <bdi>{p.name}</bdi>
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="font-display text-base font-bold text-ink sm:text-lg">
              {p.price.toLocaleString("fr-FR")}
            </span>
            <span className="text-[10px] font-medium text-mute sm:text-xs">DA</span>
            {p.oldPrice && (
              /* Below ~375px even this cannot share a line with the rating,
                 and the -12% badge on the shot has already said there is a
                 discount — so the reference price is what gives way. */
              <span className="hidden text-[10px] text-faint line-through min-[375px]:inline sm:text-xs">
                {p.oldPrice.toLocaleString("fr-FR")}
              </span>
            )}
          </p>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-mute sm:text-xs">
            <Star className="h-3 w-3 fill-accent text-accent sm:h-3.5 sm:w-3.5" />
            {p.rating.toFixed(1)}
            {/* the review count is the first thing to go: it is the least
                useful number in the row and the one that pushes it over */}
            <span className="hidden text-faint sm:inline">({p.reviews})</span>
          </span>
        </div>

        <StockLine product={p} className="mt-2" />
      </div>
    </div>
  );
}
