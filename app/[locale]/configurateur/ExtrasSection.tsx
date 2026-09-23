"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Armchair,
  Ban,
  Check,
  Fan,
  Headphones,
  Keyboard,
  Lock,
  Mic,
  Monitor,
  Mouse,
  RectangleHorizontal,
  Sparkles,
  Webcam,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA, type Product } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import {
  EXTRA_KINDS,
  extraPool,
  extrasCount,
  extrasTotal,
  type ExtraKind,
  type Extras,
} from "@/lib/pcbuilder/extras";
import { Medallion } from "./BuildSheet";

/** One glyph per slot, on the same argument the parts grid makes: the
    catalogue's photography repeats across products, so the tile has to be
    identifiable without reading it. */
const EXTRA_ICON: Record<ExtraKind, LucideIcon> = {
  monitor: Monitor,
  keyboard: Keyboard,
  mouse: Mouse,
  headset: Headphones,
  mousepad: RectangleHorizontal,
  fans: Fan,
  mic: Mic,
  webcam: Webcam,
  chair: Armchair,
};

/** A product shot that falls back to its slot glyph. Same failure mode as the
    parts grid: a missing file should read as a product with no photo yet,
    never as a broken image in a price list.
 *
 *  `alt=""` on purpose. Every one of these sits inside a control whose label
 *  already names the product, and a described shot makes the button announce
 *  the name twice. */
function Shot({ product, kind, size }: { product: Product; kind: ExtraKind; size: number }) {
  const [failed, setFailed] = useState(false);
  const Icon = EXTRA_ICON[kind];

  return (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-paper"
    >
      {failed ? (
        <Icon aria-hidden className="h-4 w-4 text-mute" strokeWidth={1.8} />
      ) : (
        <img
          src={product.image}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
}

/** A count in a sentence, with the singular actually written out.
 *
 *  This phrasebook has no plural machinery, so a second key per string — the
 *  same key with a `1` on the end — is a smaller answer than a plural-rule
 *  system for two sentences. */
const counted = (t: (k: string) => string, key: string, n: number) =>
  fill(t(n === 1 ? `${key}1` : key), { n });

/**
 * One slot, as a tile — the same object as a bay in the parts grid above it.
 *
 * The whole tile is the button. It opens the slot's list; it does not pick
 * anything by itself, so there is no second control on it to compete with.
 *
 * Disabled, not hidden, while the machine is unfinished. The shelf being
 * visible is what tells the customer it exists — a section that appears only
 * once all eight bays are full is a section most people never learn to look
 * for — and the header says, in words, why none of it can be pressed yet.
 */
function SlotTile({
  kind,
  chosen,
  suggested,
  locked,
  onOpen,
}: {
  kind: ExtraKind;
  chosen: Product | null;
  /** filled from the customer's own answer rather than by them, so the tile
      says so — an item nobody remembers choosing is an item they distrust */
  suggested: boolean;
  locked: boolean;
  onOpen: () => void;
}) {
  const { t, locale } = useLocale();

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onOpen}
      aria-haspopup="dialog"
      className="group/tile flex h-full w-full flex-col items-center rounded-2xl border border-line bg-white px-4 pb-4 pt-5 text-center transition-colors hover:border-ink/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:hover:border-line"
    >
      <Medallion icon={EXTRA_ICON[kind]} src={chosen?.image} tone={locked ? "off" : "idle"} />
      <span className={`mt-3 block text-[14px] font-semibold leading-tight ${locked ? "text-faint" : "text-ink"}`}>
        {t(`extra.${kind}`)}
      </span>

      {chosen ? (
        <span className="flex w-full flex-1 flex-col items-center">
          <span
            dir="ltr"
            title={chosen.name}
            className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-mute"
          >
            {chosen.name}
          </span>
          {/* Plain accent type, not a tinted pill — see the verdict in the
              page heading for why the pills went. */}
          {suggested && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent">
              <Sparkles className="h-3 w-3" />
              {t("pcb.extras.picked")}
            </span>
          )}
          <span className="mt-auto pt-3 font-display text-[16px] font-bold tabular-nums text-ink">
            {formatDA(chosen.price, locale)}
          </span>
          <span className="mt-1.5 text-[11.5px] font-medium text-faint transition-colors group-hover/tile:text-accent">
            {t("pcb.build.swap")}
          </span>
        </span>
      ) : (
        <span
          className={`mt-1 text-[12.5px] text-faint transition-colors ${locked ? "" : "group-hover/tile:text-accent"}`}
        >
          {t("pcb.build.choose")}…
        </span>
      )}
    </button>
  );
}

