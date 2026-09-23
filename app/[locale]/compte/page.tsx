"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ChevronRight, LogOut, MessageCircle, Package, X } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { initialOf, useAccount } from "@/components/auth/useAccount";
import { useLoyalty } from "@/components/loyalty/useLoyalty";
import { PointsCard } from "@/components/loyalty/PointsCard";
import { MyCoupons } from "@/components/loyalty/MyCoupons";
import { PointsHistory } from "@/components/loyalty/PointsHistory";
import { signOut, type Account } from "@/lib/auth/accounts";
import { ordersForPhone, type OrderStatus, type TrackedOrder } from "@/lib/checkout/tracking";
import { formatPhone } from "@/lib/checkout/validate";
import { withLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/locales";
import { fill } from "@/lib/pcbuilder/engine";
import { formatDA } from "@/lib/products";

const tagOf = (locale: Locale) => (locale === "ar" ? "ar-DZ" : locale === "en" ? "en-GB" : "fr-DZ");
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The account.
 *
 * Signed in, it is the customer's orders and the details they signed up with.
 * Signed out there is nothing here at all — no orders, no details — so rather
 * than an interstitial offering the way in, this goes straight to it. Signing
 * out from the button below lands on the sign-in page the same way: the
 * session clears, the account becomes null, and the effect takes it from
 * there.
 *
 * `replace` rather than `push`, so Back does not come straight back to a page
 * that will only bounce again. Signing in from there returns here, which is
 * where `returnPath` sends a customer with no `?retour=` of their own.
 *
 * Until the session has been read from storage it shows neither, so a
 * signed-in customer never sees a flash of the sign-in page.
 */
export default function AccountPage() {
  const { account, ready } = useAccount();
  const { locale } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (ready && !account) router.replace(withLocale("/connexion", locale));
  }, [ready, account, router, locale]);

  if (!ready || !account) return <main className="min-h-svh" />;
  return <SignedIn account={account} />;
}

