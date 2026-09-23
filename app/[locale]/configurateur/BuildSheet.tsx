"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  HardDrive,
  Lock,
  MemoryStick,
  Minus,
  MonitorPlay,
  Plus,
  Trash2,
  Zap,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import {
  PART_KINDS,
  isMulti,
  lines,
  capacityIn,
  maxQuantity,
  type Build,
  type Line,
  type PartKind,
} from "@/lib/pcbuilder/parts";

/** One glyph per bay. The list reads as a machine rather than a receipt when
    the rows are identifiable at a glance, and these are the eight shapes
    anyone who has opened a tower already knows. */
export const PART_ICON: Record<PartKind, LucideIcon> = {
  cpu: Cpu,
  gpu: MonitorPlay,
  mb: CircuitBoard,
  ram: MemoryStick,
  ssd: HardDrive,
  cooling: Fan,
  case: Box,
  psu: Zap,
};

/**
 * A part's photograph, with its bay glyph kept as a badge on the corner.
 *
 * Both, rather than one or the other, and the reason is the catalogue as it
 * stands: sixteen products share `/products/cpu.jpg` and sixteen more share
 * `/products/setup.jpg`, so a normal build shows the same photograph on four
 * consecutive rows. A photo alone would make the list unscannable — four
 * identical thumbnails and you have to read every line to tell the processor
 * from the memory. The glyph keeps each row identifiable at a glance no matter
 * what the photography is doing, and it costs fourteen pixels.
 *
 * When real per-product shots land this needs no change: the badge stays
 * useful, and the photographs stop repeating on their own.
 *
 * `onError` falls back to the glyph alone. A missing file should read as a
 * part with no photo yet, never as a broken image icon in a price list.
 */
