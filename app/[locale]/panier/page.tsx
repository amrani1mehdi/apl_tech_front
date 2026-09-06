"use client";

import { Link } from "@/components/i18n/LocaleLink";
import { AnimatePresence, motion } from "motion/react";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Truck,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName } from "@/lib/i18n";
import { formatDA, getProduct } from "@/lib/products";

const FREE_FROM = 100000;
const DELIVERY = 800;

export default function CartPage() {
  const { items, subtotal, count, setQty, removeItem } = useCart();
  const { t, locale } = useLocale();

  const delivery = subtotal === 0 || subtotal >= FREE_FROM ? 0 : DELIVERY;
  const total = subtotal + delivery;
  const toFree = Math.max(0, FREE_FROM - subtotal);
  const itemsWord = count > 1 ? t("cart.itemsP") : t("cart.items");

  return (
    <main className="min-h-svh pt-28 lg:pt-36">
      <div className="mx-auto max-w-[1320px] px-5 pb-20 lg:px-8 lg:pb-28">
        {items.length === 0 ? (
          <div className="py-20 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-line text-faint">
              <ShoppingBag className="h-7 w-7" />
            </span>
            <h1 className="mt-6 font-display text-3xl font-bold text-ink">{t("cart.empty")}</h1>
            <p className="mt-3 text-mute">{t("cart.empty.desc")}</p>
            <Link
              href="/catalogue"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper"
            >
              {t("cart.explore")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-ink">
              {t("cart.title")} <span className="text-mute">({count} {itemsWord})</span>
            </h1>

            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
              <div>
                <ul className="divide-y divide-line border-y border-line">
                  <AnimatePresence initial={false}>
                    {items.map((it) => {
                      const prod = getProduct(it.slug);
                      return (
                        <motion.li
                          key={it.slug}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="flex gap-4 py-5"
                        >
                          <Link
                            href={`/produit/${it.slug}`}
                            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-cloud sm:h-28 sm:w-28"
                          >
                            <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                          </Link>

                          <div className="flex flex-1 flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                {prod && (
                                  <p className="font-sans text-[10px] font-semibold uppercase text-faint">
                                    {catName(prod.category, locale)}
                                  </p>
                                )}
                                <Link
                                  href={`/produit/${it.slug}`}
                                  className="font-medium text-ink hover:text-accent"
                                >
                                  {it.name}
                                </Link>
                              </div>
                              <button
                                aria-label="remove"
                                onClick={() => removeItem(it.slug)}
                                className="text-faint transition-colors hover:text-accent"
                              >
                                <Trash2 className="h-[18px] w-[18px]" />
                              </button>
                            </div>

                            <div className="mt-auto flex items-end justify-between pt-3">
                              <div className="flex items-center gap-1 rounded-full border border-line">
                                <button
                                  aria-label="-"
                                  onClick={() => setQty(it.slug, it.qty - 1)}
                                  className="grid h-9 w-9 place-items-center text-ink hover:text-accent"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-7 text-center text-sm font-medium">{it.qty}</span>
                                <button
                                  aria-label="+"
                                  onClick={() => setQty(it.slug, it.qty + 1)}
                                  className="grid h-9 w-9 place-items-center text-ink hover:text-accent"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="font-display text-lg font-bold text-ink">
                                {formatDA(it.price * it.qty)}
                              </p>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>

                <Link
                  href="/catalogue"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-mute transition-colors hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {t("c.continueShopping")}
                </Link>
              </div>

              <aside className="lg:sticky lg:top-28 lg:self-start">
                <div className="rounded-2xl border border-line bg-cloud p-6">
                  <h2 className="font-display text-lg font-bold text-ink">{t("cart.summary")}</h2>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-mute">{t("c.subtotal")}</span>
                      <span className="font-medium text-ink">{formatDA(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-mute">{t("cart.delivery")}</span>
                      <span className="font-medium text-ink">
                        {delivery === 0 ? t("cart.free") : formatDA(delivery)}
                      </span>
                    </div>
                    {toFree > 0 && (
                      <p className="rounded-lg bg-paper px-3 py-2 text-xs text-mute">
                        {t("cart.toFree1")}{" "}
                        <span className="font-semibold text-accent">{formatDA(toFree)}</span>{" "}
                        {t("cart.toFree2")}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
                    <span className="font-medium text-ink">{t("c.total")}</span>
                    <span className="font-display text-2xl font-bold text-ink">{formatDA(total)}</span>
                  </div>

                  <Link
                    href="/commande"
                    className="btn-accent group mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"
                  >
                    {t("cart.checkout")}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
                  </Link>

                  <div className="mt-5 space-y-2.5 border-t border-line pt-5">
                    {[
                      { icon: Banknote, key: "feat.cod.t" },
                      { icon: Truck, key: "feat.delivery.t" },
                      { icon: ShieldCheck, key: "feat.warranty.t" },
                    ].map((b) => (
                      <p key={b.key} className="flex items-center gap-2.5 text-xs text-mute">
                        <b.icon className="h-4 w-4 text-accent" /> {t(b.key)}
                      </p>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
