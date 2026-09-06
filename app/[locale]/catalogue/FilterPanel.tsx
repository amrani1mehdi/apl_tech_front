"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Tag } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName } from "@/lib/i18n";
import { CATEGORIES, BRANDS } from "@/lib/products";
import {
  PRICE_STEP,
  availabilityCounts,
  brandCounts,
  categoryCounts,
  effectivePrice,
  priceBounds,
  promoCount,
  specFacets,
  type Availability,
  type FilterPatch,
  type FilterState,
} from "@/lib/catalogue";
import { PriceSlider } from "./PriceSlider";

const EASE = [0.22, 1, 0.36, 1] as const;
const AVAILABILITY: Availability[] = ["all", "in", "pre", "out"];
const AVAIL_LABEL: Record<Availability, string> = {
  all: "cata.avail.all",
  in: "cata.avail.in",
  pre: "cata.avail.pre",
  out: "cata.avail.out",
};

/** How many options a group shows before it offers the rest. */
const VISIBLE = 6;

/* ── Section ──────────────────────────────────────────────────────────────
   Every group is a disclosure. Open by default, because a filter panel that
   arrives entirely shut hides the one thing it is for; collapsible, because
   six of them stacked is a long column on a laptop.

   The body is measured rather than transitioned to a fixed height, so a group
   whose options change — the technical ones do, on every category — still
   opens to exactly its own size. */
function Section({
  label,
  count,
  children,
  defaultOpen = true,
}: {
  label: string;
  count?: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line-soft pb-4 last:border-b-0 last:pb-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 py-3 text-start"
      >
        <span className="h-2.5 w-px bg-accent" />
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wide text-faint transition-colors group-hover:text-mute">
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="bg-accent-gradient grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[9px] font-bold text-white">
            {count}
          </span>
        )}
        <ChevronDown
          className={`ms-auto h-4 w-4 text-faint transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-1 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Square tick — the selected state for anything multiple-choice. */
function Tick({ on }: { on: boolean }) {
  return (
    <span
      className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-200 ${
        on
          ? "bg-accent-gradient border-accent text-white"
          : "border-line bg-white group-hover/opt:border-faint"
      }`}
    >
      <motion.span
        initial={false}
        animate={{ scale: on ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 620, damping: 26 }}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </motion.span>
    </span>
  );
}

