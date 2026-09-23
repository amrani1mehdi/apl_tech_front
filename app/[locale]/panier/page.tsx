"use client";

import { Link } from "@/components/i18n/LocaleLink";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserRound,
} from "lucide-react";
import { lineHref, lineOf, useCart } from "@/components/cart/CartProvider";
import { EmptyFace } from "@/components/site/EmptyFace";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { PromoField } from "@/components/checkout/PromoField";
import { FreeDeliveryMeter, TotalsRows } from "@/components/checkout/Totals";
import { catName } from "@/lib/i18n";
import { formatDA, getProduct } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import { totalsOf } from "@/lib/checkout/order";
import { FREE_DELIVERY_FROM } from "@/lib/checkout/shipping";

/**
 * The cart — MODULE 5, PAN-01.
 *
 * Add, change a quantity, remove; kept in this browser between visits. Keeping
 * it across devices for signed-in customers needs accounts, which the shop does
 * not have yet — the cart already lives in one provider, so that becomes a
 * change of where the provider saves, not of this page.
 *
 * Delivery cannot be priced here: it depends on the wilaya, and asking for one
 * before the customer has decided to check out is asking for an address from
 * someone still browsing. So the summary gives the floor ("dès 250 DA"), says
 * the rest comes at the next step, and prices everything it can — the code is
 * applied here and carried to checkout.
 */
export default function CartPage() {
  const { ready, items, subtotal, count, setQty, removeItem, promoCode } = useCart();
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();

  const totals = totalsOf(subtotal, promoCode, "", "home");
  const itemsWord = count > 1 ? t("cart.itemsP") : t("cart.items");

  /* Nothing until the saved cart is read back — see `ready`. */
  if (!ready) return <main className="min-h-svh" />;

  if (items.length === 0) {
    return (
      <main className="min-h-svh pt-28 lg:pt-36">
        <div className="mx-auto max-w-[1320px] px-5 pb-20 lg:px-8 lg:pb-28">
          <div className="mx-auto max-w-md py-20 text-center">
            {/* No chip around it: a character wants room, and the bordered
                circle an icon needed was holding it to a thumbnail. */}
            <EmptyFace className="mx-auto h-36 w-36" />
            <h1 className="mt-6 font-display text-3xl font-bold text-ink">{t("cart.empty")}</h1>
            <p className="mt-3 text-mute">{t("cart.empty.desc")}</p>
            <Link
              href="/catalogue"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
            >
              {t("cart.explore")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh pt-28 lg:pt-36">
      <div className="mx-auto max-w-[1320px] px-5 pb-20 lg:px-8 lg:pb-28">
        <h1 className="flex flex-wrap items-baseline gap-x-3 font-display text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-ink">
          {t("cart.title")}
          <span className="text-[0.5em] font-semibold tracking-normal text-mute">
            {count} {itemsWord}
          </span>
        </h1>

        <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          {/* ── the lines ── */}
          <div>
            <ul className="overflow-hidden rounded-2xl border border-line bg-white">
              <AnimatePresence initial={false}>
                {items.map((it, i) => {
                  const prod = getProduct(it.slug);
                  const line = lineOf(it);
                  /* Null for a line with nowhere to go — see `lineHref`. */
                  const href = lineHref(it);
                  const thumbCls =
                    "h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-paper sm:h-28 sm:w-28";
                  const thumb = <img src={it.image} alt="" className="h-full w-full object-cover" />;
                  const nameCls = "mt-0.5 line-clamp-2 font-medium leading-snug text-ink rtl:text-end";

                  return (
                    <motion.li
                      key={line}
                      layout={!reduced}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className={i > 0 ? "border-t border-line-soft" : ""}
                    >
                      <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                        {href ? (
                          <Link href={href} className={thumbCls}>
                            {thumb}
                          </Link>
                        ) : (
                          <span className={thumbCls}>{thumb}</span>
                        )}

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {prod && (
                                <p className="text-[11.5px] font-medium text-faint">{catName(prod.category, locale)}</p>
                              )}
                              {href ? (
                                <Link href={href} dir="ltr" className={`${nameCls} transition-colors hover:text-accent`}>
                                  {it.name}
                                </Link>
                              ) : (
                                <p dir="ltr" className={nameCls}>
                                  {it.name}
                                </p>
                              )}
                              {it.variant && <p className="mt-0.5 text-[13px] text-mute">{it.variant}</p>}
                            </div>
                            <button
                              type="button"
                              aria-label={fill(t("cart.remove"), { name: it.name })}
                              onClick={() => removeItem(line)}
                              className="-me-1.5 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-paper hover:text-alert focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              <Trash2 className="h-[17px] w-[17px]" />
                            </button>
                          </div>

                          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                            <div className="flex items-center rounded-full border border-line" role="group" aria-label={it.name}>
                              <button
                                type="button"
                                aria-label={t("cart.less")}
                                onClick={() => setQty(line, it.qty - 1)}
                                className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span aria-live="polite" className="w-8 text-center text-sm font-semibold tabular-nums">
                                {it.qty}
                              </span>
                              <button
                                type="button"
                                aria-label={t("cart.more")}
                                onClick={() => setQty(line, it.qty + 1)}
                                className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="text-end">
                              {/* The unit price once there is more than one —
                                  otherwise the line is a total nobody can check
                                  against the product page. */}
                              {it.qty > 1 && (
                                <p className="text-[12px] tabular-nums text-faint">
                                  {it.qty} × {formatDA(it.price, locale)}
                                </p>
                              )}
                              <p className="font-display text-lg font-bold tabular-nums text-ink">
                                {formatDA(it.price * it.qty, locale)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            <Link
              href="/catalogue"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-mute transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("c.continueShopping")}
            </Link>
          </div>

          {/* ── the summary ── */}
          <aside className="lg:sticky lg:top-28">
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-ink">{t("cart.summary")}</h2>

              <div className="mt-5">
                <TotalsRows totals={totals} promo={totals.promo} stage="cart" />
              </div>

              {/* Only while there is a fee left to work out. Under a "Gratuite"
                  it would be explaining a price that is not coming. */}
              {!(totals.promo?.kind === "shipping" || totals.subtotal - totals.discount >= FREE_DELIVERY_FROM) && (
                <p className="mt-3 text-[12px] leading-snug text-faint">{t("cart.deliveryNext")}</p>
              )}

              <div className="mt-5 border-t border-line-soft pt-4">
                <FreeDeliveryMeter
                  goods={totals.subtotal - totals.discount}
                  waived={totals.promo?.kind === "shipping"}
                />
              </div>

              <div className="mt-4 border-t border-line-soft pt-4">
                <PromoField subtotal={subtotal} />
              </div>

              <Link
                href="/commande"
                className="btn-accent group mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"
              >
                {t("cart.checkout")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>

              {/* What the customer is not being asked for — an account, a card —
                  is the reassurance, so it sits under the button that commits. */}
              <ul className="mt-5 space-y-2 text-[12.5px] text-mute">
                <li className="flex items-center gap-2.5">
                  <UserRound className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.9} />
                  {t("cart.guest")}
                </li>
                <li className="flex items-center gap-2.5">
                  <Banknote className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.9} />
                  {t("feat.cod.t")}
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.9} />
                  {t("feat.warranty.t")}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
