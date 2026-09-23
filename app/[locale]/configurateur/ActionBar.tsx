"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  Check,
  Copy,
  FileText,
  Link2,
  RefreshCw,
  Send,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Variant } from "@/lib/pcbuilder/generate";

/* The three variants are one decision with three answers, so they are one
   control with three segments rather than three controls that happen to sit
   next to each other. Joined, sharing their dividers, sized to their words. */
const SEGMENT =
  "flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-cloud hover:text-accent disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

/**
 * One of the quiet exits.
 *
 * At module scope, not inside `ActionBar`. A component declared in a render
 * body is a new component type on every render, so React unmounts and remounts
 * all five of these whenever anything on the page changes — which throws away
 * focus mid-interaction and restarts any transition they are running.
 *
 * These were unbordered `text-mute` labels, on the argument that outlined pills
 * beside a segmented control make three competing containers. The argument was
 * about a layout that no longer exists — the segmented control moved up to the
 * heading, and what these actually sit beside now is one filled accent button.
 * Outlined against filled is the ordinary way to say "secondary": there is no
 * competition, because the primary action is the only solid thing in the row.
 *
 * What was left was five pieces of grey text in a row, which is a legend, not a
 * set of controls — nothing about them said they could be pressed until the
 * cursor was already on one. So: a resting surface to give them an edge against
 * the white card, ink rather than mute for the label, and the icon carrying the
 * accent so the row reads as interactive standing still.
 */
