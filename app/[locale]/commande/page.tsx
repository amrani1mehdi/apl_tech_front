"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Banknote, ChevronRight, CreditCard, Home, Loader2, Store, UserRound } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { PromoField } from "@/components/checkout/PromoField";
import { TotalsRows } from "@/components/checkout/Totals";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import { WILAYAS, communeLabel, communesOf, wilayaLabel, wilayaOf, type Commune } from "@/lib/checkout/geo";
import { quoteDelivery, type DeliveryMethod } from "@/lib/checkout/shipping";
import { redeemCoupon } from "@/lib/loyalty/wallet";
import { EmptyFace } from "@/components/site/EmptyFace";
import {
  PAYMENT_METHODS,
  draftOf,
  placeOrder,
  totalsOf,
  type PaymentMethodId,
  type PlacedOrder,
} from "@/lib/checkout/order";
import {
  FIELD_ORDER,
  emptyForm,
  formatPhone,
  isValidPhone,
  validateForm,
  type CheckoutForm,
  type FieldError,
} from "@/lib/checkout/validate";
import { ChoiceCard, Field, Select, Step, TextArea, TextInput } from "@/components/checkout/Fields";
import { Confirmation } from "./Confirmation";

const FORM_ID = "checkout-form";
const fieldId = (k: keyof CheckoutForm) => `co-${k}`;

/**
 * Checkout — MODULE 5, PAN-03 to PAN-06.
 *
 * One page, three steps, no account. Front-end only for now: the fees and
 * codes are placeholders (see `lib/checkout`), and `placeOrder` returns a
 * number without sending anything. Everything a backend needs to take over is
 * in that folder, so this page will not change when it does.
 *
 * Errors are shown for a field once it has been left, or for every field once
 * the order button has been pressed — never while someone is still typing
 * their first letters, which turns a form into a list of complaints about
 * things nobody has finished yet.
 */
