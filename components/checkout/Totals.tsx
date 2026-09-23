"use client";

import { motion, useReducedMotion } from "motion/react";
import { Truck } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import { FREE_DELIVERY_FROM, lowestFee } from "@/lib/checkout/shipping";
import type { Promo } from "@/lib/checkout/promo";
import type { Totals } from "@/lib/checkout/order";

function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[13.5px] text-mute">{label}</dt>
      <dd className="text-end">
        <span className="text-[13.5px] font-medium tabular-nums text-ink">{value}</span>
        {sub}
      </dd>
    </div>
  );
}

/**
 * The money, line by line — shared by the cart and the checkout so the two
 * pages cannot disagree about what an order costs. They used to: the cart
 * quoted a flat 800 DA while the checkout offered 400, for the same basket.
 *
 * `stage` is the one difference, and it is about what is *known*. On the cart
 * page no wilaya has been chosen, so delivery is a floor ("dès 250 DA") and the
 * total says it excludes it. On the checkout, once a wilaya is picked, both
 * become exact.
 */
export function TotalsRows({
  totals,
  promo,
  stage,
  wilayaName,
}: {
  totals: Totals;
  promo: Promo | null;
  stage: "cart" | "checkout";
  /** the chosen wilaya, for the delivery label — checkout only */
  wilayaName?: string;
}) {
  const { t, locale } = useLocale();
  const goods = totals.subtotal - totals.discount;
  const waived = promo?.kind === "shipping";
  const freeAnyway = waived || goods >= FREE_DELIVERY_FROM;
  const known = totals.delivery !== null || freeAnyway;

  let delivery: React.ReactNode;
  let deliverySub: React.ReactNode = null;

  if (totals.delivery) {
    delivery = totals.delivery.free ? t("cart.free") : formatDA(totals.delivery.fee, locale);
    /* The price that was waived, struck through — "free" means more next to
       what it would have cost. */
    if (totals.delivery.free) {
      deliverySub = (
        <span className="ms-2 text-[12px] tabular-nums text-faint line-through">
          {formatDA(totals.delivery.listFee, locale)}
        </span>
      );
    }
  } else if (freeAnyway) {
    delivery = t("cart.free");
  } else if (stage === "cart") {
    delivery = fill(t("cart.deliveryFrom"), { fee: formatDA(lowestFee(), locale) });
  } else {
    delivery = <span className="font-normal text-faint">{t("co.feeAfterWilaya")}</span>;
  }

  return (
    <dl className="space-y-2.5">
      <Row label={t("c.subtotal")} value={formatDA(totals.subtotal, locale)} />

      {promo && totals.discount > 0 && (
        <Row label={fill(t("promo.discount"), { code: promo.code })} value={`−${formatDA(totals.discount, locale)}`} />
      )}

      <Row
        label={wilayaName && stage === "checkout" ? fill(t("co.deliveryTo"), { wilaya: wilayaName }) : t("cart.delivery")}
        value={delivery}
        sub={deliverySub}
      />

      <div className="!mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <dt className="text-[14px] font-semibold text-ink">
          {known ? t("c.total") : t("cart.totalExcl")}
        </dt>
        <dd className="font-display text-[26px] font-bold leading-none tabular-nums tracking-[-0.01em] text-ink">
          {formatDA(totals.total, locale)}
        </dd>
      </div>
    </dl>
  );
}

/**
 * How far the order is from free delivery.
 *
 * Measured on the goods after any discount — the same figure the threshold in
 * `shipping.ts` is tested against, so the bar can never show "offered" on an
 * order that is then charged.
 */
export function FreeDeliveryMeter({ goods, waived }: { goods: number; waived: boolean }) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const reached = waived || goods >= FREE_DELIVERY_FROM;
  const share = reached ? 1 : Math.max(0.04, goods / FREE_DELIVERY_FROM);

  return (
    <div>
      <p className="flex items-center gap-2 text-[12.5px] leading-snug text-mute">
        <Truck className={`h-4 w-4 shrink-0 ${reached ? "text-accent" : "text-faint"}`} strokeWidth={1.9} />
        {reached
          ? t("cart.freeReached")
          : fill(t("cart.toFree"), { gap: formatDA(FREE_DELIVERY_FROM - goods, locale) })}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-line-soft" aria-hidden>
        <motion.div
          initial={false}
          animate={{ scaleX: share }}
          transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-full origin-left rounded-full bg-accent rtl:origin-right"
        />
      </div>
    </div>
  );
}