export function PartThumb({
  src,
  alt,
  kind,
  broken,
  size = 48,
}: {
  src?: string;
  alt: string;
  kind: PartKind;
  broken: boolean;
  /** px — 48 in the parts list, smaller in the swap drawer's denser rows */
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const Icon = PART_ICON[kind];
  const showPhoto = Boolean(src) && !failed;

  return (
    <span
      style={{ width: size, height: size }}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border transition-colors ${
        broken ? "border-red-200 bg-red-100" : "border-line bg-paper"
      }`}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon className={`h-4 w-4 ${broken ? "text-red-600" : "text-mute"}`} strokeWidth={1.8} />
      )}

      {showPhoto && (
        <span
          aria-hidden
          className={`absolute -bottom-px -end-px grid h-[17px] w-[17px] place-items-center rounded-full border border-white bg-white/95 ${
            broken ? "text-red-600" : "text-mute"
          }`}
        >
          <Icon className="h-[9px] w-[9px]" strokeWidth={2.2} />
        </span>
      )}
    </span>
  );
}

/** Memory reads in gigabytes at any size; storage switches to terabytes at
    one, because "2000 Go" is a number nobody says about a drive. */
function capacityLabel(t: (k: string) => string, kind: PartKind, gb: number, locale: string): string {
  if (kind === "ssd" && gb >= 1000) {
    const tb = (gb / 1000).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 1 });
    return fill(t("pcb.slots.tb"), { n: tb });
  }
  return fill(t("pcb.slots.gb"), { n: gb });
}

/**
 * What a memory or storage bay adds up to — "48 Go", "3 To".
 *
 * Capacity only. This used to carry a slot count beside it, "4 sur 4 slots",
 * and the slot count went with the rules that needed boards to declare how
 * many slots they have: a figure the catalogue is not asked to keep is a
 * figure this line cannot print truthfully.
 */
function CapacityMeta({ kind, build, className = "" }: { kind: PartKind; build: Build; className?: string }) {
  const { t, locale } = useLocale();
  return (
    <p className={`text-[11.5px] tabular-nums text-mute ${className}`}>
      {capacityLabel(t, kind, capacityIn(build, kind), locale)}
    </p>
  );
}

/**
 * Two of the same kit, or three of the same drive.
 *
 * `aria-disabled` rather than `disabled`, on both ends. A disabled button
 * swallows the pointer, so its title never shows — and each end has a reason
 * worth reading when it will not move: the machine needs at least one of this,
 * or the bay is at the most one build takes (see `maxInBay`). A limit nobody
 * explains reads as a broken button.
 */
function Stepper({
  name,
  qty,
  max,
  removable,
  onChange,
}: {
  name: string;
  qty: number;
  max: number;
  /** whether stepping below one removes the row — false for the only row in a
      bay, and for a part pinned from a product page */
  removable: boolean;
  onChange: (qty: number) => void;
}) {
  const { t } = useLocale();
  const canLess = qty > 1 || removable;
  const canMore = qty < max;
  const removes = qty === 1 && removable;

  const control =
    "grid h-7 w-7 place-items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

  return (
    <div
      role="group"
      aria-label={`${t("pcb.build.qty")} — ${name}`}
      /* The row behind this opens the drawer. A tap on the stepper is not a
         request to swap the part it is counting. */
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center rounded-full border border-line bg-white"
    >
      <button
        type="button"
        aria-disabled={!canLess}
        aria-label={removes ? t("pcb.build.remove") : t("pcb.build.less")}
        title={canLess ? undefined : t("pcb.build.keepOne")}
        onClick={() => canLess && onChange(qty - 1)}
        className={`${control} ${canLess ? "text-mute hover:bg-cloud hover:text-ink" : "cursor-not-allowed text-faint/50"}`}
      >
        {removes ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" strokeWidth={2.2} />}
      </button>

      <span
        aria-live="polite"
        className="min-w-[1.4rem] text-center font-display text-[14px] font-bold tabular-nums text-ink"
      >
        {qty}
      </span>

      <button
        type="button"
        aria-disabled={!canMore}
        aria-label={t("pcb.build.more")}
        title={canMore ? undefined : t("pcb.build.qtyMax")}
        onClick={() => canMore && onChange(qty + 1)}
        className={`${control} ${canMore ? "text-mute hover:bg-cloud hover:text-ink" : "cursor-not-allowed text-faint/50"}`}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

/**
 * The round mark at the top of a tile — the bay's glyph while it is empty, the
 * product's photograph once something is in it.
 *
 * The two states are meant to be told apart from across the page. A grid of
 * purple discs is a machine still to be chosen; every disc that has turned
 * into a photograph is a decision made. On the manual builder's opening screen
 * the discs are the whole instruction — eight of them, each saying what goes
 * there — which is the job the reference tiles do and the reason for the size.
 *
 * The glyph stays on a filled disc as a badge, on the argument `PartThumb`
 * makes: the catalogue's photography repeats across products, so a photo alone
 * would not say which bay it is.
 *
 * Exported for the setup shelf, whose tiles are the same object.
 */
export function Medallion({
  icon: Icon,
  src,
  tone = "idle",
  size = 60,
}: {
  icon: LucideIcon;
  src?: string;
  /** `broken` and `changed` ring the disc; `off` greys an unavailable tile */
  tone?: "idle" | "broken" | "changed" | "off";
  size?: number;
}) {
  /* Remembered per source rather than as a flag, so a part swapped in after a
     broken photo gets its own chance to load instead of inheriting the glyph. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = Boolean(src) && failedSrc !== src;

  const ring =
    tone === "broken"
      ? "ring-2 ring-alert ring-offset-2 ring-offset-white"
      : tone === "changed"
        ? "ring-2 ring-accent ring-offset-2 ring-offset-white"
        : "";

  return (
    <span className="relative inline-grid shrink-0" style={{ width: size, height: size }}>
      <span
        className={`grid h-full w-full place-items-center overflow-hidden rounded-full transition-shadow duration-300 ${
          photo
            ? "border border-line bg-paper"
            : tone === "off"
              ? "bg-line-soft text-faint"
              : "bg-accent-gradient text-white"
        } ${ring}`}
      >
        {photo ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailedSrc(src ?? null)}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon aria-hidden className="h-[42%] w-[42%]" strokeWidth={1.6} />
        )}
      </span>

      {photo && (
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -end-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white text-white ${
            tone === "broken" ? "bg-alert" : "bg-accent"
          }`}
        >
          <Icon className="h-3 w-3" strokeWidth={2.2} />
        </span>
      )}
    </span>
  );
}

