"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import type { Chip, Message } from "@/lib/pcbuilder/chat";

/**
 * Assistant copy, revealed as it is written.
 *
 * Word by word rather than character by character. A per-character reveal on
 * French makes accented words jitter as they grow, and on Arabic it is worse —
 * the script is cursive, so letters visibly re-form their joined shapes on
 * almost every tick. Words land cleanly in all three languages.
 *
 * This is also the seam that matters later: when the model streams, the same
 * component renders it and the only change is where the words come from.
 */
function Typewriter({ text, onTick }: { text: string; onTick: () => void }) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(" "), [text]);
  const [shown, setShown] = useState(reduced ? words.length : 0);

  /* Switching language rewrites every bubble at once. A message already
     delivered should appear in the new language immediately, not replay its
     typing — so a change of text on an existing line jumps to the end. Only a
     new line types. */
  const [seenText, setSeenText] = useState(text);
  if (seenText !== text) {
    setSeenText(text);
    setShown(words.length);
  }

  useEffect(() => {
    if (reduced || shown >= words.length) return;
    const id = setTimeout(() => {
      setShown((n) => n + 1);
      onTick();
    }, shown === 0 ? 60 : 24);
    return () => clearTimeout(id);
  }, [shown, words.length, reduced, onTick]);

  return <>{words.slice(0, shown).join(" ")}</>;
}

/**
 * The conversation.
 *
 * Full-screen while the brief is being gathered, and docked to a strip once
 * the machine is on screen — the same thread either way, because a customer
 * who asks for something cheaper after seeing the build is continuing one
 * conversation, not starting a second.
 *
 * Both voices sit on a ground of their own — the assistant on paper, the
 * customer in ink — because ground is what tells two speakers apart at a
 * glance. Alignment alone does not: a reader scanning back up a thread is
 * looking for a shape, not measuring which edge of the column a line starts
 * from, and the assistant's turns are long enough to reach both edges anyway.
 *
 * The accent dot stays beside the assistant's bubble rather than being made
 * redundant by it. It is the one mark of the voice doing the work, and it
 * costs six pixels.
 */
