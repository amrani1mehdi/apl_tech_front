"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { AplGradient } from "@/components/site/Logo";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import { PART_KINDS } from "@/lib/pcbuilder/parts";
import { APL_PATHS, APL_SYMBOL_RATIO, APL_SYMBOL_VIEWBOX } from "@/lib/logo";
import { PART_ICON } from "./BuildSheet";

/**
 * The first time somebody opens the assistant — a welcome, once.
 *
 * The site already has three transitions and each says one thing: the logo
 * curtain says whose shop this is, the lightning tear says a product is
 * opening, the board powering on says a machine is about to be assembled.
 * None of them says what is different about *this* door — that you do not
 * pick parts here, you say what you want and the parts are picked for you.
 *
 * So this one shows it happening, in four beats, on a dark stage that opens
 * from the card that was pressed:
 *
 *   1. the mark draws itself and the builder introduces itself by name;
 *   2. a sentence writes itself, word by word — the kind a customer types,
 *      with the real budget rung and two games the FPS model knows;
 *   3. the assistant *reads* it: the budget and the games light up and the
 *      rest of the words step back, which is exactly what the chat parser
 *      pulls out of a message;
 *   4. the eight bays — the same discs as the parts grid — light one after
 *      another with current running through them, and the stage lifts away
 *      onto the conversation.
 *
 * Words appear whole rather than letter by letter. A typewriter looks right in
 * French and English and falls apart in Arabic, where a Latin game name typed
 * one letter at a time inside a right-to-left sentence jumps from one end of
 * the line to the other as the bidi algorithm re-decides the run. A word is
 * already a finished run, so it lands where it will stay.
 *
 * Plays on every press of the card for now — see `ONCE_PER_BROWSER`.
 * Skippable from the first frame — a button, and Escape — and never shown to
 * anyone who has asked their system for less motion; they go straight to the
 * conversation.
 */

/**
 * Whether the welcome plays only the first time in a browser.
 *
 * Off for now, at the shop's request, so the sequence can be watched and
 * judged as many times as it takes. The one-time behaviour is kept intact
 * behind this switch rather than deleted: turning it back on is `true` here
 * and nothing else. A browser still remembers having seen it either way, so
 * switching on later does not replay it to anyone who already watched.
 */
const ONCE_PER_BROWSER = false;

const SEEN_KEY = "apl:ai-intro-seen";

/** Whether to play the welcome on this press. With the one-time switch on,
    storage that cannot be read answers no: a welcome that plays on every visit
    because a private window forgets it is worse than one that never plays. */
export function shouldPlayAiIntro(): boolean {
  if (!ONCE_PER_BROWSER) return true;
  try {
    return localStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* see shouldPlayAiIntro */
  }
}

/** The budget the example sentence names — the middle rung of the chat's own
    budget chips, so the first thing the assistant asks has already been shown
    being answered. */
const EXAMPLE_BUDGET = 300_000;

/** `tail` is punctuation glued to a picked-out word — the comma after the
    budget — kept in the same word but outside its underline. */
type Token = { text: string; key: boolean; tail: string };

/**
 * The example sentence, split into words, with the parts the assistant picks
 * out marked.
 *
 * The phrasebook writes those parts in brackets — `[{budget}], je joue à
 * [Valorant]` — so a translator moves the markers with the words. The budget
 * is substituted *after* splitting: `formatDA` groups thousands with a
 * narrow no-break space, and splitting on whitespace afterwards would break
 * "300 000 DA" into three words.
 */
function tokenize(template: string, budget: string): Token[] {
  const out: Token[] = [];
  for (const m of template.matchAll(/\[([^\]]+)\](\S*)|(\S+)/g)) {
    const key = m[1] !== undefined;
    out.push({ text: fill(key ? m[1] : m[3], { budget }), key, tail: key ? m[2] : "" });
  }
  return out;
}

/* ── the timeline, in milliseconds ──
   Written as beats rather than as absolute times, so changing the length of
   the sentence in one language moves everything after it instead of letting
   the discs start while words are still arriving. */
