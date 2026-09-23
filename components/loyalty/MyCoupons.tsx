"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Copy, Ticket as TicketIcon } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useCart } from "@/components/cart/CartProvider";
import { promoEffect } from "@/components/checkout/PromoField";
import { formatDay } from "@/components/loyalty/format";
import { promoOf, stateOf, type OwnedCoupon } from "@/lib/loyalty/wallet";
import { fill } from "@/lib/pcbuilder/engine";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The coupons already bought — FID-06.
 *
 * The same ticket as the shop, now printed: it carries a code, a date it
 * dies on, and the way to spend it. "Utiliser au panier" is the short way —
 * it writes the code into the cart and goes there, so nothing has to be
 * copied. The code is shown anyway, and copyable, because an order finished
 * on the phone with someone from the shop is still a way people buy here.
 *
 * Spent and expired coupons stay on the shelf rather than disappearing. A
 * coupon that vanishes the moment it is used looks like a coupon that was
 * never bought, and the points it cost are on the history right beside it.
 */
export function MyCoupons({ coupons }: { coupons: readonly OwnedCoupon[] }) {
  const { t } = useLocale();
  const reduced = useReducedMotion();

  return (
    <section aria-labelledby="fid-mine">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="fid-mine" className="font-display text-xl font-bold text-ink">
          {t("fid.mine")}
        </h2>

        {/* The shelf is a page of its own now, so the card has to say where
            points are spent — otherwise a balance sits here with nothing to
            do. */}
        <Link
          href="/coupons"
          className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-accent-deep"
        >
          {t("fid.shop")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </Link>
      </div>

      {coupons.length === 0 ? (
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-mute">{t("fid.mine.empty")}</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {coupons.map((coupon, i) => (
            <motion.div
              key={coupon.code}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.05, ease: EASE }}
            >
              <CouponTicket coupon={coupon} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function CouponTicket({ coupon }: { coupon: OwnedCoupon }) {
  const { t, locale } = useLocale();
  const { setPromoCode } = useCart();
  const [copied, setCopied] = useState(false);

  const promo = promoOf(coupon);
  const state = stateOf(coupon);
  const spent = state !== "active";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no clipboard — the code is on screen, which is what it is there for */
    }
  };

  return (
    <article className={`ticket ${spent ? "ticket-used" : "ticket-live"}`}>
      <span className="ticket-notch ticket-notch-top" aria-hidden />
      <span className="ticket-notch ticket-notch-bottom" aria-hidden />
      <span className="ticket-perf" aria-hidden />

      {/* ── the body: what it takes off, and until when ── */}
      <div className="min-w-0 flex-1 p-5 pe-7">
        <p
          className={`font-display text-[clamp(1.25rem,3.2vw,1.6rem)] font-bold leading-[1.1] tracking-[-0.01em] ${
            spent ? "text-mute" : "text-ink"
          }`}
        >
          {promo ? promoEffect(promo, t, locale) : coupon.couponId}
        </p>

        {/* the code, set like the code it is: monospaced, always read
            left-to-right, and struck through once it can no longer be used */}
        <p
          dir="ltr"
          className={`mt-2 font-mono text-[12.5px] tracking-[0.04em] rtl:text-end ${
            spent ? "text-faint line-through decoration-faint" : "text-accent"
          }`}
        >
          {coupon.code}
        </p>

        <p className="mt-2.5 text-[12px] leading-snug text-faint">
          {state === "used"
            ? coupon.usedOn
              ? fill(t("fid.mine.used"), { order: coupon.usedOn })
              : t("fid.mine.usedPlain")
            : state === "expired"
              ? fill(t("fid.mine.expired"), { date: formatDay(coupon.expiresAt, locale) })
              : fill(t("fid.mine.expires"), { date: formatDay(coupon.expiresAt, locale) })}
        </p>
      </div>

      {/* ── the stub: spending it, or the punch that says it is spent ── */}
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-2 p-4 ps-6"
        style={{ width: "var(--stub)" }}
      >
        {spent ? (
          <span className="grid h-11 w-11 place-items-center rounded-full border border-dashed border-line text-faint">
            <TicketIcon className="h-5 w-5" strokeWidth={1.6} />
          </span>
        ) : (
          <>
            {/* No trailing arrow on this one: the stub is the narrowest
                column on the page, and the glyph was costing the label the
                line it needs to stay on one. */}
            <Link
              href="/panier"
              onClick={() => setPromoCode(coupon.code)}
              className="btn-accent inline-flex w-full items-center justify-center rounded-full px-3 py-2.5 text-center text-[12.5px] font-semibold leading-tight"
            >
              {t("fid.mine.use")}
            </Link>
            <button
              type="button"
              onClick={() => void copy()}
              aria-label={t("fid.mine.copy")}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] font-medium text-mute transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copied ? <Check className="h-3 w-3 text-accent" strokeWidth={2.8} /> : <Copy className="h-3 w-3" />}
              <span aria-live="polite">{copied ? t("fid.mine.copied") : t("fid.mine.copyShort")}</span>
            </button>
          </>
        )}
      </div>
    </article>
  );
}