function Quiet({
  icon: Icon,
  label,
  doneLabel,
  done,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  /** what this button says about itself for a moment after it is pressed */
  doneLabel: string;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      /* `bg-paper`, not `bg-cloud`. The card under these is white and cloud is
         #fafafc — a two-point difference that renders as no difference at all,
         which would have left the border doing the whole job. Paper is the
         site's own recessed surface and actually reads against white.

         The confirmed state is a conditional class rather than a `data-*`
         variant: nothing else in this codebase uses one, so there is no
         existing proof the variant survives the build, and a confirmation
         that silently does not apply is the exact bug being fixed here. */
      className={`group flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:border-line-soft disabled:bg-transparent disabled:text-faint disabled:hover:border-line-soft disabled:hover:bg-transparent disabled:hover:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
        done
          ? "border-accent bg-accent/10 text-accent"
          : "border-line bg-paper text-ink hover:border-accent/50 hover:bg-accent/8 hover:text-accent"
      }`}
    >
      {/* The icon swaps rather than the whole button, and the label crossfades
          under it. Replacing the control outright would change its width
          mid-row and shove the four beside it sideways — a confirmation that
          moves the thing you just pressed is worse than none. */}
      <span className="relative grid h-3.5 w-3.5 shrink-0 place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={done ? "done" : "idle"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 grid place-items-center"
          >
            {done ? (
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            ) : (
              <Icon className="h-3.5 w-3.5 text-accent transition-colors group-disabled:text-faint" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* Both words are always in the box, one of them invisible, so the pill
          is sized to the longer of the two at all times. Sizing to whichever
          is *currently* shown still reflows — "Copié" is shorter than
          "Copier", so the pill would shrink on press and drag the four beside
          it leftwards, which is why the resting label cannot be the only
          measure. This is why the component takes `doneLabel` even when it is
          not showing it. */}
      <span className="grid">
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
          {label}
        </span>
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
          {doneLabel}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={done ? "done" : "idle"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {done ? doneLabel : label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

/**
 * One segment of the variant control.
 *
 * At module scope for the same reason `Quiet` is: declared inside
 * `VariantSwitch` this would be a brand-new component type on every render,
 * so React would unmount and remount all three of them each time the build
 * changed — which is precisely when the confirmation is trying to animate, and
 * a remount restarts the animation from nothing.
 */
function Segment({
  icon: Icon,
  label,
  doneLabel,
  done,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  doneLabel: string;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button disabled={disabled} onClick={onClick} className={SEGMENT}>
      <span className="relative grid h-3.5 w-3.5 shrink-0 place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={done ? "done" : "idle"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 grid place-items-center"
          >
            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* Room reserved for both words at once, so a press cannot resize the
          segment. It matters more here than on the loose pills below: these
          share their dividers, so one segment changing width visibly drags the
          two beside it. */}
      <span className="grid">
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
          {label}
        </span>
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
          {doneLabel}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={done ? "done" : "idle"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {done ? doneLabel : label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

/**
 * Everything you can do with a finished configuration — PCB-12 to PCB-15.
 *
 * Two tiers, because these are two unrelated kinds of action wearing the same
 * clothes in every configurator that gets this wrong. The first changes the
 * machine. The second does something with the machine you already have. Laid
 * out as one undifferentiated row of pills — which is what this was — a
 * customer has to read all seven labels to find out which of them rebuilds
 * their config, and nothing says which single button finishes the job.
 *
 * Nothing stretches. A button the width of a column with a seven-letter word
 * in the middle of it reads as an empty box that happens to have a label; a
 * control should be the size of what it says.
 */
/**
 * Ask for a different machine — PCB-12.
 *
 * Lives at the top, with the heading, because it acts on the *whole* result:
 * press one and every figure on the page changes. Sat at the bottom under the
 * exits it read as a footnote to a decision already made, when it is really
 * the question a customer asks first — "what else have you got".
 */
export function VariantSwitch({
  disabled,
  done,
  onVariant,
}: {
  disabled: boolean;
  /** true for a moment after any of the three has rebuilt the machine */
  done: boolean;
  onVariant: (v: Variant) => void;
}) {
  const { t } = useLocale();

  /* One word for all three, and it is the honest one: whichever segment was
     pressed, what happened is that the machine got rebuilt. Echoing the
     variant back ("Moins cher ✓") would claim an outcome this control cannot
     promise — "cheaper" is a request to the generator, and on a build already
     at the floor of the catalogue it comes back at the same price. The figures
     in the instrument band above say what actually changed. */
  const doneLabel = t("pcb.act.updated");

  return (
    <div
      className={`inline-flex divide-x divide-line overflow-hidden rounded-xl border bg-white transition-colors rtl:divide-x-reverse ${
        done ? "border-accent" : "border-line"
      }`}
    >
      <Segment
        icon={RefreshCw}
        label={t("pcb.act.regenerate")}
        doneLabel={doneLabel}
        done={done}
        disabled={disabled}
        onClick={() => onVariant("same")}
      />
      <Segment
        icon={TrendingDown}
        label={t("pcb.act.cheaper")}
        doneLabel={doneLabel}
        done={done}
        disabled={disabled}
        onClick={() => onVariant("cheaper")}
      />
      <Segment
        icon={TrendingUp}
        label={t("pcb.act.faster")}
        doneLabel={doneLabel}
        done={done}
        disabled={disabled}
        onClick={() => onVariant("faster")}
      />
    </div>
  );
}

/**
 * Take the machine away, or buy it — PCB-13 to PCB-15.
 *
 * Directly under the parts, because that is the order the decision is made in:
 * you read what is in the box, then you commit to it. A cart button that is
 * not adjacent to the list of what it adds is asking for trust it has not
 * earned yet.
 */
/** The five quiet actions, as a key each so the bar knows which one to
    confirm. */
export type ActKey = "pdf" | "copy" | "whatsapp" | "share" | "save";

export function CommitBar({
  disabled,
  total,
  done,
  notice,
  onPdf,
  onCopy,
  onWhatsApp,
  onShare,
  onSave,
  onAddToCart,
}: {
  disabled: boolean;
  /** already formatted — printed inside the cart button */
  total: string;
  /** which action just succeeded, if any. The word each one says is this
      component's business, not the caller's — see DONE below. */
  done: ActKey | null;
  /** anything that could not be said inside a pill — a refusal, mostly */
  notice: string | null;
  onPdf: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onShare: () => void;
  onSave: () => void;
  onAddToCart: (origin: HTMLElement | null) => void;
}) {
  const { t } = useLocale();

  /* What each pill says once it has done its job. Kept here rather than passed
     in, because every one of these buttons needs its confirmation word even
     while it is not showing it — the pill reserves room for both so pressing
     it does not resize it. A caller that only sends the word at the moment of
     success cannot satisfy that. */
  const DONE: Record<ActKey, string> = {
    pdf: t("pcb.act.opened"),
    copy: t("pcb.act.copied"),
    whatsapp: t("pcb.act.opened"),
    share: t("pcb.act.linkCopied"),
    save: t("pcb.act.saved"),
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        {/* No negative inset any more: that existed to pull an unbordered
            button's *text* back onto the card's padding edge, and doing it to a
            pill drags the border off the edge instead. The gap opens up to match
            — 2px between five outlined shapes reads as one broken control. */}
        <div className="flex flex-wrap items-center gap-2">
          <Quiet icon={FileText} label={t("pcb.act.pdf")} doneLabel={DONE.pdf} done={done === "pdf"} onClick={onPdf} disabled={disabled} />
          <Quiet icon={Copy} label={t("pcb.act.copy")} doneLabel={DONE.copy} done={done === "copy"} onClick={onCopy} disabled={disabled} />
          {/* WhatsApp has no mark in this icon set and its glyph is a trademark.
              A paper plane says "send this somewhere" without approximating a
              logo — and it no longer repeats the share icon sitting next to it,
              which is what the product page settled on. */}
          <Quiet icon={Send} label={t("pcb.act.whatsapp")} doneLabel={DONE.whatsapp} done={done === "whatsapp"} onClick={onWhatsApp} disabled={disabled} />
          <Quiet icon={Link2} label={t("pcb.act.share")} doneLabel={DONE.share} done={done === "share"} onClick={onShare} disabled={disabled} />
          <Quiet icon={Bookmark} label={t("pcb.act.save")} doneLabel={DONE.save} done={done === "save"} onClick={onSave} disabled={disabled} />
        </div>

        {/* The one thing that finishes the job, and the only filled control on
            the page. It carries the total: a customer committing to a machine
            should not have to look back up the page to see what they are
            agreeing to pay. */}
        <button
          disabled={disabled}
          onClick={(e) => onAddToCart(e.currentTarget)}
          className="btn-accent ms-auto flex w-full items-center justify-center gap-2.5 rounded-full px-7 py-3 text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
        >
          <ShoppingCart className="h-4 w-4" />
          {t("pcb.act.cart")}
          <span className="opacity-55">·</span>
          <span dir="ltr" className="tabular-nums">{total}</span>
        </button>
      </div>

      {/* Where a refusal goes.
          A blocked pop-up, or a clipboard the browser would not hand over,
          needs a sentence rather than a word — and it has to appear beside the
          button that was pressed. This used to flash next to the variant
          switch at the top of the page, a screen and a half above the click
          that caused it, which is the same as not showing it.

          Outside the controls row on purpose. Inside it, `w-full` would make
          this wrap onto its own line and the row's `gap-y-4` would reserve
          16px above it permanently — flex gap applies between items whatever
          their height, so a collapsed region still costs the full gap. Out
          here an empty region costs nothing.

          `aria-live` sits on the container, not the message, so the region is
          already mounted and being watched before there is anything in it. */}
      <div aria-live="polite">
        <AnimatePresence initial={false}>
          {notice && (
            <motion.p
              key={notice}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden text-[12px] font-medium text-accent"
            >
              <span className="block pt-3">{notice}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