const BEAT = {
  open: 520, // the stage grows out of the card
  title: 720, // the mark draws and the name settles
  word: 85, // one word
  afterWords: 180, // a breath before the reading
  read: 480, // the budget and games light up
  disc: 90, // one bay
  afterDiscs: 620, // the finished row, held — long enough for the pulse through it
  lead: 360, // the conversation mounts under the stage this far ahead of the lift
  lift: 620, // the stage lifts away
} as const;

const EASE = [0.16, 1, 0.3, 1] as const;

type Phase = "open" | "title" | "write" | "read" | "build" | "lift";
const ORDER: Phase[] = ["open", "title", "write", "read", "build", "lift"];

/** The APL mark drawing its outline and then filling — once, not on a loop. */
function Mark({ play }: { play: boolean }) {
  const gid = `ai-intro-${useId()}`;
  const height = 50;

  return (
    <svg viewBox={APL_SYMBOL_VIEWBOX} height={height} width={height * APL_SYMBOL_RATIO} aria-hidden>
      <defs>
        <AplGradient id={gid} />
      </defs>
      {APL_PATHS.map((d, i) => (
        <Fragment key={d}>
          {/* The gradient goes on as an attribute, not from a stylesheet — see
              `AplLoader` for why a url() paint in CSS paints black. */}
          <motion.path
            d={d}
            fill={`url(#${gid})`}
            initial={{ opacity: 0 }}
            animate={play ? { opacity: 1 } : undefined}
            transition={{ duration: 0.45, delay: 0.42 + i * 0.07, ease: EASE }}
          />
          <motion.path
            d={d}
            fill="none"
            stroke="#c47ad8"
            strokeWidth={3}
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={play ? { pathLength: 1, opacity: [0, 1, 1, 0] } : undefined}
            transition={{
              pathLength: { duration: 0.6, delay: i * 0.07, ease: [0.65, 0, 0.35, 1] },
              opacity: { duration: 1.1, delay: i * 0.07, times: [0, 0.1, 0.6, 1] },
            }}
          />
        </Fragment>
      ))}
    </svg>
  );
}

