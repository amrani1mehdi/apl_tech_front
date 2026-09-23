"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarClock, Check, CircleCheck, Loader2, MessageCircle, RotateCcw, Search, X } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { PageHeader } from "@/components/site/PageHeader";
import { Field, TextInput } from "@/components/checkout/Fields";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import type { Locale } from "@/lib/locales";
import { wilayaLabel, wilayaOf } from "@/lib/checkout/geo";
import { formatPhone, isValidPhone } from "@/lib/checkout/validate";
import {
  STEPS,
  estimatedArrival,
  isOrderNumber,
  normalizeOrderNumber,
  trackOrder,
  type OrderStatus,
  type TrackedOrder,
} from "@/lib/checkout/tracking";
import { DeliveryScene } from "./DeliveryScene";
import { ScannerScene, type ScanPhase } from "./ScannerScene";
import { useAccount } from "@/components/auth/useAccount";

const tagOf = (locale: Locale) => (locale === "ar" ? "ar-DZ" : locale === "en" ? "en-GB" : "fr-DZ");

const EASE = [0.16, 1, 0.3, 1] as const;

/* The search answers in well under a second, which is too quick to see the
   scan it is drawn as — so the scan is given this long at least, and the tick
   a moment to land before the order replaces the form. */
const SCAN_AT_LEAST = 1500;
const FOUND_HOLD = 800;

/* A faint dot grid behind the illustrations — the surface they stand on. */
const DOTS = {
  backgroundImage: "radial-gradient(rgba(21,21,26,0.09) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
} as const;

/**
 * Order tracking.
 *
 * Two fields and a button, then the order. No account, because the shop has
 * none and the customer never made one: the number from the confirmation and
 * the phone the order was placed with are the proof of whose order it is.
 *
 * The two illustrations carry the page. The scanner answers the form — it
 * reads while a search runs and shakes when nothing matches — and the delivery
 * scene answers the one question anyone opens this page with, before a word of
 * it is read.
 */