/**
 * A slot's list, over the page.
 *
 * The same dark dialog the parts drawer uses, so choosing a screen and
 * choosing a graphics card feel like one tool. The slots used to open inline,
 * as a list under their row; a tile in a grid has no row to open under, and
 * a panel dropped below the whole grid lands a screen away from the tile that
 * was pressed.
 *
 * Priced as a difference from what is chosen, like the parts drawer — the
 * decision being made is "what does this one cost me more". Picking closes the
 * dialog; the way to take none is its own row at the foot, because in a list
 * of optional extras, emptying a slot has to be as easy as filling it.
 */
function SlotPicker({
  kind,
  options,
  chosen,
  onPick,
  onClose,
}: {
  kind: ExtraKind;
  options: Product[];
  chosen: Product | null;
  /** null takes none */
  onPick: (slug: string | null) => void;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const Icon = EXTRA_ICON[kind];

  /* Read once, the same way the parts drawer does: a bottom sheet on a phone,
     a centred dialog on anything wider. */
  const [wide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches,
  );
  const offscreen = reduced
    ? { opacity: 0 }
    : wide
      ? { opacity: 0, y: 16, scale: 0.97 }
      : { opacity: 0, y: 30, scale: 1 };

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      /* The parts drawer's layer: above the header, below the lightbox. */
      className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t(`extra.${kind}`)}
        initial={offscreen}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={offscreen}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink text-paper shadow-[0_24px_70px_rgba(21,21,26,0.5)] sm:max-h-[82svh] sm:max-w-[34rem] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 p-5 sm:p-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent-lit/40 bg-accent-lit/12 text-accent-lit">
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <h2 className="flex-1 font-display text-lg font-bold">{t(`extra.${kind}`)}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t("c.close")}
            className="rounded-full border border-white/15 p-2 text-paper/60 transition-colors hover:border-white/40 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5 sm:p-6">
          {options.map((product) => {
            const isCurrent = product.slug === chosen?.slug;
            const delta = chosen ? product.price - chosen.price : null;

            return (
              <li key={product.slug}>
                <button
                  type="button"
                  aria-pressed={isCurrent}
                  onClick={() => (isCurrent ? onClose() : onPick(product.slug))}
                  className={`w-full rounded-xl border p-3.5 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lit ${
                    isCurrent
                      ? "border-accent-lit/50 bg-accent-lit/12"
                      : "border-white/10 hover:border-accent-lit/45 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <Shot product={product} kind={kind} size={40} />

                    <span className="min-w-0 flex-1">
                      <span dir="ltr" className="block text-[13.5px] font-semibold rtl:text-end">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-paper/55">
                        {formatDA(product.price, locale)}
                        {!product.stock && <span className="text-amber-400"> · {t("cata.avail.pre")}</span>}
                      </span>
                    </span>

                    <span className="shrink-0 text-end">
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
                    </span>
                  </span>
                </button>
              </li>
            );
          })}

          {chosen && (
            <li>
              <button
                type="button"
                onClick={() => onPick(null)}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 p-3.5 text-start text-[13px] font-medium text-paper/60 transition-colors hover:border-white/35 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lit"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-paper/40">
                  <Ban className="h-4 w-4" strokeWidth={1.8} />
                </span>
                {t("pcb.extras.skip")}
              </button>
            </li>
          )}
        </ul>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/**
 * The setup around the machine — PCB-04.
 *
 * The same grid as the parts above it, one tile per slot, so the page reads
 * as two shelves of one shop: what the machine is made of, then what goes
 * around it.
 *
 * Comes *after* the eight bays are full, and says so while they are not. The
 * order is the point: a screen, a keyboard and a chair are chosen against a
 * machine that exists and a budget with a known amount left in it, and
 * offering them while the tower is still being specced sells the customer
 * peripherals for a computer that has not been decided yet.
 *
 * Nothing here is required and nothing here is checked for compatibility —
 * these are products sold beside the build, not parts of it, which is why
 * they are their own section rather than more tiles in the parts grid.
 */
export function ExtrasSection({
  extras,
  suggested,
  locked,
  onPick,
}: {
  extras: Extras;
  /** slots the assistant filled from the scope answer, so the tiles can say so */
  suggested: Set<ExtraKind>;
  /** the machine is not finished — the tiles stay disabled and the header
      explains why */
  locked: boolean;
  /** null clears the slot */
  onPick: (kind: ExtraKind, slug: string | null) => void;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState<ExtraKind | null>(null);

  const count = extrasCount(extras);
  const subtotal = extrasTotal(extras);

  /* A slot the catalogue cannot fill is not shown at all. An empty shelf with
     a button on it is a promise the store does not keep. */
  const slots = EXTRA_KINDS.map((kind) => ({ kind, options: extraPool(kind) })).filter(
    (slot) => slot.options.length > 0,
  );

  const openSlot = slots.find((s) => s.kind === open);
  /* Stable, because the dialog focuses its close button and locks the page's
     scroll in an effect keyed on it — a fresh function every render would
     re-run that effect and yank focus back to the close button each time. */
  const close = useCallback(() => setOpen(null), []);

  return (
    <section aria-labelledby="pcb-extras-title" className="pt-6">
      <header className="mb-4 text-center">
        <h2 id="pcb-extras-title" className="font-display text-[22px] font-bold leading-tight text-ink">
          {t("pcb.extras.title")}
        </h2>
        <p className="mx-auto mt-1 max-w-[62ch] text-[13px] leading-relaxed text-mute">
          {t(locked ? "pcb.extras.locked" : "pcb.extras.lead")}
        </p>

        {locked ? (
          <p className="mx-auto mt-2 flex max-w-[62ch] items-center justify-center gap-2 text-[12.5px] text-faint">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            {t("pcb.extras.lockedHint")}
          </p>
        ) : (
          count > 0 && (
            <p className="mt-2 flex items-center justify-center gap-3 text-[13px]">
              <span className="text-mute">{counted(t, "pcb.extras.chosen", count)}</span>
              {/* A hairline, not a middle dot — see the verdict in the page heading. */}
              <span aria-hidden className="h-3.5 w-px bg-line" />
              <span className="font-display text-[15px] font-bold tabular-nums text-ink">
                {formatDA(subtotal, locale)}
              </span>
            </p>
          )
        )}
      </header>

      <div className="@container">
        <ul className="grid grid-cols-2 gap-2.5 @min-[40rem]:grid-cols-3 @min-[40rem]:gap-3 @min-[50rem]:grid-cols-4">
          {slots.map(({ kind, options }) => (
            <li key={kind} className="min-w-0">
              <SlotTile
                kind={kind}
                chosen={options.find((p) => p.slug === extras[kind]) ?? null}
                suggested={suggested.has(kind)}
                locked={locked}
                onOpen={() => setOpen(kind)}
              />
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {openSlot && !locked && (
          <SlotPicker
            key={openSlot.kind}
            kind={openSlot.kind}
            options={openSlot.options}
            chosen={openSlot.options.find((p) => p.slug === extras[openSlot.kind]) ?? null}
            onPick={(slug) => {
              onPick(openSlot.kind, slug);
              close();
            }}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