/** Stock, and the pin when there is one — the small line under a product name. */
function StockLine({ inStock, locked }: { inStock: boolean; locked: boolean }) {
  const { t } = useLocale();
  return (
    <span className="mt-1 flex flex-wrap items-center justify-center gap-x-2.5 text-[11.5px]">
      <span className={inStock ? "text-emerald-600" : "text-amber-600"}>
        {t(inStock ? "c.inStock" : "c.outOfStock")}
      </span>
      {locked && (
        <span className="inline-flex items-center gap-1 text-accent">
          <Lock className="h-2.5 w-2.5" /> {t("pcb.build.locked")}
        </span>
      )}
    </span>
  );
}

/** "Remplacer", quiet until the tile is pointed at — the filled counterpart to
    the empty tile's "Choisir…". */
function SwapHint({ group }: { group: "tile" | "line" }) {
  const { t } = useLocale();
  return (
    <span
      className={`mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-faint transition-colors ${
        group === "tile" ? "group-hover/tile:text-accent" : "group-hover/line:text-accent"
      }`}
    >
      <ArrowLeftRight className="h-3 w-3" />
      {t("pcb.build.swap")}
    </span>
  );
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * One bay, as a tile.
 *
 * A bay that takes one part is one button, the whole tile, the way the
 * reference grid works: press the processor tile to choose or replace the
 * processor. Everything readable sits inside it — no second control competes
 * with it, so there is nothing nested to describe.
 *
 * Memory and storage cannot be one button, because each product in them has a
 * stepper beside it and a button inside a button is a control a screen reader
 * cannot announce. So their tile is a group: the disc and the heading on top,
 * then one row per product — the product itself a button that opens the
 * drawer on that row, its stepper a sibling — and a way to add a different one
 * at the foot.
 */
function BayTile({
  kind,
  build,
  broken,
  changed,
  pinnedSlug,
  onSwap,
  onQuantity,
  onHighlight,
}: {
  kind: PartKind;
  build: Build;
  broken: boolean;
  changed: boolean;
  pinnedSlug: string | null;
  onSwap: (kind: PartKind, replacing: string | null) => void;
  onQuantity: (kind: PartKind, slug: string, qty: number) => void;
  onHighlight: (kind: PartKind | null) => void;
}) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const bay = lines(build, kind);
  const first: Line | undefined = bay[0];
  const Icon = PART_ICON[kind];
  const tone = broken ? "broken" : changed ? "changed" : "idle";

  /* A fault tints the tile's edge as well as ringing its disc. Colour stays for
     the two states that want a decision, as everywhere else on the page. */
  const shell = `relative flex h-full w-full flex-col items-center rounded-2xl border bg-white px-4 pb-4 pt-5 text-center transition-colors duration-300 ${
    broken ? "border-alert/45" : changed ? "border-accent/50" : "border-line hover:border-ink/20"
  }`;

  const pointing = {
    onMouseEnter: () => bay.length > 0 && onHighlight(kind),
    onMouseLeave: () => onHighlight(null),
    onFocus: () => bay.length > 0 && onHighlight(kind),
    /* Focus moving between two controls inside one tile is not the customer
       leaving it, and letting go of the lift in between would flicker the
       drawing on every Tab. */
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHighlight(null);
    },
  };

  /* Keyed on the product, so a swap drops the new name in rather than
     overwriting the old one where it stands. */
  const arrive = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  };

  if (!isMulti(kind) || !first) {
    const locked = first?.slug === pinnedSlug;

    return (
      <button
        type="button"
        aria-disabled={locked}
        onClick={locked ? undefined : () => onSwap(kind, first?.slug ?? null)}
        {...pointing}
        className={`group/tile ${shell} ${locked ? "cursor-default" : "cursor-pointer"} ${focusRing}`}
      >
        <Medallion icon={Icon} src={first?.part.product.image} tone={tone} />
        <span className="mt-3 block text-[14px] font-semibold leading-tight text-ink">
          {t(`part.${kind}`)}
        </span>

        {first ? (
          <motion.span key={first.slug} {...arrive} className="flex w-full flex-1 flex-col items-center">
            {/* A Latin run that may sit in an Arabic tile. `dir="ltr"` stops
                the bidi algorithm throwing its leading digits to the far end;
                centred, so there is no start edge for it to drift to. */}
            <span
              dir="ltr"
              title={first.part.product.name}
              className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-mute"
            >
              {first.part.product.name}
            </span>
            <StockLine inStock={first.part.product.stock} locked={locked} />
            {/* On the tile's bottom edge. Tiles in a row share a height, and a
                price anchored there sits on the same line in all four. */}
            <span className="mt-auto pt-3 font-display text-[16px] font-bold tabular-nums text-ink">
              {formatDA(first.part.product.price, locale)}
            </span>
            {!locked && <SwapHint group="tile" />}
          </motion.span>
        ) : (
          <span className="mt-1 text-[12.5px] text-faint transition-colors group-hover/tile:text-accent">
            {t("pcb.build.choose")}…
          </span>
        )}
      </button>
    );
  }

  return (
    <div role="group" aria-label={t(`part.${kind}`)} {...pointing} className={shell}>
      <Medallion icon={Icon} src={first.part.product.image} tone={tone} />
      <h3 className="mt-3 text-[14px] font-semibold leading-tight text-ink">{t(`part.${kind}`)}</h3>
      <CapacityMeta kind={kind} build={build} className="mt-1" />

      <ul className="mt-2 w-full divide-y divide-line-soft">
        {bay.map((line) => {
          const locked = line.slug === pinnedSlug;
          const { part, qty, slug } = line;

          return (
            <li key={slug} className="py-2.5">
              <button
                type="button"
                aria-disabled={locked}
                onClick={locked ? undefined : () => onSwap(kind, slug)}
                className={`group/line block w-full rounded-lg px-1 py-1 transition-colors ${
                  locked ? "cursor-default" : "cursor-pointer hover:bg-cloud"
                } ${focusRing}`}
              >
                <motion.span key={slug} {...arrive} className="flex flex-col items-center">
                  <span
                    dir="ltr"
                    title={part.product.name}
                    className="line-clamp-2 text-[13px] font-medium leading-snug text-mute"
                  >
                    {part.product.name}
                  </span>
                  <StockLine inStock={part.product.stock} locked={locked} />
                  {!locked && <SwapHint group="line" />}
                </motion.span>
              </button>

              {/* A sibling of the product button, not inside it. Stepper and
                  price share a line when the tile is wide enough and the price
                  drops beneath when it is not. */}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
                <Stepper
                  name={part.product.name}
                  qty={qty}
                  max={maxQuantity(build, kind, slug)}
                  removable={!locked && bay.length > 1}
                  onChange={(n) => onQuantity(kind, slug, n)}
                />
                <span className="text-center">
                  <span className="block font-display text-[16px] font-bold tabular-nums text-ink">
                    {formatDA(part.product.price * qty, locale)}
                  </span>
                  {/* The unit price once there is more than one, or the row is
                      a total nobody can compare against the drawer. */}
                  {qty > 1 && (
                    <span className="block text-[11px] tabular-nums text-faint">
                      {qty} × {formatDA(part.product.price, locale)}
                    </span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* A different product beside the ones fitted — the boot drive and the
          bulk drive, which a stepper on one row cannot say. Same drawer, same
          engine, so a kit of the wrong generation is listed with its reason
          rather than offered. */}
      <button
        type="button"
        onClick={() => onSwap(kind, null)}
        className={`mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-line-soft pt-3 text-[12.5px] font-medium text-accent transition-colors hover:text-accent-deep ${focusRing}`}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
        {t(kind === "ram" ? "pcb.build.addRam" : "pcb.build.addSsd")}
      </button>
    </div>
  );
}

/**
 * The configuration, bay by bay — PCB-09.
 *
 * Tiles, four across: a disc, the bay's name, and either "Choisir…" or what is
 * in it. Eight rows stacked ran the parts well past the fold with every price
 * pushed to the far edge of a wide column; four across puts the whole machine
 * in two rows, and on the manual builder's opening screen the eight purple
 * discs say where to start without a sentence of instructions. The order is
 * unchanged — the decisions that drive the machine first — reading across and
 * then down.
 *
 * The column count follows the grid's own width, not the viewport's. This grid
 * sits beside a fixed-width rail above `lg` and has the page to itself below
 * it, so a viewport breakpoint would ask for four columns at exactly the widths
 * where the rail has just taken 23rem away. A container query asks the question
 * that matters — how much room do these tiles have — and steps down to three,
 * then two. Never one: a phone showing eight full-width tiles is eight screens
 * of scrolling to see one machine, and a tile is built to read at 160px.
 *
 * Arrives *after* the tower has finished assembling, and arrives the same way:
 * one tile at a time, in bay order, at a pace close to the one the parts seated
 * at. `revealed` counts the bays the parent has let through, so the hand-off
 * from the assembly scene is one number and a manual change can pass the full
 * count without replaying the arrival of the other seven.
 */
export function BuildSheet({
  build,
  revealed,
  faulty,
  pinnedSlug,
  onSwap,
  onQuantity,
  onHighlight,
  changed,
}: {
  build: Build;
  revealed: number;
  faulty: Set<PartKind>;
  /** the part pinned from a product page — fixed in its bay */
  pinnedSlug: string | null;
  /** opens the drawer for a bay: on a product to replace it, or with `null`
      to fill an empty bay or add a product beside the ones already there */
  onSwap: (kind: PartKind, replacing: string | null) => void;
  /** sets a product's quantity in a multi bay; zero removes it */
  onQuantity: (kind: PartKind, slug: string, qty: number) => void;
  /** the bay the customer is pointing at, so the drawing can lift it out */
  onHighlight: (kind: PartKind | null) => void;
  /** the bay that just changed, held briefly so the tile can say which one */
  changed: PartKind | null;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();

  return (
    <section aria-labelledby="pcb-parts-title">
      <header className="mb-4 text-center">
        <h2 id="pcb-parts-title" className="font-display text-[22px] font-bold leading-tight text-ink">
          {t("pcb.build.gridTitle")}
        </h2>
        <p className="mx-auto mt-1 max-w-[56ch] text-[13px] leading-relaxed text-mute">
          {t("pcb.build.gridLead")}
        </p>
      </header>

      <div className="@container">
        <ol className="grid grid-cols-2 gap-2.5 @min-[40rem]:grid-cols-3 @min-[40rem]:gap-3 @min-[50rem]:grid-cols-4">
          {PART_KINDS.map((kind, i) => (
            <li key={kind} className="min-w-0">
              <motion.div
                initial={false}
                animate={i < revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 12 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <BayTile
                  kind={kind}
                  build={build}
                  broken={faulty.has(kind)}
                  changed={changed === kind}
                  pinnedSlug={pinnedSlug}
                  onSwap={onSwap}
                  onQuantity={onQuantity}
                  onHighlight={onHighlight}
                />
              </motion.div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