export default function CheckoutPage() {
  const { ready, items, subtotal, count, promoCode, clear } = useCart();
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();

  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [method, setMethod] = useState<DeliveryMethod>("home");
  const [payment, setPayment] = useState<PaymentMethodId>("cod");
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutForm, true>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  /* The communes of the chosen wilaya, tagged with the wilaya they belong to.
     Held as a pair rather than cleared on change, so "still loading" is simply
     "the list on hand is for a different wilaya" — no loading flag to set, and
     no stale list shown for a moment after the wilaya changes. */
  const [communes, setCommunes] = useState<{ code: string; list: Commune[] } | null>(null);

  useEffect(() => {
    if (!form.wilaya) return;
    let live = true;
    communesOf(form.wilaya).then((list) => {
      if (live) setCommunes({ code: form.wilaya, list });
    });
    return () => {
      live = false;
    };
  }, [form.wilaya]);

  const communeList = communes?.code === form.wilaya ? communes.list : null;

  const totals = totalsOf(subtotal, promoCode, form.wilaya, method);
  const goods = totals.subtotal - totals.discount;
  const waived = totals.promo?.kind === "shipping";
  const wilaya = wilayaOf(form.wilaya);

  const errors = validateForm(form, method);
  const shown = (k: keyof CheckoutForm) => (submitted || touched[k] ? errors[k] : undefined);
  const message = (e?: FieldError) => (e ? t(`err.${e}`) : null);
  const missing = FIELD_ORDER.filter((k) => errors[k]).length;

  const contactDone = !errors.firstName && !errors.lastName && !errors.phone && !errors.email;
  const deliveryDone = !errors.wilaya && !errors.commune && !errors.address;

  const set = <K extends keyof CheckoutForm>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: keyof CheckoutForm) => setTouched((s) => (s[k] ? s : { ...s, [k]: true }));

  const submit = async () => {
    if (placing) return;
    setSubmitted(true);

    const first = FIELD_ORDER.find((k) => errors[k]);
    if (first) {
      const el = document.getElementById(fieldId(first));
      el?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      el?.focus({ preventScroll: true });
      return;
    }

    setPlacing(true);
    const order = await placeOrder(draftOf(items, form, method, payment, totals.promo?.code ?? null, totals));
    setPlacing(false);
    setPlaced(order);
    /* A loyalty coupon is good once (MODULE 8, FID-06). A campaign code is
       not in anyone's wallet, so this passes over it. */
    redeemCoupon(totals.promo?.code ?? null, order.number);
    clear();
    window.scrollTo({ top: 0 });
  };

  if (placed) return <Confirmation order={placed} />;
  if (!ready) return <main className="min-h-svh" />;

  if (items.length === 0) {
    return (
      <main className="grid min-h-svh place-items-center px-5 pt-28">
        <div className="py-16 text-center">
          {/* the same face the cart shows — one empty basket, one character */}
          <EmptyFace className="mx-auto mb-6 h-32 w-32" />
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

  const confirmLabel = placing ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {t("co.placing")}
    </>
  ) : (
    <>
      {t("co.confirm")}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
    </>
  );

  return (
    <main className="min-h-svh pb-28 pt-28 lg:pb-0 lg:pt-36">
      <div className="mx-auto max-w-[1320px] px-5 pb-16 lg:px-8 lg:pb-28">
        <nav className="flex items-center gap-1.5 text-[11.5px] font-medium text-faint">
          <Link href="/" className="transition-colors hover:text-ink">APL TECH</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <Link href="/panier" className="transition-colors hover:text-ink">{t("cart.title")}</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-mute">{t("co.crumb")}</span>
        </nav>

        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
          {t("co.title")}
        </h1>
        <p className="mt-3 flex items-center gap-2 text-[15px] text-mute">
          <UserRound className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.9} />
          {t("co.subtitle")}
        </p>

        <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
          <form
            id={FORM_ID}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="space-y-5"
          >
            {/* ── 1 — who ── */}
            <Step n={1} id="co-step-contact" title={t("co.contact")} done={contactDone}>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <Field id={fieldId("firstName")} label={t("co.firstName")} error={message(shown("firstName"))}>
                  <TextInput
                    id={fieldId("firstName")}
                    describedBy={`${fieldId("firstName")}-msg`}
                    invalid={Boolean(shown("firstName"))}
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    onBlur={() => touch("firstName")}
                  />
                </Field>
                <Field id={fieldId("lastName")} label={t("co.lastName")} error={message(shown("lastName"))}>
                  <TextInput
                    id={fieldId("lastName")}
                    describedBy={`${fieldId("lastName")}-msg`}
                    invalid={Boolean(shown("lastName"))}
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    onBlur={() => touch("lastName")}
                  />
                </Field>
                <Field
                  id={fieldId("phone")}
                  label={t("co.phone")}
                  error={message(shown("phone"))}
                  hint={t("co.phoneHint")}
                >
                  <TextInput
                    id={fieldId("phone")}
                    describedBy={`${fieldId("phone")}-msg`}
                    invalid={Boolean(shown("phone"))}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="0770 12 34 56"
                    dir="ltr"
                    className="rtl:text-end"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    /* Tidied into the way it is read out once it is valid —
                       "+213770123456" comes back as "0770 12 34 56", which is
                       what the courier will dial and what the customer will
                       recognise on the confirmation. */
                    onBlur={() => {
                      touch("phone");
                      if (isValidPhone(form.phone)) set("phone", formatPhone(form.phone));
                    }}
                  />
                </Field>
                <Field
                  id={fieldId("email")}
                  label={t("co.email")}
                  error={message(shown("email"))}
                  hint={t("co.emailHint")}
                >
                  <TextInput
                    id={fieldId("email")}
                    describedBy={`${fieldId("email")}-msg`}
                    invalid={Boolean(shown("email"))}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="email@exemple.com"
                    dir="ltr"
                    className="rtl:text-end"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    onBlur={() => touch("email")}
                  />
                </Field>
              </div>
            </Step>

            {/* ── 2 — where ── */}
            <Step n={2} id="co-step-delivery" title={t("co.delivery")} done={deliveryDone}>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <Field id={fieldId("wilaya")} label={t("co.wilaya")} error={message(shown("wilaya"))}>
                  <Select
                    id={fieldId("wilaya")}
                    describedBy={`${fieldId("wilaya")}-msg`}
                    invalid={Boolean(shown("wilaya"))}
                    autoComplete="address-level1"
                    value={form.wilaya}
                    onChange={(e) => {
                      /* A commune belongs to one wilaya; keeping the old one
                         would put Bab Ezzouar in Oran. */
                      setForm((f) => ({ ...f, wilaya: e.target.value, commune: "" }));
                    }}
                    onBlur={() => touch("wilaya")}
                  >
                    <option value="">{t("co.wilayaPick")}</option>
                    {WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>
                        {wilayaLabel(w, locale)}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field id={fieldId("commune")} label={t("co.commune")} error={message(shown("commune"))}>
                  <Select
                    id={fieldId("commune")}
                    describedBy={`${fieldId("commune")}-msg`}
                    invalid={Boolean(shown("commune"))}
                    autoComplete="address-level2"
                    disabled={!form.wilaya || !communeList}
                    value={form.commune}
                    onChange={(e) => set("commune", e.target.value)}
                    onBlur={() => touch("commune")}
                  >
                    <option value="">
                      {!form.wilaya ? t("co.communeFirst") : !communeList ? t("co.communeLoading") : t("co.communePick")}
                    </option>
                    {communeList?.map((c) => (
                      <option key={c[0]} value={c[0]}>
                        {communeLabel(c, locale)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* How it arrives — PAN-04. Priced for the chosen wilaya the
                  moment one is picked; before that each card says the price
                  depends on it, rather than showing a number that is about to
                  change. */}
              <fieldset className="mt-2">
                <legend className="text-[13px] font-medium text-ink">{t("co.method")}</legend>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["home", "pickup"] as const).map((m) => {
                    const quote = form.wilaya ? quoteDelivery(form.wilaya, m, goods, waived) : null;
                    return (
                      <ChoiceCard
                        key={m}
                        name="delivery-method"
                        value={m}
                        checked={method === m}
                        onChange={() => setMethod(m)}
                        icon={m === "home" ? <Home className="h-4 w-4" strokeWidth={2} /> : <Store className="h-4 w-4" strokeWidth={2} />}
                        title={t(m === "home" ? "co.home" : "co.pickup")}
                        description={t(m === "home" ? "co.homeDesc" : "co.pickupDesc")}
                        footer={
                          quote ? (
                            <>
                              <span className="text-[12.5px] text-mute">
                                {fill(t("co.days"), { min: quote.days[0], max: quote.days[1] })}
                              </span>
                              <span className="font-display text-[15px] font-bold tabular-nums text-ink">
                                {quote.free ? t("cart.free") : formatDA(quote.fee, locale)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[12.5px] text-faint">{t("co.feeAfterWilaya")}</span>
                          )
                        }
                      />
                    );
                  })}
                </div>
              </fieldset>

              {method === "home" && (
                <div className="mt-5">
                  <Field id={fieldId("address")} label={t("co.address")} error={message(shown("address"))}>
                    <TextArea
                      id={fieldId("address")}
                      describedBy={`${fieldId("address")}-msg`}
                      invalid={Boolean(shown("address"))}
                      autoComplete="street-address"
                      rows={2}
                      placeholder={t("co.addressPh")}
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      onBlur={() => touch("address")}
                    />
                  </Field>
                </div>
              )}
            </Step>

            {/* ── 3 — how it is paid — PAN-05 ── */}
            <Step n={3} id="co-step-payment" title={t("co.payment")} done>
              <fieldset>
                <legend className="sr-only">{t("co.payment")}</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((p) => (
                    <ChoiceCard
                      key={p.id}
                      name="payment-method"
                      value={p.id}
                      checked={payment === p.id}
                      disabled={!p.available}
                      onChange={() => setPayment(p.id)}
                      icon={p.id === "cod" ? <Banknote className="h-4 w-4" strokeWidth={2} /> : <CreditCard className="h-4 w-4" strokeWidth={2} />}
                      title={t(p.id === "cod" ? "co.cod" : "co.online")}
                      description={t(p.id === "cod" ? "co.codDesc" : "co.onlineDesc")}
                      aside={!p.available ? <span className="text-[12px] font-medium text-faint">{t("co.soon")}</span> : undefined}
                    />
                  ))}
                </div>
              </fieldset>
            </Step>

            <Link
              href="/panier"
              className="inline-flex items-center gap-2 text-sm font-medium text-mute transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("co.back")}
            </Link>
          </form>

          {/* ── the order ── */}
          <aside className="lg:sticky lg:top-28">
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-ink">
                  {t("co.itemsTitle")} <span className="text-[14px] font-semibold text-mute">({count})</span>
                </h2>
                <Link href="/panier" className="text-[13px] font-medium text-accent transition-colors hover:text-accent-deep">
                  {t("co.edit")}
                </Link>
              </div>

              <ul className="-me-2 mt-4 max-h-[15.5rem] space-y-3 overflow-y-auto pe-2">
                {items.map((it) => (
                  <li key={`${it.slug}::${it.variant ?? ""}`} className="flex items-center gap-3">
                    <span className="relative shrink-0">
                      <span className="block h-[52px] w-[52px] overflow-hidden rounded-lg border border-line bg-paper">
                        <img src={it.image} alt="" className="h-full w-full object-cover" />
                      </span>
                      {it.qty > 1 && (
                        <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10.5px] font-bold tabular-nums text-paper">
                          {it.qty}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span dir="ltr" className="line-clamp-2 text-[13px] leading-snug text-ink rtl:text-end">
                        {it.name}
                      </span>
                      {it.variant && <span className="block text-[12px] text-mute">{it.variant}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                      {formatDA(it.price * it.qty, locale)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-line-soft pt-4">
                <PromoField subtotal={subtotal} />
              </div>

              <div className="mt-4 border-t border-line-soft pt-4">
                <TotalsRows
                  totals={totals}
                  promo={totals.promo}
                  stage="checkout"
                  wilayaName={wilaya ? (locale === "ar" ? wilaya.ar : wilaya.name) : undefined}
                />
              </div>

              {/* The sentence that matters most on a cash-on-delivery order,
                  directly above the button that commits to it. */}
              <div className="mt-5 flex gap-3 rounded-xl bg-paper p-4">
                <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.9} />
                <div>
                  <p className="font-display text-[15px] font-bold text-ink">{t("co.payNow")}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-mute">
                    {totals.delivery
                      ? fill(t("co.payLater"), { total: formatDA(totals.total, locale) })
                      : t("co.payLaterUnknown")}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                form={FORM_ID}
                disabled={placing}
                className="btn-accent group mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-80"
              >
                {confirmLabel}
              </button>

              {submitted && missing > 0 && (
                <p role="alert" className="mt-3 text-center text-[12.5px] text-alert">
                  {fill(t(missing === 1 ? "co.missing1" : "co.missing"), { n: missing })}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ── phones: the total and the button, always in reach ──
          The summary sits under a form three screens long on a phone. Without
          this the customer fills the last field and then has to scroll to find
          out what they are paying and where to press. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-5 pt-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] text-mute">{totals.delivery ? t("co.toPay") : t("cart.totalExcl")}</p>
            <p className="font-display text-[20px] font-bold leading-tight tabular-nums text-ink">
              {formatDA(totals.total, locale)}
            </p>
          </div>
          <button
            type="submit"
            form={FORM_ID}
            disabled={placing}
            className="btn-accent group flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-80"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
