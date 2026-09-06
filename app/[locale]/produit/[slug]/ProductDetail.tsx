"use client";

import { useState } from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Star,
  Minus,
  Plus,
  ShoppingBag,
  ChevronRight,
  Truck,
  Banknote,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { catName, withLocale } from "@/lib/i18n";
import { getByCategory, type Product } from "@/lib/products";

const POSITIONS = ["50% 50%", "25% 35%", "75% 60%"];

export function ProductDetail({ product: p }: { product: Product }) {
  const { addItem } = useCart();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);

  const discount = p.oldPrice
    ? Math.round((1 - p.price / p.oldPrice) * 100)
    : 0;

  const related = getByCategory(p.category)
    .filter((x) => x.slug !== p.slug)
    .slice(0, 4);

  const add = () =>
    addItem(
      { slug: p.slug, name: p.name, image: p.image, price: p.price },
      qty,
      document.querySelector<HTMLImageElement>("[data-hero-image]"),
    );

  const buyNow = () => {
    add();
    router.push(withLocale("/panier", locale));
  };

  return (
    <main className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 py-5 font-sans text-[11px] font-semibold uppercase text-faint">
          <Link href="/" className="transition-colors hover:text-ink">APL TECH</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <Link href={`/catalogue?cat=${p.category}`} className="transition-colors hover:text-ink">
            {catName(p.category, locale)}
          </Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-mute">{p.name}</span>
        </nav>

        {/* main */}
        <div className="grid grid-cols-1 gap-10 py-6 lg:grid-cols-2 lg:gap-16">
          {/* gallery */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-cloud"
            >
              <img
                src={p.image}
                alt={p.name}
                data-hero-image
                style={{ objectPosition: POSITIONS[view] }}
                className="h-full w-full object-cover transition-all duration-500"
              />
              {p.badge && (
                <span
                  className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${
                    p.badge.tone === "accent" ? "bg-accent-gradient text-white" : "bg-ink text-paper"
                  }`}
                >
                  {p.badge.label}
                </span>
              )}
            </motion.div>
            <div className="mt-3 flex gap-3">
              {POSITIONS.map((pos, i) => (
                <button
                  key={i}
                  onClick={() => setView(i)}
                  className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 transition-colors ${
                    view === i ? "border-ink" : "border-line opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={p.image}
                    alt=""
                    style={{ objectPosition: pos }}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* info */}
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase text-accent">
              {p.brand}
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink">
              {p.name}
            </h1>

            <div className="mt-3 flex items-center gap-3">
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(p.rating)
                        ? "fill-accent text-accent"
                        : "fill-line text-line"
                    }`}
                  />
                ))}
              </span>
              <span className="text-sm text-mute">
                {p.rating.toFixed(1)} · {p.reviews} {t("c.reviews")}
              </span>
            </div>

            <p className="mt-5 max-w-md leading-relaxed text-mute">{p.short}</p>

            {/* price */}
            <div className="mt-7 flex items-end gap-3">
              <span className="font-display text-4xl font-bold text-ink">
                {p.price.toLocaleString("fr-FR")}
                <span className="ml-1.5 text-xl text-mute">DA</span>
              </span>
              {p.oldPrice && (
                <span className="mb-1 text-lg text-faint line-through">
                  {p.oldPrice.toLocaleString("fr-FR")}
                </span>
              )}
              {discount > 0 && (
                <span className="mb-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-accent">
                  {t("pd.save")} {discount}%
                </span>
              )}
            </div>

            {/* stock */}
            <p
              className={`mt-3 flex items-center gap-2 text-sm font-medium ${
                p.stock ? "text-ink" : "text-mute"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${p.stock ? "bg-accent" : "bg-faint"}`}
              />
              {p.stock ? t("pd.inStock") : t("c.outOfStock")}
            </p>

            {/* actions */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-line">
                <button
                  aria-label="Moins"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-11 w-11 place-items-center text-ink hover:text-accent"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium">{qty}</span>
                <button
                  aria-label="Plus"
                  onClick={() => setQty((q) => q + 1)}
                  className="grid h-11 w-11 place-items-center text-ink hover:text-accent"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                disabled={!p.stock}
                onClick={add}
                className="btn-accent group flex flex-1 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                {t("c.addToCart")}
              </button>
              <button
                disabled={!p.stock}
                onClick={buyNow}
                className="rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("pd.buy")}
              </button>
            </div>

            {/* trust */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: Truck, key: "feat.delivery.t" },
                { icon: Banknote, key: "feat.cod.t" },
                { icon: ShieldCheck, key: "feat.warranty.t" },
              ].map((b) => (
                <div
                  key={b.key}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-cloud px-3.5 py-3"
                >
                  <b.icon className="h-5 w-5 shrink-0 text-accent" />
                  <span className="text-xs font-medium text-ink">{t(b.key)}</span>
                </div>
              ))}
            </div>

            {/* specs */}
            <div className="mt-10">
              <h2 className="font-display text-lg font-bold text-ink">{t("pd.specs")}</h2>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {p.specs.map((s) => (
                  <div key={s.k} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm text-mute">{s.k}</dt>
                    <dd className="text-right text-sm font-medium text-ink">{s.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 flex items-center gap-2 text-xs text-faint">
                <Check className="h-4 w-4 text-accent" /> {t("pd.authentic")}
              </p>
            </div>
          </div>
        </div>

        {/* related */}
        {related.length > 0 && (
          <section className="border-t border-line py-16 lg:py-24">
            <Reveal>
              <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">
                {t("pd.related")}
              </h2>
            </Reveal>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
              {related.map((r, i) => (
                <motion.div
                  key={r.slug}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <ProductCard product={r} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