export function AiIntro({
  origin,
  onReveal,
  onDone,
}: {
  /** where the card was pressed, in viewport pixels — the stage grows from it */
  origin: { x: number; y: number };
  /** called just before the stage lifts: put the conversation underneath */
  onReveal: () => void;
  /** called once the stage has gone: unmount this */
  onDone: () => void;
}) {
  const { t, locale, dir } = useLocale();
  const tokens = useMemo(
    () => tokenize(t("pcb.intro.prompt"), formatDA(EXAMPLE_BUDGET, locale)),
    [t, locale],
  );

  const [phase, setPhase] = useState<Phase>("open");
  const [words, setWords] = useState(0);
  const [lit, setLit] = useState(0);
  const skipRef = useRef<HTMLButtonElement>(null);

  /* The parent's callbacks, held in refs so the timeline below is scheduled
     exactly once. Keyed on the callbacks, a parent re-render mid-sequence
     would tear every timer down and start the welcome again. */
  const reveal = useRef(onReveal);
  const done = useRef(onDone);
  useEffect(() => {
    reveal.current = onReveal;
    done.current = onDone;
  }, [onReveal, onDone]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lifted = useRef(false);

  /** Hand over: conversation underneath, stage lifts, then unmount. Safe to
      call twice — the skip button and the timeline can race. */
  const lift = useRef((delay: number) => {
    if (lifted.current) return;
    lifted.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    timers.current.push(
      setTimeout(() => reveal.current(), delay),
      setTimeout(() => setPhase("lift"), delay + BEAT.lead),
      setTimeout(() => done.current(), delay + BEAT.lead + BEAT.lift),
    );
  });

  const n = tokens.length;

  /**
   * Whether the dark disc has finished covering the page.
   *
   * Everything light-on-dark waits for it, and the timeline below does not
   * start until it is true. The beats run on timers, which keep real time; the
   * disc runs on animation frames, and Motion slows an animation down rather
   * than skip ahead when frames arrive late. On a phone that is dropping
   * frames, a timeline started at mount raced ahead of a disc still growing,
   * and put white words on the white chooser. Starting from the disc's own
   * completion keeps the two in step at any frame rate.
   */
  const [covered, setCovered] = useState(false);
  const started = useRef(false);

  const start = useRef(() => {
    if (started.current || lifted.current) return;
    started.current = true;
    setCovered(true);

    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

    let clock = 0;
    at(clock, () => setPhase("title"));

    clock += BEAT.title;
    at(clock, () => setPhase("write"));
    for (let i = 1; i <= n; i++) at(clock + i * BEAT.word, () => setWords(i));

    clock += n * BEAT.word + BEAT.afterWords;
    at(clock, () => setPhase("read"));

    clock += BEAT.read;
    at(clock, () => setPhase("build"));
    for (let i = 1; i <= PART_KINDS.length; i++) at(clock + i * BEAT.disc, () => setLit(i));

    clock += PART_KINDS.length * BEAT.disc + BEAT.afterDiscs;
    at(clock, () => lift.current(0));
  });

  useEffect(() => {
    markSeen();
    skipRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") lift.current(0);
    };
    window.addEventListener("keydown", onKey);

    const pending = timers;
    return () => {
      window.removeEventListener("keydown", onKey);
      pending.current.forEach(clearTimeout);
    };
  }, []);

  const past = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  /* Far enough to cover the furthest corner from wherever the press was. */
  const [radius] = useState(() =>
    typeof window === "undefined"
      ? 3000
      : Math.ceil(
          Math.hypot(
            Math.max(origin.x, window.innerWidth - origin.x),
            Math.max(origin.y, window.innerHeight - origin.y),
          ) + 24,
        ),
  );

  const reading = past("read");

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t("pcb.intro.title")}
      initial={{ y: "0%" }}
      /* A curtain going up, not a fade. The conversation is already on the
         page underneath, so it is uncovered from the bottom edge rather than
         cut to. */
      animate={{ y: phase === "lift" ? "-100%" : "0%" }}
      transition={{ duration: BEAT.lift / 1000, ease: [0.76, 0, 0.24, 1] }}
      /* Above the header (50) and the drawers (110): nothing on the page
         should be reachable while the stage is up. */
      className="fixed inset-0 z-[130] overflow-hidden text-paper"
    >
      {/* The stage, growing out of the press.

          A disc scaled up from nothing rather than a `clip-path` circle
          widening. They look identical; the difference is who does the work. A
          clip-path is repainted on every frame across the whole screen, a
          transform is handed to the compositor — and this is the first frame of
          the welcome, on whatever phone the customer happens to own.

          Quick off the mark: an ease-in here left the stage a dot under the
          cursor for the first quarter of a second, which reads as the press not
          having registered. */}
      <motion.span
        aria-hidden
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: BEAT.open / 1000, ease: [0.65, 0, 0.35, 1] }}
        onAnimationComplete={() => start.current()}
        className="absolute rounded-full bg-ink will-change-transform"
        style={{
          left: origin.x - radius,
          top: origin.y - radius,
          width: radius * 2,
          height: radius * 2,
        }}
      />

      {/* The drawing board, in negative — the same grid the builder is drawn
          on, faint, and fading out towards the edges so the words sit in the
          one lit patch of it. Faded in once the disc has covered the page, so
          it is never seen outside it. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={covered ? { opacity: 0.6 } : undefined}
        transition={{ duration: 0.5 }}
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 50%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 50%, black 20%, transparent 75%)",
        }}
      />

      {/* Focusable from the first frame, visible once there is dark behind it —
          a light-on-dark button sitting on the white chooser for a moment would
          be unreadable. */}
      <motion.button
        ref={skipRef}
        type="button"
        onClick={() => lift.current(0)}
        initial={{ opacity: 0 }}
        animate={covered ? { opacity: 1 } : undefined}
        transition={{ duration: 0.3 }}
        className="absolute end-4 top-4 z-10 rounded-full border border-white/15 px-4 py-2 text-[12.5px] font-medium text-white/60 transition-colors hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lit sm:end-6 sm:top-6"
      >
        {t("pcb.intro.skip")}
      </motion.button>

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <Mark play={past("title")} />

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={past("title") ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
          className="mt-6 max-w-[24ch] text-balance font-display text-[clamp(1.6rem,4vw,2.6rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white"
        >
          {t("pcb.intro.title")}
        </motion.h2>

        {/* The sentence. Every word is laid out from the first frame and only
            made visible in turn, so nothing reflows as it arrives — a line that
            rewraps under the reader's eye mid-sentence is the thing that makes
            a typing effect look cheap. */}
        <p
          dir={dir}
          aria-hidden
          className="mt-10 max-w-[28ch] text-balance font-display text-[clamp(1.3rem,3.2vw,2.15rem)] font-semibold leading-[1.35] tracking-[-0.01em]"
        >
          {tokens.map((tok, i) => {
            const shown = i < words;
            const last = phase === "write" && i === words - 1;

            return (
              <Fragment key={i}>
                {i > 0 && " "}
                <motion.span
                  initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                  animate={
                    shown
                      ? {
                          opacity: reading && !tok.key ? 0.32 : 1,
                          y: 0,
                          filter: "blur(0px)",
                        }
                      : undefined
                  }
                  transition={{ duration: reading ? 0.45 : 0.32, ease: EASE }}
                  className={`relative inline-block transition-colors duration-500 ${
                    reading && tok.key ? "text-accent-lit" : "text-white"
                  }`}
                >
                  <span className="relative">
                    {tok.text}

                    {/* What the assistant took from the sentence, underlined in
                        the direction the sentence reads. */}
                    {tok.key && (
                      <motion.span
                        aria-hidden
                        initial={{ scaleX: 0 }}
                        animate={reading ? { scaleX: 1 } : undefined}
                        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                        className="absolute inset-x-0 -bottom-0.5 h-[3px] origin-left rounded-full bg-accent-lit rtl:origin-right"
                      />
                    )}
                  </span>
                  {/* Punctuation steps back with the ordinary words. */}
                  {tok.tail && (
                    <span className={`transition-opacity duration-500 ${reading ? "text-white opacity-30" : ""}`}>
                      {tok.tail}
                    </span>
                  )}

                  {/* The caret rides on the newest word rather than sitting at
                      the end of a line that is still invisible. */}
                  {last && (
                    <motion.span
                      aria-hidden
                      animate={{ opacity: [1, 1, 0, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                      className="absolute -end-2.5 top-[12%] h-[76%] w-[3px] rounded-full bg-accent-lit"
                    />
                  )}
                </motion.span>
              </Fragment>
            );
          })}
        </p>

        {/* The machine the sentence becomes — the parts grid's own discs, in
            the parts grid's own order, with current running through them. */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={past("build") ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-11 flex flex-col items-center"
        >
          <div className="relative flex items-center gap-2 sm:gap-3">
            <span aria-hidden className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-white/10" />
            <motion.span
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: lit <= 1 ? 0 : (lit - 1) / (PART_KINDS.length - 1) }}
              transition={{ duration: BEAT.disc / 1000, ease: "linear" }}
              className="absolute inset-x-5 top-1/2 h-[2px] origin-left -translate-y-1/2 bg-accent-lit rtl:origin-right"
            />

            {PART_KINDS.map((kind, i) => {
              const Icon = PART_ICON[kind];
              const on = i < lit;
              return (
                /* Once the eighth has lit, a pulse runs down the row in the
                   order the parts seated — the machine, complete. */
                <motion.span
                  key={kind}
                  animate={lit === PART_KINDS.length ? { scale: [1, 1.14, 1] } : undefined}
                  transition={{ duration: 0.42, delay: 0.12 + i * 0.045, ease: EASE }}
                  className="relative grid h-9 w-9 place-items-center rounded-full sm:h-12 sm:w-12"
                >
                  <span className="absolute inset-0 rounded-full border border-white/15 bg-ink" />
                  <motion.span
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={on ? { scale: 1, opacity: 1 } : undefined}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute inset-0 rounded-full bg-accent-gradient"
                  />
                  <Icon
                    aria-hidden
                    strokeWidth={1.7}
                    className={`relative h-4 w-4 transition-colors duration-300 sm:h-5 sm:w-5 ${
                      on ? "text-white" : "text-white/35"
                    }`}
                  />
                </motion.span>
              );
            })}
          </div>

          <p className="mt-5 max-w-[40ch] text-[13.5px] leading-relaxed text-white/55">
            {t("pcb.intro.caption")}
          </p>
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  );
}
