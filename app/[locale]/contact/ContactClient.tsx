"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ChevronRight, Clock, Cpu, Loader2, Mail, MapPin, MessageCircle, Package, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Field, TextArea, TextInput } from "@/components/checkout/Fields";
import { useAccount } from "@/components/auth/useAccount";
import { formatPhone, isValidPhone } from "@/lib/checkout/validate";
import { isOrderNumber, normalizeOrderNumber } from "@/lib/checkout/tracking";
import {
  CONTACT_ORDER,
  MESSAGE_MIN,
  SHOP,
  TOPICS,
  sendMessage,
  shopStatus,
  validateContact,
  type ContactField,
  type ContactTopic,
  type ShopStatus,
} from "@/lib/contact";
import type { Locale } from "@/lib/locales";
import { fill } from "@/lib/pcbuilder/engine";
import { ChatPanel, Conversation, type Sent } from "./ChatPanel";

const EASE = [0.16, 1, 0.3, 1] as const;

const DOTS = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
} as const;

const TOPIC_ICON = { order: Package, build: Cpu, warranty: ShieldCheck, other: Sparkles } as const;

const FIELD_ID: Record<ContactField, string> = {
  name: "ct-name",
  phone: "ct-phone",
  orderNumber: "ct-order",
  message: "ct-message",
};

const ERROR_KEY = {
  required: "err.required",
  phone: "err.phone",
  orderNumber: "tr.err.number",
  short: "ct.err.short",
} as const;

/* ── the clock ──
   The status depends on the time, which the server render cannot know, so it
   is read after hydration and re-read every half minute. The snapshot is the
   minute, not the millisecond, so it only changes when the minute does. */
const subscribeClock = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const useMinute = () => useSyncExternalStore(subscribeClock, currentMinute, () => null);

/* direction isolates, so a phone number keeps its order inside Arabic text */
const LRI = "\u2066";
const PDI = "\u2069";

function hourLabel(hour: number, locale: Locale): string {
  if (locale === "fr") return `${hour}h`;
  if (locale === "en") return `${((hour + 11) % 12) + 1}${hour < 12 ? "am" : "pm"}`;
  return `${hour}:00`;
}

function dayName(day: number, locale: Locale): string {
  /* 7 January 2024 was a Sunday, so day 0 lands on one */
  const tag = locale === "ar" ? "ar-DZ" : locale === "en" ? "en-GB" : "fr-FR";
  return new Intl.DateTimeFormat(tag, { weekday: "long", timeZone: "UTC" }).format(Date.UTC(2024, 0, 7 + day, 12));
}

/** "aujourd'hui à 9h", "demain à 9h", "samedi à 9h" */
function whenOpens(status: Extract<ShopStatus, { open: false }>, locale: Locale, t: (k: string) => string): string {
  const time = hourLabel(status.opensAt, locale);
  if (status.inDays === 0) return fill(t("ct.when.today"), { time });
  if (status.inDays === 1) return fill(t("ct.when.tomorrow"), { time });
  return fill(t("ct.when.day"), { day: dayName(status.day, locale), time });
}

/**
 * Contact.
 *
 * The fastest ways in first — call, WhatsApp, e-mail, with whether anyone is
 * in right now — then a message for everything that can wait for a call back.
 * The form asks what it is about before anything else, because that decides
 * who calls back and what they need: an order question wants the order
 * number, so the field for it appears only then.
 */
