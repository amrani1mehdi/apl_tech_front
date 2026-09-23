"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Search, TriangleAlert, X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA, subName } from "@/lib/products";
import { catName } from "@/lib/i18n";
import { lines, partOf, pool, type Build, type Part, type PartKind } from "@/lib/pcbuilder/parts";
import { breaks, fill, type Issue } from "@/lib/pcbuilder/engine";
import { PART_ICON, PartThumb } from "./BuildSheet";

/**
 * Alternatives for one bay — PCB-11.
 *
 * The list is compatible parts only. Searching a catalogue and being offered
 * things that cannot go in the machine you are holding is not a search, it is
 * a catalogue with extra steps — and the customer has already told us exactly
 * which seven other components the answer has to live with.
 *
 * Incompatible parts are not deleted, though. They sit behind one line at the
 * bottom, each with the actual reason, because hiding them outright produces
 * the configurator's oldest complaint: a customer knows the shop stocks a
 * 9950X, does not see it anywhere, and concludes the site is broken or the
 * part is sold out. One line answers that before it is asked — and it stays
 * accurate while searching, so a query that only matches incompatible parts
 * says so instead of returning nothing.
 *
 * Every option is priced as a difference from what is fitted now, because that
 * is the decision being made. Nobody swapping a cooler wants to re-read the
 * total; they want to know what this one costs *more*.
 *
 * A drawer on the trailing edge, not a dialog in the middle. This was centred,
 * and centring it covered the two things the choice is actually made against:
 * the machine in the rail and the spend-against-budget meter. Picking a
 * graphics card is a comparison, and a panel that hides what is being compared
 * to forces the customer to close it, look, and open it again — which is also
 * how a list you have scrolled and a query you have typed get thrown away.
 *
 * Against the trailing edge the rail stays on screen, so the drawing, the
 * total and the compatibility verdict are all still readable while the list is
 * open.
 *
 * Dark, and flush to the edge. The page it opens over is a white-cards-on-
 * cloud layout, and a white panel on it had no edge of its own — it read as
 * the page having grown a column rather than as something opened on top of it.
 * Inverting the surface is what separates the two without needing a heavier
 * scrim, which would have cost the context the drawer was moved here to keep.
 *
 * Rendered through a portal, not in place. It was mounted inside the result
 * page's `relative z-10` wrapper, and `z-10` opens a stacking context — so
 * `z-[70]` on the scrim was being resolved *inside* that context, and the
 * whole drawer sat under a header at `z-50`. No z-index on the drawer itself
 * could have fixed that; it had to leave the subtree.
 */

type Option = { part: Part; errors: Issue[]; blocked: boolean };

/**
 * The matched run of a product name, marked.
 *
 * Without it a filtered list is a leap of faith: you type "850", four rows
 * vanish and you have to go looking for what the two survivors had in common.
 * Marking the hit answers that before the question forms — and when the match
 * came from a spec or a shelf key rather than the name, nothing is marked,
 * which is itself the honest answer to "why is this one here".
 *
 * First occurrence only. A second mark in the same name is noise at this size.
 */
