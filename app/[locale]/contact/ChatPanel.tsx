"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CheckCheck, Loader2, Send } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { APL_PATHS } from "@/lib/logo";
import type { ShopStatus } from "@/lib/contact";

const EASE = [0.16, 1, 0.3, 1] as const;

export type Draft = {
  /** the topic's label, when one is picked */
  topic: string | null;
  name: string;
  phone: string;
  orderNumber: string;
  message: string;
};

export type Sent = { at: number; reply: string };

/**
 * The other half of the contact page: the conversation the form is having.
 *
 * Contacting a shop here mostly happens in a chat — WhatsApp, Messenger — so
 * the form is shown as one. What the customer types appears as their message
 * while they type it; sending it delivers the bubble, the shop starts typing,
 * and its answer says, in the customer's own name and number, what happens
 * next.
 */
export function ChatPanel({
  status,
  statusText,
  draft,
  active,
  ready,
  busy,
  sent,
}: {
  status: ShopStatus | null;
  statusText: string;
  draft: Draft;
  /** a field is in use */
  active: boolean;
  /** everything required is valid */
  ready: boolean;
  busy: boolean;
  sent: Sent | null;
}) {
  const { t } = useLocale();

  return (
    <div className="mx-auto flex h-full w-full max-w-[480px] flex-col">
      <ChatHeader status={status} statusText={statusText} />

      {/* the thread — on a phone only the greeting fits above the form; the
          rest of the conversation plays in the confirmation instead */}
      <div className="mt-5 flex flex-1 flex-col justify-end gap-3 lg:mt-8 lg:min-h-0">
        <p className="hidden self-center rounded-full bg-white/[0.06] px-3 py-1 text-[11.5px] font-medium text-white/50 lg:block">
          {t("ct.chat.today")}
        </p>
        <ShopBubble>{t("ct.chat.greeting")}</ShopBubble>
        <div className="hidden flex-col gap-3 lg:flex">
          <Conversation draft={draft} active={active} sent={sent} />
        </div>
      </div>

      {/* A composer that is not one: it points at the form, and mirrors the
          send button — lit once the message can go. */}
      <div className="mt-6 hidden items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] py-2 pe-2 ps-5 lg:flex">
        <p className="min-w-0 flex-1 truncate text-[13.5px] text-white/45">
          {sent ? t("ct.chat.sent") : busy ? t("ct.sending") : ready ? t("ct.chat.ready") : t("ct.chat.composer")}
        </p>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
            ready || busy || sent ? "bg-accent text-white" : "bg-white/10 text-white/40"
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : sent ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          )}
        </span>
      </div>
    </div>
  );
}

function ChatHeader({ status, statusText }: { status: ShopStatus | null; statusText: string }) {
  const reduced = useReducedMotion();
  const open = status?.open;

  return (
    <div className="flex items-center gap-3.5">
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent">
        <svg viewBox="30 30 472 218" className="w-6 fill-white" aria-hidden>
          {APL_PATHS.map((p) => (
            <path key={p} d={p} />
          ))}
        </svg>
        <span
          className={`absolute -bottom-0.5 end-0 h-3 w-3 rounded-full border-2 border-ink transition-colors ${
            open ? "bg-accent-lit" : "bg-white/35"
          }`}
        />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[16px] font-bold leading-tight text-white">APL TECH</p>
        <p className="mt-0.5 flex h-5 items-center gap-2 text-[13px] text-white/60">
          {status && (
            <>
              <span className="relative flex h-2 w-2">
                {open && !reduced && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-lit opacity-60" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${open ? "bg-accent-lit" : "bg-white/35"}`} />
              </span>
              {statusText}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function ShopBubble({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[88%] self-start rounded-2xl rounded-ss-md bg-white/[0.08] px-4 py-3 text-[14px] leading-relaxed text-white/90">
      {children}
    </div>
  );
}

/**
 * The customer's message and what follows it.
 *
 * Keyed by the send, so each send plays from its first beat: delivered, read,
 * the shop typing, the answer.
 */
export function Conversation({ draft, active, sent }: { draft: Draft; active: boolean; sent: Sent | null }) {
  return <Beats key={sent?.at ?? "draft"} draft={draft} active={active} sent={sent} />;
}

const BEATS_MS = [0, 650, 1150, 2700];

function Beats({ draft, active, sent }: { draft: Draft; active: boolean; sent: Sent | null }) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  /* 0 sent · 1 read · 2 the shop typing · 3 answered */
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!sent) return;
    const timers = BEATS_MS.slice(1).map((ms, i) => setTimeout(() => setBeat(i + 1), reduced ? 0 : ms));
    return () => timers.forEach(clearTimeout);
  }, [reduced, sent]);

  const shown = active || Boolean(draft.name.trim() || draft.message.trim() || draft.topic);
  const time = sent
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "en" ? "en-GB" : "fr-DZ", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(sent.at)
    : null;

  return (
    <>
      <AnimatePresence initial={false}>
        {shown && (
          <motion.div
            key="mine"
            layout={!reduced}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex max-w-[88%] flex-col items-end gap-1.5 self-end"
          >
            <motion.div
              layout={!reduced}
              className="rounded-2xl rounded-se-md bg-accent px-4 py-3 text-[14px] leading-relaxed text-white"
            >
              {(draft.topic || draft.orderNumber.trim()) && (
                <p className="mb-1.5 flex flex-wrap gap-1.5">
                  {draft.topic && (
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-medium">{draft.topic}</span>
                  )}
                  {draft.orderNumber.trim() && (
                    <span dir="ltr" className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-medium uppercase tracking-[0.02em]">
                      {draft.orderNumber.trim()}
                    </span>
                  )}
                </p>
              )}
              {draft.message.trim() ? (
                <p className="line-clamp-[9] whitespace-pre-wrap break-words">{draft.message}</p>
              ) : (
                <TypingDots />
              )}
            </motion.div>
            <p className="flex items-center gap-1.5 text-[11.5px] text-white/45">
              {draft.name.trim() && <span>{draft.name.trim()}</span>}
              {draft.phone.trim() && (
                <span dir="ltr" className="tabular-nums">
                  {draft.phone.trim()}
                </span>
              )}
              {time && (
                <>
                  <span dir="ltr" className="tabular-nums">
                    {time}
                  </span>
                  {beat >= 1 ? (
                    <CheckCheck className="h-3.5 w-3.5 text-accent-lit" strokeWidth={2.5} />
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                </>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout" initial={false}>
        {sent && beat === 2 && (
          <motion.div
            key="typing"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="self-start rounded-2xl rounded-ss-md bg-white/[0.08] px-4 py-3.5 text-white/80"
          >
            <TypingDots />
          </motion.div>
        )}
        {sent && beat >= 3 && (
          <motion.div
            key="reply"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="max-w-[88%] self-start rounded-2xl rounded-ss-md bg-white/[0.08] px-4 py-3 text-[14px] leading-relaxed text-white/90"
          >
            {sent.reply}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TypingDots() {
  const reduced = useReducedMotion();
  return (
    <span className="flex h-[1.4em] items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={reduced ? { opacity: 0.7 } : { y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
          transition={reduced ? { duration: 0 } : { duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