export function ContactClient() {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const minute = useMinute();
  const status = minute === null ? null : shopStatus(new Date(minute * 60_000));
  const { account } = useAccount();

  const [topic, setTopic] = useState<ContactTopic | null>(null);
  /* null until typed in — a signed-in customer's own name and number stand in */
  const [typedName, setName] = useState<string | null>(null);
  const [typedPhone, setPhone] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState<Partial<Record<ContactField, true>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [focused, setFocused] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const name = typedName ?? (account ? `${account.firstName} ${account.lastName}` : "");
  const phone = typedPhone ?? (account ? formatPhone(account.phone) : "");
  const form = { topic, name, phone, orderNumber, message };
  const errors = validateContact(form);
  const ready = Object.keys(errors).length === 0;
  const shown = (field: ContactField) => {
    const error = errors[field];
    return error && (submitted || touched[field]) ? t(ERROR_KEY[error]) : null;
  };

  const statusText = !status
    ? ""
    : status.open
      ? fill(t("ct.status.open"), { time: hourLabel(status.closesAt, locale) })
      : fill(t("ct.status.closed"), { when: whenOpens(status, locale, t) });

  const submit = async () => {
    if (busy || sent) return;
    setSubmitted(true);
    const first = CONTACT_ORDER.find((f) => errors[f]);
    if (first) {
      document.getElementById(FIELD_ID[first])?.focus();
      return;
    }
    setBusy(true);
    const result = await sendMessage(form);
    setBusy(false);

    const vars = {
      name: name.trim().split(/\s+/)[0],
      /* non-breaking, so the number never splits across two lines */
      phone: `${LRI}${formatPhone(phone).replace(/ /g, "\u00a0")}${PDI}`,
      when: status && !status.open ? whenOpens(status, locale, t) : "",
    };
    setSent({
      at: result.sentAt,
      reply: fill(t(status && !status.open ? "ct.chat.reply.closed" : "ct.chat.reply.open"), vars),
    });

    /* the confirmation replaces the form where it stood; bring it into view
       if the page has been scrolled past its top */
    const offset = (top.current?.getBoundingClientRect().top ?? 0) - 96;
    if (offset < 0) window.scrollBy({ top: offset, behavior: reduced ? "auto" : "smooth" });
  };

  const again = () => {
    setSent(null);
    setTopic(null);
    setOrderNumber("");
    setMessage("");
    setTouched({});
    setSubmitted(false);
  };

  const draft = {
    topic: topic ? t(`ct.topic.${topic}`) : null,
    name,
    phone,
    orderNumber: topic === "order" ? orderNumber : "",
    message,
  };

  return (
    <main>
      <div className="grid min-h-svh bg-white lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        {/* ── write ── */}
        <section className="order-2 px-5 pb-16 pt-9 sm:px-10 sm:pt-12 lg:order-1 lg:px-16 lg:pb-24 lg:pt-32 xl:px-24">
          <div ref={top} className="mx-auto w-full max-w-[580px]">
            <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-faint">
              <Link href="/" className="transition-colors hover:text-ink">
                APL TECH
              </Link>
              <ChevronRight className="h-3 w-3 rtl:rotate-180" />
              <span className="text-mute">{t("ct.crumb")}</span>
            </nav>
            <h1 className="mt-4 font-display text-[clamp(2.3rem,4.6vw,3.7rem)] font-bold leading-[1.02] tracking-[-0.025em] text-ink">
              {t("ct.title")}
            </h1>
            <p className="mt-3.5 max-w-[46ch] text-[16px] leading-relaxed text-mute">{t("ct.subtitle")}</p>

            {/* ── right now ── */}
            <div className="mt-7 flex flex-wrap gap-2">
              <Channel href={`tel:${SHOP.phone}`} icon={Phone} label={SHOP.phoneDisplay} aria={t("ct.call")} ltr />
              <Channel
                href={`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(t("ct.waText"))}`}
                icon={MessageCircle}
                label="WhatsApp"
                external
              />
              <Channel href={`mailto:${SHOP.email}`} icon={Mail} label={SHOP.email} aria={t("ct.email")} ltr />
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13.5px] text-mute">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.9} />
                {SHOP.address}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.9} />
                {t("ct.hours")}
              </span>
            </p>

            <div className="mt-9 border-t border-line pt-8">
              <AnimatePresence mode="wait" initial={false}>
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    role="status"
                  >
                    <motion.span
                      initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
                      className="grid h-14 w-14 place-items-center rounded-full bg-accent text-white"
                    >
                      <Check className="h-7 w-7" strokeWidth={3} />
                    </motion.span>
                    <h2 className="mt-5 font-display text-[28px] font-bold leading-tight text-ink">{t("ct.sentTitle")}</h2>
                    <p className="mt-2 max-w-[48ch] text-[15.5px] leading-relaxed text-mute">{sent.reply}</p>

                    {/* the conversation, for a phone — on a wide screen it is
                        already playing beside the form */}
                    <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-ink p-5 lg:hidden" style={DOTS}>
                      <Conversation draft={draft} active={false} sent={sent} />
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={again}
                        className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink/25"
                      >
                        {t("ct.another")}
                      </button>
                      <Link
                        href="/catalogue"
                        className="btn-accent group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                      >
                        {t("ac.shopCta")}
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    noValidate
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submit();
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
                    }}
                  >
                    <fieldset>
                      <legend className="text-[13px] font-medium text-ink">{t("ct.topic")}</legend>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {TOPICS.map((id) => {
                          const Icon = TOPIC_ICON[id];
                          const on = topic === id;
                          return (
                            <label
                              key={id}
                              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                                on ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-ink/30"
                              }`}
                            >
                              <input
                                type="radio"
                                name="ct-topic"
                                value={id}
                                checked={on}
                                onChange={() => setTopic(id)}
                                className="sr-only"
                              />
                              <Icon className={`h-4 w-4 ${on ? "text-accent-lit" : "text-accent"}`} strokeWidth={1.9} />
                              {t(`ct.topic.${id}`)}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="mt-6 grid gap-x-3 sm:grid-cols-2">
                      <Field id={FIELD_ID.name} label={t("ct.name")} error={shown("name")}>
                        <TextInput
                          id={FIELD_ID.name}
                          describedBy={`${FIELD_ID.name}-msg`}
                          invalid={Boolean(shown("name"))}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => setTouched((s) => ({ ...s, name: true }))}
                          autoComplete="name"
                        />
                      </Field>
                      <Field id={FIELD_ID.phone} label={t("ct.phone")} error={shown("phone")}>
                        <TextInput
                          id={FIELD_ID.phone}
                          describedBy={`${FIELD_ID.phone}-msg`}
                          invalid={Boolean(shown("phone"))}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          placeholder="0770 12 34 56"
                          dir="ltr"
                          className="rtl:text-end"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onBlur={() => {
                            setTouched((s) => ({ ...s, phone: true }));
                            if (isValidPhone(phone)) setPhone(formatPhone(phone));
                          }}
                        />
                      </Field>
                    </div>

                    <AnimatePresence initial={false}>
                      {topic === "order" && (
                        <motion.div
                          key="order"
                          initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                          animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <Field id={FIELD_ID.orderNumber} label={t("ct.orderNumber")} error={shown("orderNumber")} hint={t("ct.orderHint")}>
                            <TextInput
                              id={FIELD_ID.orderNumber}
                              describedBy={`${FIELD_ID.orderNumber}-msg`}
                              invalid={Boolean(shown("orderNumber"))}
                              value={orderNumber}
                              onChange={(e) => setOrderNumber(e.target.value)}
                              onBlur={() => {
                                setTouched((s) => ({ ...s, orderNumber: true }));
                                if (isOrderNumber(orderNumber)) setOrderNumber(normalizeOrderNumber(orderNumber));
                              }}
                              placeholder="APL-XXXX123"
                              autoComplete="off"
                              autoCapitalize="characters"
                              spellCheck={false}
                              dir="ltr"
                              className="font-medium uppercase tracking-[0.04em] placeholder:normal-case placeholder:tracking-normal rtl:text-end"
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field
                      id={FIELD_ID.message}
                      label={t("ct.message")}
                      error={shown("message")}
                      hint={
                        message.trim().length > 0 && message.trim().length < MESSAGE_MIN
                          ? fill(t("ct.messageLeft"), { n: String(MESSAGE_MIN - message.trim().length) })
                          : t(topic ? `ct.messageHint.${topic}` : "ct.messageHint")
                      }
                    >
                      <TextArea
                        id={FIELD_ID.message}
                        describedBy={`${FIELD_ID.message}-msg`}
                        invalid={Boolean(shown("message"))}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onBlur={() => setTouched((s) => ({ ...s, message: true }))}
                        rows={5}
                      />
                    </Field>

                    <button
                      type="submit"
                      disabled={busy}
                      className="btn-accent group mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-90"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
                      )}
                      {t(busy ? "ct.sending" : "ct.send")}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ── the conversation ──
            Hidden from assistive technology: it repeats the form and its
            confirmation, which say the same in words. */}
        <aside
          aria-hidden
          className="relative order-1 overflow-hidden bg-ink px-5 pb-6 pt-[88px] sm:px-10 sm:pt-28 lg:sticky lg:top-0 lg:order-2 lg:h-svh lg:self-start lg:px-14 lg:pb-12 lg:pt-28"
          style={DOTS}
        >
          <ChatPanel status={status} statusText={statusText} draft={draft} active={focused} ready={ready} busy={busy} sent={sent} />
        </aside>
      </div>
    </main>
  );
}

function Channel({
  href,
  icon: Icon,
  label,
  aria,
  ltr,
  external,
}: {
  href: string;
  icon: typeof Phone;
  label: string;
  /** what the link does, when the label is only a number or an address */
  aria?: string;
  ltr?: boolean;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={aria ? `${aria} ${label}` : undefined}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group inline-flex items-center gap-2.5 rounded-full border border-line py-1.5 pe-4 ps-1.5 text-[14px] font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-paper text-accent transition-colors group-hover:bg-accent group-hover:text-white">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>
      <span dir={ltr ? "ltr" : undefined}>{label}</span>
    </a>
  );
}