export function TrackClient() {
  const { t } = useLocale();
  const params = useSearchParams();
  const reduced = useReducedMotion();

  /* Filled in when arriving from the confirmation page's "Suivre ma commande". */
  const [number, setNumber] = useState(() => params.get("commande") ?? "");
  /* Null until the customer types in it. Until then a signed-in customer's own
     number stands in — the account page links here with the order number, and
     asking them to type the phone they signed in with would be asking twice. */
  const [typedPhone, setPhone] = useState<string | null>(null);
  const { account } = useAccount();
  const phone = typedPhone ?? (account ? formatPhone(account.phone) : "");
  const [touched, setTouched] = useState<{ number?: true; phone?: true }>({});
  const [submitted, setSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  /* Counts misses rather than flagging one, so a second wrong number shakes
     the parcel again. */
  const [misses, setMisses] = useState(0);
  const [found, setFound] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  /* for the scanner: whether the form is in use, and a count of changes to
     each field so every keystroke can light the label it writes */
  const [focused, setFocused] = useState(false);
  const [numberKeys, setNumberKeys] = useState(0);
  const [phoneKeys, setPhoneKeys] = useState(0);

  const numberError = !number.trim() ? "err.required" : !isOrderNumber(number) ? "tr.err.number" : null;
  const phoneError = !phone.trim() ? "err.required" : !isValidPhone(phone) ? "err.phone" : null;
  const showNumber = submitted || touched.number ? numberError : null;
  const showPhone = submitted || touched.phone ? phoneError : null;

  const phase: ScanPhase = found
    ? "found"
    : searching
      ? "scanning"
      : notFound
        ? "miss"
        : focused
          ? "reading"
          : number.trim() || phone.trim()
            ? "ready"
            : "idle";

  const submit = async () => {
    if (searching || found) return;
    setSubmitted(true);
    setNotFound(false);
    if (numberError || phoneError) {
      document.getElementById(numberError ? "tr-number" : "tr-phone")?.focus();
      return;
    }
    const pause = (ms: number) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
    setSearching(true);
    const [result] = await Promise.all([trackOrder(number, phone), pause(SCAN_AT_LEAST)]);
    setSearching(false);
    if (result.ok) {
      setFound(true);
      await pause(FOUND_HOLD);
      setFound(false);
      setOrder(result.order);
      /* The result opens where the form was. Only when the form's top has
         scrolled away — a phone, mostly — is the page brought back to it, so
         the delivery is watched from its first frame. */
      const top = (stage.current?.getBoundingClientRect().top ?? 0) - 88;
      if (top < 0) window.scrollBy({ top, behavior: reduced ? "auto" : "smooth" });
    } else {
      setNotFound(true);
      setMisses((n) => n + 1);
    }
  };

  const reset = () => {
    setOrder(null);
    setNumber("");
    setPhone(null);
    setTouched({});
    setSubmitted(false);
    setNotFound(false);
    setNumberKeys(0);
    setPhoneKeys(0);
  };

  const swap = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: -12 },
    transition: { duration: 0.45, ease: EASE },
  };

  return (
    <main className="min-h-svh">
      <PageHeader crumbKey="tr.crumb" titleKey="tr.title" subtitleKey="tr.subtitle" />

      <div ref={stage} className="mx-auto max-w-[1320px] px-5 py-10 lg:px-8 lg:py-14">
        {/* Not `initial={false}`, though it would spare the card its entrance.
            Motion hands that flag to every animated element inside the card
            for as long as it is on screen, and skips each one's first
            animation — which, for the scanner's looping beam, float and
            lights, is the loop itself. They would never move. */}
        <AnimatePresence mode="wait">
          {order ? (
            <motion.div key={`order-${order.number}`} {...swap}>
              <OrderView order={order} onReset={reset} />
            </motion.div>
          ) : (
            <motion.div
              key="lookup"
              {...swap}
              className="grid overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-2"
            >
              {/* ── the form ── */}
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                onFocus={() => setFocused(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
                }}
                className="order-2 flex flex-col justify-center p-6 sm:p-9 lg:order-1 lg:p-12"
              >
                <div className="space-y-1">
                  <Field id="tr-number" label={t("tr.number")} error={showNumber ? t(showNumber) : null} hint={t("tr.numberHint")}>
                    <TextInput
                      id="tr-number"
                      describedBy="tr-number-msg"
                      invalid={Boolean(showNumber)}
                      value={number}
                      onChange={(e) => {
                        setNumber(e.target.value);
                        setNumberKeys((n) => n + 1);
                        setNotFound(false);
                      }}
                      /* Tidied to the stored form once it is recognisable —
                         "apl pgjb132" comes back as "APL-PGJB132". */
                      onBlur={() => {
                        setTouched((s) => ({ ...s, number: true }));
                        if (isOrderNumber(number)) setNumber(normalizeOrderNumber(number));
                      }}
                      placeholder="APL-XXXX123"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      dir="ltr"
                      className="font-medium uppercase tracking-[0.04em] placeholder:normal-case placeholder:tracking-normal rtl:text-end"
                    />
                  </Field>

                  <Field id="tr-phone" label={t("tr.phone")} error={showPhone ? t(showPhone) : null}>
                    <TextInput
                      id="tr-phone"
                      describedBy="tr-phone-msg"
                      invalid={Boolean(showPhone)}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="0770 12 34 56"
                      dir="ltr"
                      className="rtl:text-end"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneKeys((n) => n + 1);
                        setNotFound(false);
                      }}
                      onBlur={() => {
                        setTouched((s) => ({ ...s, phone: true }));
                        if (isValidPhone(phone)) setPhone(formatPhone(phone));
                      }}
                    />
                  </Field>
                </div>

                <button
                  type="submit"
                  disabled={searching || found}
                  className="btn-accent mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-80"
                >
                  {found ? (
                    <CircleCheck className="h-4 w-4" />
                  ) : searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {t(found ? "tr.found" : searching ? "tr.searching" : "tr.submit")}
                </button>

                <AnimatePresence initial={false}>
                  {notFound && (
                    <motion.p
                      role="alert"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
                      animate={reduced ? { opacity: 1, marginTop: 16 } : { opacity: 1, height: "auto", marginTop: 16 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden rounded-xl border border-alert/25 bg-alert/[0.04] text-[13px] leading-snug text-alert"
                    >
                      <span className="block px-4 py-3">{t("tr.notFound")}</span>
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-8 border-t border-line-soft pt-5">
                  <p className="text-[13.5px] font-semibold text-ink">{t("tr.noNumber")}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-mute">{t("tr.noNumberDesc")}</p>
                  <Link
                    href="/contact"
                    className="mt-2.5 inline-flex items-center gap-2 text-[13.5px] font-semibold text-accent transition-colors hover:text-accent-deep"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("ac.contactCta")}
                  </Link>
                </div>
              </form>

              {/* ── the scanner ── */}
              <div
                className="order-1 flex flex-col items-center justify-center border-b border-line bg-cloud px-6 pb-3 pt-7 text-center lg:order-2 lg:border-b-0 lg:border-s lg:px-10 lg:py-12"
                style={DOTS}
              >
                <p className="font-display text-[19px] font-bold leading-tight text-ink sm:text-[22px]">{t("tr.scanTitle")}</p>
                <p className="mt-1.5 max-w-[38ch] text-[13.5px] leading-relaxed text-mute">{t("tr.scanDesc")}</p>
                <div className="mt-3 w-full max-w-[230px] sm:max-w-[300px] lg:mt-8 lg:max-w-[400px]">
                  <ScannerScene
                    phase={phase}
                    numberOk={isOrderNumber(number)}
                    phoneOk={isValidPhone(phone)}
                    numberKeys={numberKeys}
                    phoneKeys={phoneKeys}
                    missKey={misses}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ── the order ── */

/** A status as the customer reads it — a pickup order is "ready at the pickup
    point" where a home order is "out for delivery". */
function statusKey(status: OrderStatus, pickup: boolean): string {
  if (pickup && status === "out") return "tr.status.outPickup";
  if (pickup && status === "delivered") return "tr.status.deliveredPickup";
  return `tr.status.${status}`;
}

function OrderView({ order, onReset }: { order: TrackedOrder; onReset: () => void }) {
  const { t, locale, dir } = useLocale();
  const reduced = useReducedMotion();
  const [replay, setReplay] = useState(0);
  const { draft } = order;

  const pickup = draft.delivery.method === "pickup";
  const cancelled = order.status === "cancelled";
  const delivered = order.status === "delivered";
  const total = formatDA(draft.shown.total, locale);
  const eta = estimatedArrival(order);
  const wilaya = wilayaOf(draft.delivery.wilaya);
  const status = t(statusKey(order.status, pickup));

  const day = new Intl.DateTimeFormat(tagOf(locale), { day: "numeric", month: "long" });
  /* 24-hour, whatever the locale data says: CLDR gives fr-DZ a 12-hour clock,
     and "11:18 AM" is not how anyone in Algeria reads a delivery time. */
  const stamp = new Intl.DateTimeFormat(tagOf(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const descKey = pickup && order.status === "out" ? "tr.desc.outPickup" : `tr.desc.${order.status}`;

  /* The road, as it stands. A cancelled order stops where it stopped and shows
     the cancellation in place of the rest — the steps it will never take are
     not worth drawing as "still to come". */
  const reachedIndex = cancelled ? 0 : STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const road: { key: OrderStatus; state: "done" | "current" | "todo" | "stopped" }[] = cancelled
    ? [
        { key: "received", state: "done" },
        { key: "cancelled", state: "stopped" },
      ]
    : STEPS.map((key, i) => ({
        key,
        state: i < reachedIndex || (delivered && i === reachedIndex) ? "done" : i === reachedIndex ? "current" : "todo",
      }));

  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: EASE },
  });

  return (
    <div>
      {/* ── where it is ── */}
      <motion.section {...rise(0)} className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="flex flex-col items-start gap-x-6 gap-y-5 p-6 sm:flex-row sm:justify-between sm:p-8">
          <div className="min-w-0 sm:flex-1">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="text-mute">
                {fill(t("tr.order"), { number: "" })}
                <span dir="ltr" className="font-semibold tracking-[0.02em] text-ink">
                  {order.number}
                </span>
              </span>
              {order.history.received && (
                <>
                  <span aria-hidden className="hidden h-3.5 w-px bg-line sm:block" />
                  <span className="text-faint">{fill(t("tr.placedOn"), { date: day.format(order.history.received) })}</span>
                </>
              )}
            </p>

            {/* Where it is, first and largest — the one thing someone opens
                this page to find out. */}
            <h2
              className={`mt-3 font-display text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.02em] ${
                cancelled ? "text-alert" : "text-ink"
              }`}
            >
              {status}
            </h2>
            <p className="mt-2.5 max-w-[60ch] text-[15.5px] leading-relaxed text-mute">{fill(t(descKey), { total })}</p>

            {eta && (
              <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-paper px-3.5 py-2 text-[13.5px] font-medium leading-snug text-ink">
                <CalendarClock className="mt-px h-4 w-4 shrink-0 text-accent" strokeWidth={1.9} />
                {fill(t(pickup ? "tr.etaPickup" : "tr.eta"), {
                  range: `${day.format(eta[0])} – ${day.format(eta[1])}`,
                })}
              </p>
            )}
          </div>

          {/* nothing to replay when the scene is drawn without motion */}
          {!reduced && (
            <button
              type="button"
              onClick={() => setReplay((n) => n + 1)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line px-4 py-2 text-[12.5px] font-medium text-mute transition-colors hover:border-ink/25 hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("tr.replay")}
            </button>
          )}
        </div>

        <div className="border-t border-line-soft bg-cloud px-1 pt-3 sm:px-4 sm:pt-5" style={DOTS}>
          <DeliveryScene status={order.status} method={draft.delivery.method} dir={dir} label={status} replay={replay} />
        </div>
      </motion.section>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        {/* ── how it got there ── */}
        <motion.section {...rise(0.12)} className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h3 className="font-display text-lg font-bold text-ink">{t("tr.progress")}</h3>
          <ol aria-label={t("tr.progress")} className="mt-6">
            {road.map((step, i) => {
              const last = i === road.length - 1;
              const when = order.history[step.key];
              const reached = step.state !== "todo";

              return (
                <motion.li
                  key={step.key}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: dir === "rtl" ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.08, ease: EASE }}
                  className="relative flex gap-4 pb-7 last:pb-0"
                  aria-current={step.state === "current" ? "step" : undefined}
                >
                  {/* The line down to the next step — inked in, top to
                      bottom, where the order has already been. */}
                  {!last && (
                    <span aria-hidden className="absolute start-[13px] top-8 h-[calc(100%-2rem)] w-0.5 overflow-hidden rounded-full bg-line">
                      {road[i + 1].state !== "todo" && (
                        <motion.span
                          className="block h-full w-full origin-top bg-ink"
                          initial={{ scaleY: reduced ? 1 : 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.35, delay: 0.4 + i * 0.08, ease: EASE }}
                        />
                      )}
                    </span>
                  )}

                  <span className="relative grid h-7 w-7 shrink-0 place-items-center">
                    {step.state === "current" && !reduced && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-accent"
                        animate={{ scale: [1, 1.9], opacity: [0.35, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <span
                      className={`relative grid h-7 w-7 place-items-center rounded-full ${
                        step.state === "done"
                          ? "bg-ink text-paper"
                          : step.state === "current"
                            ? "bg-accent text-white"
                            : step.state === "stopped"
                              ? "bg-alert text-white"
                              : "border-2 border-line bg-white"
                      }`}
                    >
                      {step.state === "done" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      {step.state === "current" && <span className="h-2 w-2 rounded-full bg-white" />}
                      {step.state === "stopped" && <X className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                  </span>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                      <p
                        className={`text-[14.5px] ${
                          step.state === "current" || step.state === "stopped"
                            ? "font-semibold text-ink"
                            : reached
                              ? "font-medium text-ink"
                              : "text-faint"
                        }`}
                      >
                        {t(statusKey(step.key, pickup))}
                      </p>
                      {when && <p className="text-[12.5px] tabular-nums text-mute">{stamp.format(when)}</p>}
                    </div>
                    {step.key === "shipped" && reached && order.courierRef && (
                      <p className="mt-1 text-[12.5px] text-mute">
                        {fill(t("tr.courierRef"), { ref: "" })}
                        <span dir="ltr" className="font-medium tabular-nums text-ink">
                          {order.courierRef}
                        </span>
                      </p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </motion.section>

        {/* ── what and where ── */}
        <motion.aside {...rise(0.2)} className="space-y-4 lg:sticky lg:top-28">
          <div className="rounded-3xl border border-line bg-white p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-[12.5px] text-mute">{t(delivered ? "tr.paid" : "placed.toPay")}</dt>
                <dd
                  className={`mt-1 font-display text-[26px] font-bold leading-none tabular-nums ${
                    cancelled ? "text-faint line-through" : "text-ink"
                  }`}
                >
                  {total}
                </dd>
              </div>
              <div className="border-t border-line-soft pt-4">
                <dt className="text-[12.5px] text-mute">{t("placed.delivery")}</dt>
                <dd className="mt-1 text-[14px] font-semibold text-ink">
                  {t(pickup ? "co.pickup" : "co.home")}
                  <span className="block text-[13px] font-normal text-mute">
                    {wilaya ? wilayaLabel(wilaya, locale) : draft.delivery.wilaya}
                    {draft.delivery.commune && `, ${draft.delivery.commune}`}
                  </span>
                  {draft.delivery.address && (
                    <span className="block text-[13px] font-normal text-mute">{draft.delivery.address}</span>
                  )}
                </dd>
              </div>
              <div className="border-t border-line-soft pt-4">
                <dt className="text-[12.5px] text-mute">{t("co.phone")}</dt>
                <dd dir="ltr" className="mt-1 text-[14px] font-medium tabular-nums text-ink rtl:text-end">
                  {formatPhone(draft.customer.phone)}
                </dd>
              </div>
              <div className="border-t border-line-soft pt-4">
                <dt className="text-[12.5px] text-mute">{t("tr.items")}</dt>
                <dd>
                  <ul className="mt-2 space-y-2">
                    {draft.lines.map((l) => (
                      <li key={`${l.slug}::${l.variant ?? ""}`} className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span dir="ltr" className="min-w-0 text-ink rtl:text-end">
                          {l.qty > 1 && <span className="text-mute">{l.qty} × </span>}
                          {l.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-mute">{formatDA(l.unitPrice * l.qty, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-line-soft pt-4">
              <p className="text-[13px] text-mute">{t("tr.help")}</p>
              <Link
                href="/contact"
                className="mt-1.5 inline-flex items-center gap-2 text-[13.5px] font-semibold text-accent transition-colors hover:text-accent-deep"
              >
                <MessageCircle className="h-4 w-4" />
                {t("ac.contactCta")}
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 text-sm font-medium text-mute transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("tr.another")}
          </button>
        </motion.aside>
      </div>
    </div>
  );
}
