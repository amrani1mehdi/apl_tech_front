"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, PackageSearch } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import { wilayaLabel, wilayaOf } from "@/lib/checkout/geo";
import { formatPhone } from "@/lib/checkout/validate";
import type { PlacedOrder } from "@/lib/checkout/order";

/**
 * After the button — the order number, what is owed, and what happens next.
 *
 * Cash on delivery changes what a confirmation is for. Nothing has been paid,
 * so "thank you for your purchase" is not true yet; what the customer needs is
 * to know the order exists, how much cash to have ready, and that a phone call
 * is coming — because an unexpected call from an unknown number is the call
 * people do not pick up, and an unconfirmed COD order does not ship.
 */
export function Confirmation({ order }: { order: PlacedOrder }) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const { draft, number } = order;

  const wilaya = wilayaOf(draft.delivery.wilaya);
  const days = draft.shown.delivery?.days;
  const pickup = draft.delivery.method === "pickup";

  const steps = [
    fill(t("placed.s1"), { phone: formatPhone(draft.customer.phone) }),
    days ? fill(t("placed.s2"), { min: days[0], max: days[1] }) : t("placed.s2"),
    t(pickup ? "placed.s3Pickup" : "placed.s3Home"),
  ];

  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <main className="min-h-svh pt-28 lg:pt-36">
      <div className="mx-auto max-w-2xl px-5 pb-24">
        <motion.div {...rise(0)} className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-paper">
            <Check className="h-7 w-7" strokeWidth={2.6} />
          </span>
          <h1 className="mt-6 font-display text-[clamp(1.9rem,4vw,2.6rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
            {t("cart.placed.title")}
          </h1>
          <p className="mt-3 text-[15px] text-mute">{fill(t("placed.lead"), { name: draft.customer.firstName })}</p>
        </motion.div>

        {/* The three facts, on one card — the number to quote on the phone,
            the cash to have ready, and where it is going. */}
        <motion.dl
          {...rise(0.12)}
          className="mt-10 grid overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-3"
        >
          <div className="border-b border-line-soft p-5 sm:border-b-0 sm:border-e">
            <dt className="text-[12.5px] text-mute">{t("placed.number")}</dt>
            <dd dir="ltr" className="mt-1.5 font-display text-[19px] font-bold tracking-[0.02em] text-ink rtl:text-end">
              {number}
            </dd>
          </div>
          <div className="border-b border-line-soft p-5 sm:border-b-0 sm:border-e">
            <dt className="text-[12.5px] text-mute">{t("placed.toPay")}</dt>
            <dd className="mt-1.5 font-display text-[19px] font-bold tabular-nums text-ink">
              {formatDA(draft.shown.total, locale)}
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-[12.5px] text-mute">{t("placed.delivery")}</dt>
            <dd className="mt-1.5 text-[14px] font-semibold leading-snug text-ink">
              {t(pickup ? "co.pickup" : "co.home")}
              <span className="block text-[13px] font-normal text-mute">
                {wilaya ? wilayaLabel(wilaya, locale) : draft.delivery.wilaya}
                {draft.delivery.commune && `, ${draft.delivery.commune}`}
              </span>
            </dd>
          </div>
        </motion.dl>

        <motion.section {...rise(0.22)} className="mt-10">
          <h2 className="font-display text-lg font-bold text-ink">{t("placed.next")}</h2>
          {/* A real sequence, so it is numbered — and drawn as one line the
              order travels down rather than three separate tips. */}
          <ol className="mt-5">
            {steps.map((text, i) => (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 && (
                  <span aria-hidden className="absolute start-[13px] top-8 h-[calc(100%-2rem)] w-px bg-line" />
                )}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-white text-[12.5px] font-semibold tabular-nums text-ink">
                  {i + 1}
                </span>
                <p className="pt-1 text-[14.5px] leading-relaxed text-ink">{text}</p>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* Tracking first: it is the next thing this customer will want, and
            the number travels with the link so they never have to copy it. */}
        <motion.div {...rise(0.3)} className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/suivi?commande=${encodeURIComponent(number)}`}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
          >
            <PackageSearch className="h-4 w-4" />
            {t("tr.submit")}
          </Link>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink/25"
          >
            {t("c.continueShopping")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
