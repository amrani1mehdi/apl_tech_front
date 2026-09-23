"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, MessageSquareText, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { SplitText } from "@/components/site/Reveal";
import { fill } from "@/lib/pcbuilder/engine";
import { buildableCount } from "@/lib/pcbuilder/parts";

/**
 * Which builder — PCB-16.
 *
 * Two genuinely different ways to arrive at the same machine, and the module
 * had been shipping only one of them. The conversation is the differentiator
 * and it is the right door for somebody who knows what they want the computer
 * to *do*; it is the wrong door for somebody who already knows they want a
 * 9070 XT and simply wants the list. Making the second kind of customer answer
 * "quel est ton budget ?" before they can see a parts table loses them, and
 * they are the customer most likely to spend the most.
 *
 * The cost of asking is one click for anyone who lands on `/configurateur`
 * bare. Everything that knows which door it wants — the footer, a product
 * card, a shared link — carries `?mode=` and never sees this screen.
 *
 * On the same drawing board as everything after it, because the point of the
 * blueprint persisting across stages is that choosing, describing, assembling
 * and reading a result are one session in one room. A chooser on its own page
 * would make the first of those a different place.
 */
function Card({
  icon: Icon,
  eyebrow,
  title,
  body,
  cta,
  accent,
  delay,
  onPick,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  /** the AI card leads — it is the thing this shop has that others do not */
  accent: boolean;
  delay: number;
  onPick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onPick}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex flex-1 flex-col items-start rounded-3xl border p-6 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-7 ${
        accent
          ? "border-accent/30 bg-accent/[0.06] hover:border-accent/60 hover:bg-accent/10"
          : "border-line bg-white hover:border-ink/25 hover:bg-cloud"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
          accent ? "border-accent/25 bg-accent/10 text-accent" : "border-line bg-paper text-mute"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>

      <span
        className={`mt-5 font-mono text-[10px] font-medium uppercase tracking-wider ${
          accent ? "text-accent" : "text-faint"
        }`}
      >
        {eyebrow}
      </span>

      <span className="mt-2 font-display text-[19px] font-bold leading-tight text-ink sm:text-[21px]">
        {title}
      </span>

      {/* `flex-1` on the body, so two cards of unequal copy length still put
          their calls to action on the same line. Two buttons a few pixels
          apart vertically reads as a rendering fault, not as a layout. */}
      <span className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-mute">{body}</span>

      <span
        className={`mt-6 inline-flex items-center gap-2 text-[13px] font-semibold ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
      </span>
    </motion.button>
  );
}

export function ModeChooser({
  /** a component the customer arrived holding — PCB-02 */
  pinnedName,
  onPickAi,
  onPickManual,
}: {
  pinnedName?: string;
  /** where the card was pressed, so the welcome can grow out of it */
  onPickAi: (origin: { x: number; y: number }) => void;
  onPickManual: () => void;
}) {
  const { t } = useLocale();

  /* Arriving from a product card changes the question rather than skipping it.
     "Which builder do you want" is a shrug when you have not chosen anything
     yet and a real question once you are holding a graphics card: somebody has
     to build the other seven bays around it, and both answers to *who* are
     good ones. So each card says what it would do with the part. */
  const body = (base: string, withPart: string) =>
    pinnedName ? fill(t(withPart), { name: pinnedName }) : t(base);

  return (
    /* Centred only once there is room to centre in. On a phone the headline,
       the lead and two stacked cards are taller than the viewport, and
       `justify-center` inside a scroll container pushes the overflow off *both*
       ends — so the top of the headline becomes unreachable, scroll or not.
       From the top it simply scrolls. */
    <div className="mx-auto flex w-full max-w-[52rem] flex-1 flex-col py-6 sm:justify-center">
      <div className="shrink-0">
        {/* No eyebrow above this headline any more. A tinted pill with a dot
            in it, tracked-out over a heading, is the most-copied badge on the
            web and it was carrying a fact that reads better as a clause: the
            catalogue size now opens the sentence underneath, where a reader
            meets it while already reading rather than as a label to decode
            first. The headline leads on its own. */}
        <SplitText
          as="h1"
          text={t(pinnedName ? "pcb.mode.titlePinned" : "pcb.mode.title")}
          delay={0.08}
          className="mt-4 block max-w-[20ch] font-display text-[clamp(1.8rem,4.2vw,2.9rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-mute"
        >
          {pinnedName
            ? fill(t("pcb.mode.leadPinned"), { name: pinnedName })
            : fill(t("pcb.mode.lead"), { n: buildableCount() })}
        </motion.p>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Card
          icon={MessageSquareText}
          eyebrow={t("pcb.mode.ai.eyebrow")}
          title={t("pcb.mode.ai.title")}
          body={body("pcb.mode.ai.body", "pcb.mode.ai.bodyPinned")}
          cta={t("pcb.mode.ai.cta")}
          accent
          delay={0.42}
          onPick={(e) => {
            /* A keyboard press reports the pointer at 0,0 — grow from the
               card itself then, not from the corner of the screen. */
            const r = e.currentTarget.getBoundingClientRect();
            const keyboard = e.clientX === 0 && e.clientY === 0;
            onPickAi(
              keyboard
                ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
                : { x: e.clientX, y: e.clientY },
            );
          }}
        />
        <Card
          icon={SlidersHorizontal}
          eyebrow={t("pcb.mode.manual.eyebrow")}
          title={t("pcb.mode.manual.title")}
          body={body("pcb.mode.manual.body", "pcb.mode.manual.bodyPinned")}
          cta={t("pcb.mode.manual.cta")}
          accent={false}
          delay={0.5}
          onPick={() => onPickManual()}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.68 }}
        className="mt-6 text-[12px] text-faint"
      >
        {t("pcb.mode.swap")}
      </motion.p>
    </div>
  );
}