/** One tickable row: label on the left, how many it would leave on the right. */
function Option({
  label,
  on,
  count,
  onClick,
}: {
  label: string;
  on: boolean;
  count?: number;
  onClick: () => void;
}) {
  const empty = count === 0;
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`group/opt flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-start text-sm sm:py-1.5 transition-colors ${
        on ? "text-ink" : empty ? "text-faint" : "text-mute hover:bg-white hover:text-ink"
      }`}
    >
      <Tick on={on} />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={`font-mono text-[11px] tabular-nums ${empty ? "text-line" : "text-faint"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/** A list that only shows its first few options until asked for the rest. */
function OptionList({ children, total }: { children: ReactNode[]; total: number }) {
  const { t } = useLocale();
  const [all, setAll] = useState(false);
  if (total <= VISIBLE) return <div className="space-y-0.5">{children}</div>;
  return (
    <div className="space-y-0.5">
      {all ? children : children.slice(0, VISIBLE)}
      <button
        onClick={() => setAll((v) => !v)}
        className="px-2 pt-1.5 text-xs font-semibold text-accent transition-opacity hover:opacity-70"
      >
        {all ? t("cata.showLess") : `${t("cata.showMore")} (${total - VISIBLE})`}
      </button>
    </div>
  );
}

/**
 * The whole filter column. One instance renders in the desktop sidebar and
 * another inside the mobile drawer, both driven by the same state in the page
 * above — so a category picked on a phone is still picked when the window is
 * widened. `idPrefix` keeps their keys apart.
 */
export function FilterPanel({
  state,
  patch,
  idPrefix,
}: {
  state: FilterState;
  patch: (next: FilterPatch) => void;
  idPrefix: string;
}) {
  const { t, locale } = useLocale();

  const bounds = priceBounds(state);
  const price = effectivePrice(state, bounds);
  const cats = categoryCounts(state);
  const brandsN = brandCounts(state);
  const availN = availabilityCounts(state);
  const promoN = promoCount(state);
  const facets = specFacets(state);

  const toggleBrand = (b: string) =>
    patch({
      brands: state.brands.includes(b)
        ? state.brands.filter((x) => x !== b)
        : [...state.brands, b],
    });

  const toggleSpec = (key: string, value: string) => {
    const current = state.specs[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const specs = { ...state.specs };
    if (next.length) specs[key] = next;
    else delete specs[key];
    patch({ specs });
  };

  const categories = [
    { key: "all", name: t("c.allCatalogue") },
    ...CATEGORIES.map((c) => ({ key: c.key, name: catName(c.key, locale) })),
  ];

  return (
    <div>
      <Section label={t("cata.category")} count={state.cat !== "all" ? 1 : 0}>
        <div className="space-y-0.5">
          {categories.map((c) => {
            const on = state.cat === c.key;
            return (
              <button
                key={`${idPrefix}-${c.key}`}
                onClick={() => patch({ cat: c.key, specs: {} })}
                aria-pressed={on}
                className={`relative flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm sm:py-2 transition-colors ${
                  on ? "text-white" : "text-mute hover:bg-white hover:text-ink"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId={`${idPrefix}-cat-pill`}
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                    className="bg-accent-gradient-x absolute inset-0 rounded-lg"
                  />
                )}
                <span className="relative flex-1">{c.name}</span>
                <span
                  className={`relative font-mono text-[11px] tabular-nums ${
                    on ? "text-white/70" : "text-faint"
                  }`}
                >
                  {cats[c.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section label={t("cata.price")}>
        <div className="px-1 pt-1">
          <PriceSlider
            bounds={bounds}
            value={price}
            step={PRICE_STEP}
            minLabel={t("cata.priceMin")}
            maxLabel={t("cata.priceMax")}
            onChange={(next) => patch({ price: next })}
          />
        </div>
      </Section>

      <Section label={t("cata.brand")} count={state.brands.length}>
        <OptionList total={BRANDS.length}>
          {BRANDS.map((b) => (
            <Option
              key={`${idPrefix}-${b}`}
              label={b}
              on={state.brands.includes(b)}
              count={brandsN[b] ?? 0}
              onClick={() => toggleBrand(b)}
            />
          ))}
        </OptionList>
      </Section>

      <Section label={t("cata.availability")} count={state.availability !== "all" ? 1 : 0}>
        <div className="space-y-0.5">
          {AVAILABILITY.map((a) => {
            const on = state.availability === a;
            return (
              <button
                key={`${idPrefix}-${a}`}
                onClick={() => patch({ availability: a })}
                aria-pressed={on}
                className={`group/opt flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-start text-sm sm:py-1.5 transition-colors ${
                  on ? "text-ink" : "text-mute hover:bg-white hover:text-ink"
                }`}
              >
                <span
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-200 ${
                    on ? "border-accent" : "border-line bg-white group-hover/opt:border-faint"
                  }`}
                >
                  <motion.span
                    initial={false}
                    animate={{ scale: on ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 620, damping: 26 }}
                    className="bg-accent-gradient h-2.5 w-2.5 rounded-full"
                  />
                </span>
                <span className="flex-1">{t(AVAIL_LABEL[a])}</span>
                <span className="font-mono text-[11px] tabular-nums text-faint">{availN[a]}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section label={t("cata.offers")} count={state.promoOnly ? 1 : 0}>
        <button
          onClick={() => patch({ promoOnly: !state.promoOnly })}
          aria-pressed={state.promoOnly}
          className={`group/opt flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-start text-sm sm:py-1.5 transition-colors ${
            state.promoOnly ? "text-ink" : "text-mute hover:bg-white hover:text-ink"
          }`}
        >
          <Tick on={state.promoOnly} />
          <Tag className={`h-3.5 w-3.5 ${state.promoOnly ? "text-accent" : "text-faint"}`} />
          <span className="flex-1">{t("cata.promoOnly")}</span>
          <span className="font-mono text-[11px] tabular-nums text-faint">{promoN}</span>
        </button>
      </Section>

      {/* Technical groups are whatever the chosen category's products describe
          themselves with, so this section only exists once a category narrows
          the field to specs that can be compared. */}
      <Section
        label={t("cata.technical")}
        count={Object.values(state.specs).reduce((n, v) => n + v.length, 0)}
        defaultOpen={false}
      >
        {state.cat === "all" ? (
          <p className="px-2 py-1 text-xs leading-relaxed text-faint">{t("cata.techPickCat")}</p>
        ) : facets.length === 0 ? (
          <p className="px-2 py-1 text-xs leading-relaxed text-faint">{t("cata.techNone")}</p>
        ) : (
          <div className="space-y-5 pt-1">
            {facets.map((f) => (
              <div key={`${idPrefix}-${f.key}`}>
                <p className="px-2 pb-1.5 text-xs font-semibold text-ink">{f.key}</p>
                <OptionList total={f.values.length}>
                  {f.values.map((v) => (
                    <Option
                      key={`${idPrefix}-${f.key}-${v.value}`}
                      label={v.value}
                      on={(state.specs[f.key] ?? []).includes(v.value)}
                      count={v.count}
                      onClick={() => toggleSpec(f.key, v.value)}
                    />
                  ))}
                </OptionList>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
