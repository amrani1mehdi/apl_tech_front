"use client";

import { useState } from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { motion, useReducedMotion } from "motion/react";
import { Banknote, Check, ChevronRight, ShieldCheck, Star, Truck } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { ProductCard } from "@/components/site/ProductCard";
import { BADGE_TONE } from "@/components/site/ProductBadges";
import { WishHeart } from "@/components/site/WishHeart";
import { Reveal } from "@/components/site/Reveal";
import { catName } from "@/lib/i18n";
import {
  discountPct,
  formatDA,
  galleryOf,
  openingVariant,
  relatedFor,
  savingsOf,
  specGroupsOf,
  variantLabel,
  type Product,
} from "@/lib/products";
import { ProductGallery } from "./ProductGallery";
import { ProductBody } from "./ProductBody";
import { BuyBox } from "./BuyBox";
import { ShareRow } from "./ShareRow";
import { VariantPicker } from "./VariantPicker";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* The info column arrives as a column, not as one block: each line follows the
   one above by a beat, which is what makes a page of dense product data read
   as something being presented rather than something being dumped. */
const rise = (i: number, reduced: boolean | null) => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: reduced ? 0.2 : 0.55,
    ease: EASE_OUT,
    delay: reduced ? 0 : 0.06 + i * 0.055,
  },
});

export function ProductDetail({ product: p }: { product: Product }) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();

  /* PRD-02 — group name → chosen option id. It lives here rather than in the
     buy box because the picker sits above the buy box on the page, and state
     shared by two siblings belongs to the one thing that holds both. */
  const [chosen, setChosen] = useState(() => openingVariant(p));

  const images = galleryOf(p);
  const groups = specGroupsOf(p);
  const related = relatedFor(p);
  const discount = discountPct(p);
  const saving = savingsOf(p);
  const variants = p.variants ?? [];
  /* The stagger below is positional, so a block that is only sometimes there
     has to push what follows it down the sequence rather than leave a hole. */
  const step = variants.length ? 1 : 0;

  return (
    <main className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        {/* breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 py-5 font-sans text-[11px] font-semibold uppercase text-faint">
          <Link href="/" className="transition-colors hover:text-ink">
            APL TECH
          </Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <Link href={`/catalogue?cat=${p.category}`} className="transition-colors hover:text-ink">
            {catName(p.category, locale)}
          </Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-mute">{p.name}</span>
        </nav>

        {/* ── main ── */}
        <div className="grid grid-cols-1 gap-10 py-6 lg:grid-cols-2 lg:gap-16">
          <ProductGallery
            images={images}
            alt={p.name}
            badge={
              p.badge ? (
                <span
                  className={`pointer-events-none absolute start-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${
                    BADGE_TONE[p.badge.tone]
                  }`}
                >
                  {/* Same isolation the shared badge component carries, and
                      needed for the same reason: an authored label is usually
                      a discount like "-12%", which holds no strong character
                      at all. In an RTL page the bidi algorithm resolved its
                      sign and its percent to the paragraph direction and drew
                      it as "12%-". `plaintext` runs the Unicode heuristic
                      instead, which falls back to LTR when there is nothing
                      strong to go on — and still reads RTL for a badge whose
                      label is an Arabic word. */}
                  <bdi className="[unicode-bidi:plaintext]">{p.badge.label}</bdi>
                </span>
              ) : null
            }
          />

          {/* ── info ── */}
          <div>
            <motion.div {...rise(0, reduced)} className="flex items-start justify-between gap-4">
              <p className="font-sans text-[11px] font-semibold uppercase text-accent">{p.brand}</p>
              {/* PRD-13 — the heart sits with the title, not lost in the buttons */}
              <WishHeart slug={p.slug} size="lg" className="-mt-2 shrink-0" />
            </motion.div>

            <motion.h1
              {...rise(1, reduced)}
              className="mt-2 font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink"
            >
              {p.name}
            </motion.h1>

            <motion.div {...rise(2, reduced)} className="mt-3 flex items-center gap-3">
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(p.rating) ? "fill-accent text-accent" : "fill-line text-line"
                    }`}
                  />
                ))}
              </span>
              <span className="text-sm text-mute">
                {p.rating.toFixed(1)} · {p.reviews} {t("c.reviews")}
              </span>
            </motion.div>

            <motion.p {...rise(3, reduced)} className="mt-5 max-w-md leading-relaxed text-mute">
              {p.short}
            </motion.p>

            <motion.div {...rise(4, reduced)} className="mt-7 flex flex-wrap items-end gap-3">
              <span className="font-display text-4xl font-bold text-ink">
                {p.price.toLocaleString("fr-FR")}
                <span className="ms-1.5 text-xl text-mute">DA</span>
              </span>
              {p.oldPrice && (
                <span className="mb-1 text-lg text-faint line-through">
                  {p.oldPrice.toLocaleString("fr-FR")}
                </span>
              )}
              {/* What the promotion is worth, not what it is called. The
                  percentage is still on the shot as a badge, and the struck
                  old price is right beside this — between them the customer
                  can check the arithmetic, which is not the same as being
                  asked to do it. */}
              {saving !== null && (
                <span className="mb-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-accent">
                  {t("pd.save")} {formatDA(saving, locale)}
                </span>
              )}
            </motion.div>

            {/* PRD-02 — the finish, above the buy box: it is part of deciding,
                not part of confirming */}
            {variants.length > 0 && (
              <motion.div {...rise(5, reduced)}>
                <VariantPicker
                  groups={variants}
                  chosen={chosen}
                  onChoose={(group, id) => setChosen((c) => ({ ...c, [group]: id }))}
                />
              </motion.div>
            )}

            {/* PRD-04 → PRD-09 all live here */}
            <motion.div {...rise(5 + step, reduced)}>
              <BuyBox product={p} variant={variantLabel(p, chosen)} />
            </motion.div>

            <motion.div
              {...rise(6 + step, reduced)}
              className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
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
            </motion.div>

            <motion.p
              {...rise(7 + step, reduced)}
              className="mt-5 flex items-center gap-2 text-xs text-faint"
            >
              <Check className="h-4 w-4 text-accent" /> {t("pd.authentic")}
            </motion.p>

            {/* PRD-14 */}
            <motion.div {...rise(8 + step, reduced)}>
              <ShareRow name={p.name} />
            </motion.div>
          </div>
        </div>

        {/* ── PRD-10 + PRD-11 ── */}
        <section className="border-t border-line py-14 lg:py-20">
          <ProductBody description={p.description} groups={groups} />
        </section>

        {/* ── PRD-12 ── */}
        {related.length > 0 && (
          <section className="border-t border-line py-16 lg:py-24">
            <Reveal>
              <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">
                {t("pd.related")}
              </h2>
            </Reveal>
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-6 sm:gap-y-9 lg:grid-cols-4">
              {related.map((r, i) => (
                <motion.div
                  key={r.slug}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: reduced ? 0.2 : 0.5,
                    ease: EASE_OUT,
                    delay: reduced ? 0 : i * 0.06,
                  }}
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
