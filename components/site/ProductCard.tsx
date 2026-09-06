"use client";

import { Link } from "@/components/i18n/LocaleLink";
import { Star, Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName } from "@/lib/i18n";
import { type Product } from "@/lib/products";

export function ProductCard({ product: p }: { product: Product }) {
  const { addItem } = useCart();
  const { t, locale } = useLocale();

  return (
    <div className="group product-card" data-card>
      <div className="product-frame relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-paper">
        <Link href={`/produit/${p.slug}`} aria-label={p.name}>
          <img
            src={p.image}
            alt={p.name}
            draggable={false}
            // no zoom on hover: the frame clips, so scaling up crops the
            // product out of its own photo. The wash and the lift carry the
            // hover without touching the framing.
            className="absolute inset-0 h-full w-full object-cover"
          />
        </Link>

        {/* over the shot, under everything that has to stay readable */}
        <span className="product-wash" aria-hidden />

        {p.badge && (
          <span
            className={`pointer-events-none absolute start-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              p.badge.tone === "accent" ? "bg-accent-gradient text-white" : "bg-ink text-paper"
            }`}
          >
            {p.badge.label}
          </span>
        )}
        {!p.stock && (
          <span className="pointer-events-none absolute end-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-semibold text-mute backdrop-blur">
            {t("c.outOfStock")}
          </span>
        )}

        {p.stock && (
          <button
            aria-label="favoris"
            className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink opacity-0 backdrop-blur transition-all duration-300 hover:text-accent group-hover:opacity-100"
          >
            <Heart className="h-[17px] w-[17px]" />
          </button>
        )}

        <button
          disabled={!p.stock}
          onClick={(e) =>
            addItem(
              { slug: p.slug, name: p.name, image: p.image, price: p.price },
              1,
              e.currentTarget.closest("[data-card]")?.querySelector("img"),
            )
          }
          // the bar only ever shows on hover, so it carries the accent too —
          // except out of stock, where a live-looking CTA would be a lie
          className={`absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 py-3 text-sm font-semibold text-paper transition-transform duration-300 ease-out group-hover:translate-y-0 disabled:cursor-not-allowed ${
            p.stock ? "bg-accent-gradient-x" : "bg-ink"
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          {p.stock ? t("c.addToCart") : t("c.unavailable")}
        </button>
      </div>

      <div className="mt-3.5">
        <p className="font-sans text-[10px] font-semibold uppercase text-faint">
          {catName(p.category, locale)}
        </p>
        <Link
          href={`/produit/${p.slug}`}
          className="mt-1 block font-medium text-ink transition-colors group-hover:text-accent"
        >
          {p.name}
        </Link>
        <div className="mt-2 flex items-center justify-between">
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
          <span className="flex items-center gap-1 text-xs text-mute">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {p.rating.toFixed(1)}
            <span className="text-faint">({p.reviews})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
