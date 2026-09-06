"use client";

import { useState } from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { motion } from "motion/react";
import {
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  Store,
  Banknote,
  CreditCard,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { WILAYAS } from "@/lib/wilayas";

const FREE_FROM = 100000;

export default function CheckoutPage() {
  const { items, subtotal, count, clear } = useCart();
  const { t } = useLocale();

  const [method, setMethod] = useState<"home" | "desk">("home");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    wilaya: "",
    commune: "",
    address: "",
  });
  const [error, setError] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderNo] = useState(() => "FNC-" + Math.floor(100000 + Math.random() * 900000));

  const base = method === "home" ? 800 : 400;
  const delivery = subtotal >= FREE_FROM ? 0 : base;
  const total = subtotal + delivery;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    const required = [form.firstName, form.lastName, form.phone, form.wilaya];
    if (method === "home") required.push(form.address);
    if (required.some((v) => !v.trim())) {
      setError(true);
      return;
    }
    setPlaced(true);
    clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const field =
    "w-full rounded-xl border border-line bg-cloud px-4 py-3 text-sm text-ink placeholder:text-faint transition-colors focus:border-ink/40 focus:outline-none";

  // ── Confirmation ──
  if (placed) {
    return (
      <main className="grid min-h-svh place-items-center px-5 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg py-16 text-center"
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-gradient text-white">
            <Check className="h-8 w-8" strokeWidth={3} />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">{t("cart.placed.title")}</h1>
          <p className="mt-3 text-mute">{t("cart.placed.desc")}</p>
          <div className="mx-auto mt-6 max-w-xs rounded-xl border border-line bg-cloud p-4 text-start">
            <p className="font-mono text-xs text-faint">N°</p>
            <p className="font-display text-lg font-bold text-ink">{orderNo}</p>
            {form.wilaya && (
              <p className="mt-2 text-sm text-mute">
                {t("co.placedTo")} {form.wilaya}
              </p>
            )}
          </div>
          <Link
            href="/catalogue"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper"
          >
            {t("c.continueShopping")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </motion.div>
      </main>
    );
  }

  // ── Empty ──
  if (items.length === 0) {
    return (
      <main className="grid min-h-svh place-items-center px-5 pt-28">
        <div className="py-16 text-center">
          <h1 className="font-display text-3xl font-bold text-ink">{t("cart.empty")}</h1>
          <p className="mt-3 text-mute">{t("cart.empty.desc")}</p>
          <Link
            href="/catalogue"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper"
          >
            {t("cart.explore")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh pt-28 lg:pt-36">
      <div className="mx-auto max-w-[1320px] px-5 pb-20 lg:px-8 lg:pb-28">
        {/* header */}
        <nav className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase text-faint">
          <Link href="/" className="transition-colors hover:text-ink">APL TECH</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <Link href="/panier" className="transition-colors hover:text-ink">{t("cart.title")}</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-mute">{t("co.crumb")}</span>
        </nav>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.02em] text-ink">
          {t("co.title")}
        </h1>
        <p className="mt-3 max-w-xl text-mute">{t("co.subtitle")}</p>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          {/* form */}
          <div className="space-y-10">
            {/* contact */}
            <section>
              <h2 className="flex items-center gap-3 font-display text-lg font-bold text-ink">
                <span className="font-mono text-[11px] font-bold text-accent">01</span>
                {t("co.contact")}
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label={t("co.firstName")} required value={form.firstName} onChange={set("firstName")} cls={field} />
                <Input label={t("co.lastName")} required value={form.lastName} onChange={set("lastName")} cls={field} />
                <Input label={t("co.phone")} required type="tel" placeholder="0770 00 00 00" value={form.phone} onChange={set("phone")} cls={field} />
                <Input label={t("co.email")} type="email" placeholder="email@exemple.com" value={form.email} onChange={set("email")} cls={field} />
              </div>
            </section>

            {/* delivery */}
            <section>
              <h2 className="flex items-center gap-3 font-display text-lg font-bold text-ink">
                <span className="font-mono text-[11px] font-bold text-accent">02</span>
                {t("co.delivery")}
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { key: "home" as const, icon: Home, t: t("co.home"), d: t("co.homeDesc"), price: 800 },
                  { key: "desk" as const, icon: Store, t: t("co.desk"), d: t("co.deskDesc"), price: 400 },
                ].map((m) => {
                  const on = method === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-start transition-colors ${
                        on ? "border-accent bg-accent text-white" : "border-line bg-cloud text-ink hover:border-accent/40"
                      }`}
                    >
                      <m.icon className={`mt-0.5 h-5 w-5 shrink-0 ${on ? "text-paper" : "text-accent"}`} />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{m.t}</span>
                        <span className={`block text-xs ${on ? "text-paper/60" : "text-mute"}`}>{m.d}</span>
                      </span>
                      <span className="text-sm font-bold">
                        {subtotal >= FREE_FROM ? t("cart.free") : m.price.toLocaleString("fr-FR")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-mute">
                    {t("co.wilaya")} <span className="text-accent">*</span>
                  </span>
                  <select value={form.wilaya} onChange={(e) => setForm((f) => ({ ...f, wilaya: e.target.value }))} className={field}>
                    <option value="">{t("co.wilayaPick")}</option>
                    {WILAYAS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </label>
                <Input label={t("co.commune")} value={form.commune} onChange={set("commune")} cls={field} />
              </div>

              {method === "home" && (
                <div className="mt-4">
                  <Input label={t("co.address")} required value={form.address} onChange={set("address")} cls={field} />
                </div>
              )}
            </section>

            {/* payment */}
            <section>
              <h2 className="flex items-center gap-3 font-display text-lg font-bold text-ink">
                <span className="font-mono text-[11px] font-bold text-accent">03</span>
                {t("co.payment")}
              </h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-cloud p-4">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <Banknote className="h-5 w-5 text-accent" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink">{t("feat.cod.t")}</span>
                    <span className="block text-xs text-mute">{t("co.codDesc")}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-line p-4 opacity-55">
                  <span className="h-5 w-5 rounded-full border border-line" />
                  <CreditCard className="h-5 w-5 text-mute" />
                  <span className="text-sm text-mute">{t("co.cardSoon")}</span>
                </div>
              </div>
            </section>

            <Link href="/panier" className="inline-flex items-center gap-2 text-sm font-medium text-mute transition-colors hover:text-ink">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("co.back")}
            </Link>
          </div>

          {/* summary */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-line bg-cloud p-6">
              <h2 className="font-display text-lg font-bold text-ink">{t("co.itemsTitle")}</h2>

              <ul className="mt-5 max-h-64 space-y-3 overflow-y-auto">
                {items.map((it) => (
                  <li key={it.slug} className="flex items-center gap-3">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                      <span className="absolute -end-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-paper">
                        {it.qty}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{it.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-ink">{formatDA(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-mute">{t("c.subtotal")} ({count})</span>
                  <span className="font-medium text-ink">{formatDA(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mute">{t("cart.delivery")}</span>
                  <span className="font-medium text-ink">
                    {delivery === 0 ? t("cart.free") : formatDA(delivery)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
                <span className="font-medium text-ink">{t("c.total")}</span>
                <span className="font-display text-2xl font-bold text-ink">{formatDA(total)}</span>
              </div>

              {error && (
                <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
                  {t("co.fill")}
                </p>
              )}

              <button
                onClick={submit}
                className="btn-accent group mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"
              >
                {t("co.confirm")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
              </button>

              <div className="mt-5 space-y-2.5 border-t border-line pt-5">
                <p className="flex items-center gap-2.5 text-xs text-mute">
                  <Truck className="h-4 w-4 text-accent" /> {t("feat.delivery.t")}
                </p>
                <p className="flex items-center gap-2.5 text-xs text-mute">
                  <ShieldCheck className="h-4 w-4 text-accent" /> {t("feat.warranty.t")}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  required,
  type = "text",
  placeholder,
  value,
  onChange,
  cls,
}: {
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cls: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-mute">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} className={cls} />
    </label>
  );
}