export function Conversation({
  messages,
  pending,
  full,
  onSend,
  onRestart,
}: {
  messages: Message[];
  pending: boolean;
  /** full-screen while gathering the brief; docked once a machine exists */
  full: boolean;
  onSend: (text: string) => void;
  onRestart: () => void;
}) {
  const { t, locale } = useLocale();
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  /**
   * Whether the reader is at the bottom of the thread.
   *
   * The thread used to pin itself to the bottom on every tick of the
   * typewriter, unconditionally — which meant scrolling up to re-read an
   * earlier answer threw you straight back down again on the next word the
   * assistant wrote, every 24ms. Unreadable, and it looked like the page was
   * fighting the mouse.
   *
   * So the pin is conditional: follow the conversation while the reader is
   * already at the bottom, and leave them alone the moment they are not. The
   * 48px tolerance is what keeps "close enough to the bottom" working after a
   * trackpad flick that lands a few pixels short.
   */
  const pinned = useRef(true);

  const onScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, []);

  const stickToBottom = useCallback(() => {
    const el = threadRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, []);

  /* A turn the customer just took is theirs, so it always pulls them down —
     whatever they were reading, they have now said something and the reply is
     what they are waiting for. */
  useEffect(() => {
    pinned.current = true;
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(stickToBottom, [pending, stickToBottom]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(text);
  };

  /* Chips belong to the newest assistant turn only. Leaving them live further
     up the thread invites someone to answer a question two turns stale and
     watch the machine change for no visible reason. */
  const last = messages[messages.length - 1];
  const chips: Chip[] = !pending && last?.role === "assistant" ? (last.chips ?? []) : [];

  /* Docked, only the tail of the thread is worth keeping: the input and the
     last exchange. Scrolling back through a full history in a 120px strip is
     not reading, and the machine beside it is what the customer is looking at. */
  const visible = full ? messages : messages.slice(-2);

  return (
    <div className={full ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"}>
      {/* `overscroll-contain` stops a flick that reaches the end of the thread
          from chaining to the page behind it, and `scrollbar-gutter` reserves
          the track so the copy does not shift sideways the first time the
          conversation grows long enough to need one. */}
      <div
        ref={threadRef}
        onScroll={onScroll}
        style={{ scrollbarGutter: "stable" }}
        className={`overscroll-contain ${
          full ? "min-h-0 flex-1 overflow-y-auto pe-1" : "max-h-28 overflow-y-auto pe-1"
        }`}
      >
        {/* Anchored to the bottom, the way a conversation reads: early on there
            are two lines and they belong just above the input, not stranded at
            the top of an empty screen.

            `min-h-full` + `justify-end` rather than `justify-end` on the
            scroller itself — that older trick makes the first item unreachable
            once the thread overflows, because the overflow goes out the top
            where there is no scrollable area to reach it. */}
        <div
          className={`flex flex-col justify-end ${full ? "min-h-full space-y-6 py-2" : "space-y-3"}`}
        >
          {visible.map((m) =>
            m.role === "assistant" ? (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-3"
              >
                {/* A mark, not an avatar. It says which voice is speaking with
                    one 6px dot instead of a logo repeated down the page. */}
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full bg-accent ${
                    full ? "mt-[1.35rem]" : "mt-[1rem]"
                  }`}
                />
                {/* Paper against the customer's ink, so the two voices are
                    told apart by ground rather than only by which side of the
                    column they sit on.

                    The measure is capped well inside the bubble on purpose.
                    38rem at 17px is about 75 characters — the top of the range
                    that still scans in one eye movement — and letting the text
                    run the full width of the sheet would push it past 90,
                    where a reader starts losing the line on the way back. */}
                <p
                  className={
                    full
                      ? "max-w-[38rem] rounded-2xl rounded-ss-md bg-paper px-4 py-3 text-[17px] leading-[1.6] text-ink"
                      : "max-w-[34rem] rounded-xl rounded-ss-sm bg-paper px-3 py-2 text-[13.5px] leading-relaxed text-mute"
                  }
                >
                  <Typewriter text={fill(t(m.key!), m.vars)} onTick={stickToBottom} />
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex justify-end"
              >
                <p
                  className={`max-w-[32rem] rounded-2xl rounded-ee-md bg-ink px-4 text-paper ${
                    full ? "py-2.5 text-[15px]" : "py-2 text-[13px]"
                  }`}
                >
                  {m.text}
                </p>
              </motion.div>
            ),
          )}

          {pending && (
            <div className="flex items-center gap-3">
              <span className="flex gap-1 ps-[1px]">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                  />
                ))}
              </span>
              <span className="text-[13px] text-faint">{t("pcb.chat.thinking")}</span>
            </div>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className={`flex shrink-0 flex-wrap gap-2 ${full ? "pt-6" : "pt-3"}`}>
          {chips.map((c) => {
            /* The label is also the message. Pressing a chip sends exactly the
               words on it, so the thread reads back as a conversation rather
               than as a form posting codes — which is why a money chip's label
               has to be both correctly written *and* parseable. `formatDA`
               gives both: its digits are wrapped in a directional isolate, and
               the budget parser reads the figure straight back out of it. */
            const label = c.money === undefined ? t(c.key) : formatDA(c.money, locale);

            return (
              <button
                key={c.key}
                onClick={() => onSend(label)}
                className={`rounded-full border border-line bg-white font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  full ? "px-4 py-2.5 text-[14px]" : "px-3 py-1.5 text-[12px]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} className={`shrink-0 ${full ? "pt-6" : "pt-3"}`}>
        <div
          className={`flex items-center gap-2 rounded-full border border-line bg-white ps-5 pe-1.5 transition-colors focus-within:border-accent ${
            full ? "py-1.5 shadow-[0_1px_2px_rgba(21,21,26,0.04)]" : "py-1"
          }`}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("pcb.chat.placeholder")}
            aria-label={t("pcb.chat.placeholder")}
            className={`min-w-0 flex-1 bg-transparent text-ink placeholder:text-faint focus:outline-none ${
              full ? "py-2.5 text-[15px]" : "py-2 text-[13px]"
            }`}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={t("pcb.chat.send")}
            className={`grid shrink-0 place-items-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90 disabled:opacity-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              full ? "h-10 w-10" : "h-8 w-8"
            }`}
          >
            <ArrowUp className={full ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </button>
        </div>
      </form>

      {full && messages.length > 1 && (
        <button
          onClick={onRestart}
          className="mt-4 inline-flex shrink-0 items-center gap-1.5 self-start text-[12px] text-faint transition-colors hover:text-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <RotateCcw className="h-3 w-3" />
          {t("pcb.chat.restart")}
        </button>
      )}
    </div>
  );
}
