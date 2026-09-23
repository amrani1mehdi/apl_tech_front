"use client";

import { motion, useReducedMotion } from "motion/react";
import { Banknote, Check, Loader2, Lock, Percent, Truck } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { promoEffect } from "@/components/checkout/PromoField";
import { formatPoints } from "@/components/loyalty/format";
import { tierReaches, type Coupon } from "@/lib/loyalty/program";
import type { Card } from "@/lib/loyalty/card";
import type { PromoKind } from "@/lib/checkout/promo";
import { fill } from "@/lib/pcbuilder/engine";
import { formatDA } from "@/lib/products";

const icons: Record<PromoKind, typeof Truck> = {
  shipping: Truck,
  fixed: Banknote,
  percent: Percent,
};

/**
 * A coupon on the shelf, built like anything else the shop sells: a face, the
 * terms under it, then the price and the way to take it.
 *
 * The face carries the value rather than a photograph — there is nothing to
 * photograph — so it is drawn as the coupon itself, torn along the bottom
 * where the stub comes away, wearing a wash of its own tier — bronze, silver
 * or gold — so a shelf of twelve sorts itself by eye before a word is read.
 */
export function CouponCard({
  coupon,
  card,
  busy,
  done,
  error,
  onBuy,
}: {
  coupon: Coupon;
  card: Card;
  busy: boolean;
  done: boolean;
  error: string | null;
  onBuy: () => void;
}) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();

  const locked = !tierReaches(card.tier.key, coupon.tier);
  const short = Math.max(0, coupon.cost - card.balance);
  const live = !locked && short === 0;
  const min = coupon.grant.minSubtotal;
  const Icon = icons[coupon.grant.kind];

  const terms = min
    ? fill(t("fid.shop.meta"), { min: formatDA(min, locale), n: coupon.validDays })
    : fill(t("fid.shop.valid"), { n: coupon.validDays });

  return (
    <article className="coupon-card group flex flex-col">
      {/* ── the face ── */}
      <div className="coupon-face aspect-[4/3]" data-tier={coupon.tier} data-locked={locked || undefined}>
        <span
          className={`absolute start-3.5 top-3.5 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] ${
            locked ? "bg-white text-faint shadow-[inset_0_0_0_1px_var(--color-line)]" : `tier-${coupon.tier}`
          }`}
        >
          {t(`fid.tier.${coupon.tier}`)}
        </span>

        <div className="coupon-body">
          <p
            className={`text-center font-display text-[clamp(1.4rem,2.3vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.015em] ${
              locked ? "text-mute" : "text-ink"
            }`}
          >
            {promoEffect(coupon.grant, t, locale)}
          </p>
        </div>

        {/* The stub names the kind of discount — what a real one carries
            below the tear, and the one thing a grid of twelve cannot say
            with the amount alone. */}
        <div className="coupon-stub">
          <p className={`flex items-center gap-1.5 text-[11.5px] font-medium ${locked ? "text-faint" : "text-mute"}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t(`fid.kind.${coupon.grant.kind}`)}
          </p>
        </div>

        <span className="coupon-tear" aria-hidden />
        <span className="coupon-punch coupon-punch-start" aria-hidden />
        <span className="coupon-punch coupon-punch-end" aria-hidden />
      </div>

      {/* ── the terms ── */}
      <p className="mt-3.5 min-h-[2.4rem] text-[12.5px] leading-snug text-mute">{terms}</p>

      {/* ── the price, and the way to take it ── */}
      <div className="mt-auto flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className={`text-[15.5px] font-semibold tabular-nums ${locked ? "text-mute" : "text-ink"}`}>
            {formatPoints(coupon.cost, t)}
          </p>
          <p
            aria-live="polite"
            className={`mt-0.5 text-[11.5px] leading-snug ${
              error ? "text-alert" : done ? "text-accent" : short > 0 && !locked ? "text-warn" : "text-faint"
            }`}
          >
            {error ??
              (done
                ? t("fid.shop.done")
                : locked
                  ? fill(t("fid.shop.locked"), { tier: t(`fid.tier.${coupon.tier}`) })
                  : short > 0
                    ? fill(t("fid.shop.short"), { n: formatPoints(short, t) })
                    : t("fid.shop.ready"))}
          </p>
        </div>

        {locked ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-faint">
            <Lock className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : (
          <motion.button
            type="button"
            onClick={onBuy}
            disabled={busy || done}
            whileTap={reduced || busy || done ? undefined : { scale: 0.97 }}
            aria-label={`${t("fid.shop.buy")} — ${promoEffect(coupon.grant, t, locale)}`}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-opacity ${
              done ? "bg-ink text-paper" : live ? "btn-accent" : "border border-line text-mute"
            } disabled:cursor-not-allowed`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {done && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
            {busy ? t("fid.shop.busy") : done ? t("c.added") : t("fid.shop.buy")}
          </motion.button>
        )}
      </div>
    </article>
  );
}