function SignedIn({ account }: { account: Account }) {
  const { t, locale } = useLocale();
  const { card } = useLoyalty();
  const reduced = useReducedMotion();
  const orders = useMemo(() => ordersForPhone(account.phone), [account.phone]);
  const since = new Intl.DateTimeFormat(tagOf(locale), { month: "long", year: "numeric" }).format(account.createdAt);

  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: EASE },
  });

  return (
    <main className="min-h-svh">
      <section className="border-b border-line bg-cloud pb-10 pt-28 lg:pb-14 lg:pt-36">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6 px-5 lg:px-8">
          <div className="flex items-center gap-5">
            <motion.span
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink font-display text-xl font-bold text-white lg:h-20 lg:w-20 lg:text-2xl"
            >
              {initialOf(account)}
            </motion.span>
            <div>
              <p className="text-[11px] font-semibold uppercase text-faint">{t("ac.crumb")}</p>
              <h1 className="mt-1.5 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
                {fill(t("ac.in.title"), { name: account.firstName })}
              </h1>
              <p className="mt-2 text-mute">{fill(t("ac.in.since"), { date: since })}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-ink/25"
          >
            <LogOut className="h-4 w-4 rtl:rotate-180" />
            {t("auth.signOut")}
          </button>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-start gap-6 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:px-8 lg:py-14">
        {/* ── the loyalty card, and the coupons it has bought ──
            MODULE 8 lives here rather than on a page of its own: points, the
            coupons they became and the orders that earned them are all one
            account, and a customer looking for any of the three looks here. */}
        {card && (
          <motion.div {...rise(0.05)} className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
            <PointsCard card={card} />
            <MyCoupons coupons={card.coupons} />
          </motion.div>
        )}

        {/* ── the orders ── */}
        <motion.section {...rise(0.05)} aria-labelledby="ac-orders" className="rounded-3xl border border-line bg-white p-6 sm:p-8 lg:col-start-1 lg:row-start-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="ac-orders" className="font-display text-xl font-bold text-ink">
              {t("ac.orders")}
            </h2>
            {orders.length > 0 && (
              <p className="text-[13px] tabular-nums text-mute">
                {orders.length === 1 ? t("ac.orders.one") : fill(t("ac.orders.many"), { n: String(orders.length) })}
              </p>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="mt-8 flex flex-col items-start rounded-2xl bg-cloud p-6 sm:p-8">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-accent">
                <Package className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <p className="mt-4 font-display text-lg font-bold text-ink">{t("ac.orders.empty")}</p>
              <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-mute">
                {fill(t("ac.orders.emptyDesc"), { phone: "" })}
                <span dir="ltr" className="font-medium tabular-nums text-ink">
                  {formatPhone(account.phone)}
                </span>
              </p>
              <Link
                href="/catalogue"
                className="btn-accent group mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
              >
                {t("ac.shopCta")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-line-soft">
              {orders.map((order, i) => (
                <motion.li
                  key={order.number}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.07, ease: EASE }}
                >
                  <OrderRow order={order} />
                </motion.li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* ── the details, then where every point came from ── */}
        <motion.aside {...rise(0.15)} className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-display text-lg font-bold text-ink">{t("ac.details")}</h2>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-[12.5px] text-mute">{t("ac.details.name")}</dt>
                <dd className="mt-1 text-[14.5px] font-medium text-ink">
                  {account.firstName} {account.lastName}
                </dd>
              </div>
              <div className="border-t border-line-soft pt-4">
                <dt className="text-[12.5px] text-mute">{t("co.phone")}</dt>
                <dd dir="ltr" className="mt-1 text-[14.5px] font-medium tabular-nums text-ink rtl:text-end">
                  {formatPhone(account.phone)}
                </dd>
              </div>
              <div className="border-t border-line-soft pt-4">
                <dt className="text-[12.5px] text-mute">{t("ac.details.email")}</dt>
                <dd className="mt-1 text-[14.5px] font-medium text-ink">
                  {account.email ? (
                    <span dir="ltr" className="break-all">
                      {account.email}
                    </span>
                  ) : (
                    <span className="font-normal text-faint">{t("ac.details.none")}</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-5 rounded-xl bg-paper px-4 py-3 text-[13px] leading-relaxed text-mute">{t("ac.details.note")}</p>
            <Link
              href="/contact"
              className="mt-5 inline-flex items-center gap-2 text-[13.5px] font-semibold text-accent transition-colors hover:text-accent-deep"
            >
              <MessageCircle className="h-4 w-4" />
              {t("ac.contactCta")}
            </Link>
          </div>

          {card && <PointsHistory entries={card.entries} />}
        </motion.aside>
      </div>
    </main>
  );
}

/** A status as the customer reads it — see the tracking page. */
function statusKey(status: OrderStatus, pickup: boolean): string {
  if (pickup && status === "out") return "tr.status.outPickup";
  if (pickup && status === "delivered") return "tr.status.deliveredPickup";
  return `tr.status.${status}`;
}

function OrderRow({ order }: { order: TrackedOrder }) {
  const { t, locale } = useLocale();
  const { draft } = order;
  const pickup = draft.delivery.method === "pickup";
  const day = new Intl.DateTimeFormat(tagOf(locale), { day: "numeric", month: "long" });
  const [first, ...rest] = draft.lines;
  const done = order.status === "delivered";
  const cancelled = order.status === "cancelled";

  return (
    <Link
      href={`/suivi?commande=${encodeURIComponent(order.number)}`}
      className="group -mx-3 flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-2xl px-3 py-4 transition-colors hover:bg-cloud sm:flex-nowrap"
    >
      {/* on a phone: what and when on the first line, where it is and what it
          costs on the second */}
      <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span dir="ltr" className="whitespace-nowrap text-[14.5px] font-semibold tracking-[0.02em] text-ink">
            {order.number}
          </span>
          {order.history.received && <span className="text-[12.5px] text-faint">{day.format(order.history.received)}</span>}
        </p>
        <p className="mt-1 truncate text-[13.5px] text-mute">
          {first && (
            <span dir="ltr">
              {first.qty > 1 && `${first.qty} × `}
              {first.name}
            </span>
          )}
          {rest.length > 0 && <span className="text-faint"> {fill(t("ac.orders.more"), { n: String(rest.length) })}</span>}
        </p>
      </div>

      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium ${
          cancelled ? "bg-alert/[0.07] text-alert" : done ? "bg-ink/[0.06] text-ink" : "bg-accent/[0.08] text-accent"
        }`}
      >
        {cancelled ? (
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : done ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        )}
        {t(statusKey(order.status, pickup))}
      </span>

      <span
        className={`ms-auto shrink-0 text-end text-[14px] font-semibold tabular-nums sm:ms-0 sm:w-28 ${cancelled ? "text-faint line-through" : "text-ink"}`}
      >
        {formatDA(draft.shown.total, locale)}
      </span>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink sm:block rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}
