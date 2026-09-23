"use client";

import { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";

/** grouped digits, no currency — the unit is a suffix inside the field */
const grouped = (n: number) => n.toLocaleString("fr-FR");

/**
 * Two-handle price range, with both ends typeable.
 *
 * The track is two native range inputs stacked on one rail rather than
 * pointer maths: the handles stay keyboard-operable and stay announced as
 * sliders, which a pair of divs would not be. Only the thumbs take pointer
 * events, so the input lying on top does not swallow clicks meant for the one
 * underneath.
 *
 * The whole control mirrors in Arabic. A range input already does that on
 * its own — the minimum end of the track is the start edge, which is the
 * right one under dir="rtl" — and the fields follow their flex row, so the
 * min field lands under the min handle without being told to. The one part
 * that does not mirror itself is the fill between the handles, which is
 * positioned from measured percentages; those are named from the ends rather
 * than from left and right below.
 */
export function PriceSlider({
  bounds,
  value,
  step,
  onChange,
  minLabel,
  maxLabel,
  unit = "DA",
}: {
  bounds: { min: number; max: number };
  value: { min: number; max: number };
  step: number;
  onChange: (next: { min: number; max: number }) => void;
  minLabel: string;
  maxLabel: string;
  /** what the numbers are counted in — dinars in the catalogue, points on
      the coupon shelf */
  unit?: string;
}) {
  const { t, dir } = useLocale();

  /* A field being typed into holds its own raw text: grouping digits back
     under the caret on every keystroke fights whoever is typing, and half an
     amount ("15") is not a filter anyone asked for yet. The number is read
     back out — clamped — when the field is left or Enter is pressed. */
  const [editing, setEditing] = useState<"min" | "max" | null>(null);
  const [draft, setDraft] = useState("");

  const span = Math.max(1, bounds.max - bounds.min);
  const pct = (v: number) => ((v - bounds.min) / span) * 100;

  /* Written as left/right rather than as the logical pair because the fill
     is transitioned, and these two are the properties the stylesheet eases.
     Low prices sit at the start of the track, whichever side that is. */
  const fill =
    dir === "rtl"
      ? { right: `${pct(value.min)}%`, left: `${100 - pct(value.max)}%` }
      : { left: `${pct(value.min)}%`, right: `${100 - pct(value.max)}%` };
  const disabled = bounds.max <= bounds.min;

  const setMin = (v: number) => onChange({ min: Math.min(v, value.max), max: value.max });
  const setMax = (v: number) => onChange({ min: value.min, max: Math.max(v, value.min) });

  const begin = (which: "min" | "max") => {
    setEditing(which);
    setDraft(String(value[which]));
  };

  const commit = () => {
    if (!editing) return;
    const digits = draft.replace(/\D/g, "");
    // an emptied field means "no limit at this end", not zero
    const raw = digits === "" ? bounds[editing] : Number(digits);
    const held = Math.min(bounds.max, Math.max(bounds.min, raw));
    if (editing === "min") setMin(held);
    else setMax(held);
    setEditing(null);
  };

  const field = (which: "min" | "max", label: string, aria: string) => (
    <label className="flex-1">
      <span className="mb-1 block font-sans text-[9px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </span>
      <span className="price-field flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1.5">
        <input
          type="text"
          inputMode="numeric"
          aria-label={aria}
          disabled={disabled}
          value={editing === which ? draft : grouped(value[which])}
          onFocus={() => begin(which)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setEditing(null);
            }
          }}
          className="w-full min-w-0 bg-transparent font-mono text-[11px] tabular-nums text-ink outline-none"
        />
        <span className="shrink-0 font-mono text-[10px] text-faint">{unit}</span>
      </span>
    </label>
  );

  return (
    <div>
      <div className="price-slider relative h-9">
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <span
          className="price-fill bg-accent-gradient-x absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={fill}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={value.min}
          disabled={disabled}
          aria-label={minLabel}
          onChange={(e) => setMin(Number(e.target.value))}
          /* once both handles sit at the top of the track the lower one is
             the only one still able to move, so it has to be the one on top */
          className={value.min > bounds.max - span * 0.08 ? "z-20" : "z-10"}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={value.max}
          disabled={disabled}
          aria-label={maxLabel}
          onChange={(e) => setMax(Number(e.target.value))}
          className="z-10"
        />
      </div>

      <div className="mt-1 flex items-end gap-2">
        {field("min", t("cata.min"), minLabel)}
        <span className="mb-2.5 h-px w-2 shrink-0 bg-line" />
        {field("max", t("cata.max"), maxLabel)}
      </div>
    </div>
  );
}