function Marked({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const i = text.toLowerCase().indexOf(term);
  if (i === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-accent-lit/20 px-0.5 text-accent-lit">
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}

export function SwapDrawer({
  kind,
  replacing,
  build,
  onPick,
  onClose,
}: {
  kind: PartKind;
  /** the row being replaced, or null to fill an empty bay or add a product
      beside the ones already in a memory or storage bay */
  replacing: string | null;
  build: Build;
  onPick: (slug: string) => void;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);

  /* Which edge the panel arrives from.

     A phone keeps the bottom sheet it already had — a 26rem side panel on a
     390px screen is a full-screen modal with a sliver of backdrop showing —
     and anything wider gets the drawer.

     Read once at mount rather than watched, because the panel is opened by a
     click and closed by a pick: nobody drags a window across the 640px line
     in between, and a resize listener here would only buy the ability to
     change the exit animation of something already leaving. Safe to touch
     `window` in the initialiser — the host renders nothing until `open`, and
     `open` is false until someone clicks. */
  const [wide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches,
  );

  /* A dialog in the middle of the screen has no edge to come from, so it
     arrives on its own axis: a short rise and a hair of scale on a pointer
     screen, and the bottom-sheet slide kept on a phone where the panel is
     still anchored to the bottom edge.

     No `x` in it any more, which quietly retires a bug this had to carry:
     Motion's x is physical, so the old trailing-edge slide had to be resolved
     against the writing direction or the Arabic panel crossed the whole screen
     to reach the side it was landing on. Nothing to resolve when nothing
     travels sideways. */
  const offscreen = reduced
    ? { opacity: 0 }
    : wide
      ? { opacity: 0, y: 16, scale: 0.97 }
      : { opacity: 0, y: 30, scale: 1 };

  const current = replacing ? partOf(replacing) : null;
  const Icon = PART_ICON[kind];

  /* Opened from "Ajouter un kit mémoire" rather than from a row. Nothing is
     being replaced, so nothing is marked current and no price is written as a
     difference — every option is simply what it would add. */
  const adding = !current && lines(build, kind).length > 0;

  /* A row holding two kits is replaced by two of the new kit — see
     `applyPick` — so the difference is quoted for both, or the figure on the
     option would disagree with the total the customer lands on. */
  const currentQty = lines(build, kind).find((l) => l.slug === replacing)?.qty ?? 1;

  useEffect(() => {
    /* Focus the field on a pointer-sized screen, where typing straight away is
       the point of the drawer. On a phone it is a bottom sheet and focusing
       raises the keyboard over the very list the customer came to read, so
       there the close button takes focus and the field waits to be tapped. */
    if (window.matchMedia("(min-width: 640px)").matches) searchRef.current?.focus();
    else closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const { fits, blocked } = useMemo(() => {
    const term = q.trim().toLowerCase();

    /* The haystack the site's own search builds — name, brand, category and
       every spec value — so "ddr5", "am5" or "850" find a part here exactly as
       they would in the header search.

       Plus the raw shelf keys, which is what makes the words customers
       actually type work. A watercooler's specs say "Format: 240 mm" and
       nowhere say "AIO"; its shelf is `refro-aio`, so searching "aio" finds it
       through the key rather than through prose nobody wrote. Same for "atx",
       "ddr4", "gold", "nvme". */
    const matches = (part: Part) => {
      if (!term) return true;
      const p = part.product;
      const hay = `${p.name} ${p.brand} ${catName(p.category, locale)} ${
        p.subcategory ? subName(p.subcategory) : ""
      } ${p.category} ${p.subcategory ?? ""} ${p.specs.map((s) => s.v).join(" ")}`.toLowerCase();
      return hay.includes(term);
    };

    const all: Option[] = pool(kind)
      .filter(matches)
      .map((part) => {
        const errors = breaks(build, kind, part.product.slug, replacing);
        return { part, errors, blocked: errors.length > 0 };
      });

    const byValue = (a: Option, b: Option) =>
      /* What is fitted now leads: every other price on the list is written as
         a difference from it, so it is the one row that has to be findable. */
      Number(b.part.product.slug === current?.product.slug) -
        Number(a.part.product.slug === current?.product.slug) ||
      Number(b.part.product.stock) - Number(a.part.product.stock) ||
      a.part.product.price - b.part.product.price;

    return {
      fits: all.filter((o) => !o.blocked).sort(byValue),
      blocked: all.filter((o) => o.blocked).sort(byValue),
    };
  }, [build, kind, q, current, locale, replacing]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      /* Above the header (z-50), below the product lightbox (z-[120]) — that
         one is a full takeover and nothing should ever be over it. */
      className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        /* "Remplacer — Processeur" only describes the panel when there is a
           processor to replace. Opened on an empty bay from the manual builder
           it is choosing one, and that is what the dialog should announce. */
        aria-label={fill(t(current ? "pcb.build.swapTitle" : adding ? "pcb.build.addTitle" : "pcb.build.chooseTitle"), {
          part: t(`part.${kind}`),
        })}
        initial={offscreen}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={offscreen}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink text-paper shadow-[0_24px_70px_rgba(21,21,26,0.5)] sm:max-h-[82svh] sm:max-w-[34rem] sm:rounded-2xl"
      >
        <div className="shrink-0 border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent-lit/40 bg-accent-lit/12 text-accent-lit">
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <h2 className="flex-1 font-display text-lg font-bold">
              {adding ? t(kind === "ram" ? "pcb.build.addRam" : "pcb.build.addSsd") : t(`part.${kind}`)}
            </h2>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label={t("c.close")}
              className="rounded-full border border-white/15 p-2 text-paper/60 transition-colors hover:border-white/40 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lit"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 transition-colors focus-within:border-accent-lit focus-within:bg-white/10">
            <Search className="h-4 w-4 shrink-0 text-paper/40" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder={t("pcb.build.search")}
              aria-label={t("pcb.build.search")}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-paper placeholder:text-paper/40 focus:outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label={t("c.close")}
                className="shrink-0 rounded-full p-0.5 text-paper/50 transition-colors hover:text-paper"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* The count rolls rather than blinking. It is the one line that
              confirms a keystroke did something when the rows that changed are
              below the fold, so it has to be seen changing. */}
          <div className="mt-2.5 h-[1.05rem] overflow-hidden text-[11.5px] text-paper/55">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={fits.length}
                initial={reduced ? false : { y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { y: -14, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {fill(t("pcb.build.fitCount"), { n: fits.length })}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {fits.length === 0 && blocked.length === 0 ? (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="py-8 text-center text-[13px] text-paper/60"
            >
              {q ? t("pcb.build.noMatch") : t("pcb.build.swapNone")}
            </motion.p>
          ) : (
            /* `layout` on every row and `popLayout` around them is what makes
               filtering read as the list *reflowing* rather than as one list
               being replaced by another. Rows that survive the keystroke slide
               to their new place, rows that no longer match fall away without
               taking the layout with them, and new matches drop in.

               Keys are slugs, so a row keeps its identity across every query —
               index keys would make React reuse row three's DOM for a
               different product and the animation would show a part morphing
               into another part. */
            <motion.ul layout className="space-y-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {fits.map(({ part }, i) => {
                  const isCurrent = part.product.slug === current?.product.slug;

                  /* Null when the bay is empty, and that is not the same as
                     zero. A difference is only meaningful against something
                     fitted; with nothing in the bay the "difference" is just
                     the price, and printing it in the trailing column put the
                     same figure on the row twice — once plain underneath the
                     name, once again with a `+` in front of it. The manual
                     builder (PCB-16) opens with all eight bays like this. */
                  const delta = current ? (part.product.price - current.product.price) * currentQty : null;

                  return (
                    <motion.li
                      key={part.product.slug}
                      layout
                      initial={reduced ? false : { opacity: 0, y: -8, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                      transition={{
                        duration: 0.26,
                        ease: [0.16, 1, 0.3, 1],
                        /* Capped, and only on the way in. A long stagger on a
                           list that re-filters per keystroke turns typing into
                           a wave the reader is always waiting on. */
                        delay: Math.min(i * 0.03, 0.15),
                      }}
                    >
                    <button
                      onClick={() => !isCurrent && onPick(part.product.slug)}
                      disabled={isCurrent}
                      className={`w-full rounded-xl border p-3.5 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lit ${
                        isCurrent
                          ? "border-accent-lit/50 bg-accent-lit/12"
                          : "border-white/10 hover:border-accent-lit/45 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <PartThumb
                          src={part.product.image}
                          alt={part.product.name}
                          kind={kind}
                          broken={false}
                          size={40}
                        />

                        <div className="min-w-0 flex-1">
                          <p dir="ltr" className="text-[13.5px] font-semibold rtl:text-end">
                            <Marked text={part.product.name} term={q.trim().toLowerCase()} />
                          </p>
                          <p className="mt-0.5 text-[11px] text-paper/55">
                            <span>{formatDA(part.product.price, locale)}</span>
                            {!part.product.stock && (
                              <span className="text-amber-400"> · {t("c.outOfStock")}</span>
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-end">
                          {isCurrent ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-accent-lit">
                              <Check className="h-3 w-3" strokeWidth={3} />
                              {t("pcb.build.current")}
                            </span>
                          ) : (
                            delta !== null && (
                              <span
                                dir="ltr"
                                className={`text-[12px] font-semibold ${
                                  delta > 0 ? "text-paper/60" : delta < 0 ? "text-emerald-400" : "text-paper/40"
                                }`}
                              >
                                {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                                {formatDA(Math.abs(delta), locale)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}

          {blocked.length > 0 && (
            <div className={fits.length > 0 ? "mt-4" : ""}>
              <button
                onClick={() => setShowBlocked((v) => !v)}
                aria-expanded={showBlocked}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-[12px] font-medium text-paper/55 transition-colors hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lit"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${showBlocked ? "rotate-180" : ""}`}
                />
                {fill(t("pcb.build.blockedCount"), { n: blocked.length })}
              </button>

              <AnimatePresence initial={false}>
                {showBlocked && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-2 overflow-hidden"
                  >
                    {blocked.map(({ part, errors }) => (
                      <li key={part.product.slug}>
                        <div className="cursor-not-allowed rounded-xl border border-white/8 bg-white/[0.03] p-3.5 opacity-70">
                          <div className="flex items-start gap-3">
                            <PartThumb
                              src={part.product.image}
                              alt={part.product.name}
                              kind={kind}
                              broken
                              size={40}
                            />
                            <div className="min-w-0 flex-1">
                              <p dir="ltr" className="text-[13.5px] font-semibold rtl:text-end">
                                {part.product.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-paper/55">
                                {formatDA(part.product.price, locale)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2.5 flex gap-2 border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-red-400">
                            <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
                            <span>{fill(t(errors[0].key), errors[0].vars)}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export function SwapDrawerHost(props: Parameters<typeof SwapDrawer>[0] & { open: boolean }) {
  const { open, ...rest } = props;
  return <AnimatePresence>{open && <SwapDrawer {...rest} />}</AnimatePresence>;
}
