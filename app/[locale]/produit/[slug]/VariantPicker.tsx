"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { VariantGroup, VariantOption } from "@/lib/products";

/**
 * PRD-02 — the finish the customer is ordering.
 *
 * One row per group. A colour is shown as the colour: a swatch is worth more
 * than the word "Gunmetal" to someone who has never seen the product, and the
 * name is printed beside the group's own label so the choice is still readable
 * to anyone who cannot tell the two dark greys apart.
 *
 * Chips are `role="radio"` inside a `role="radiogroup"` rather than a real
 * `<input type="radio">` set: the visible thing is a coloured disc with no
 * text of its own, and a native radio would have to be hidden and then
 * re-described anyway. The roles are what a screen reader needs; `aria-label`
 * carries the name the sighted reader gets from the swatch.
 */

/** A finish sold out on its own — the product is still in stock in the others. */
function soldStyle(sold: boolean | undefined) {
  return sold ? "cursor-not-allowed opacity-45" : "hover:border-ink/35";
}

function Swatch({ swatch }: { swatch: NonNullable<VariantOption["swatch"]> }) {
  /* Two colours split down the diagonal. A dual-tone finish drawn as one
     averaged colour would be a colour the product is not sold in. */
  const style = Array.isArray(swatch)
    ? { backgroundImage: `linear-gradient(135deg, ${swatch[0]} 0 50%, ${swatch[1]} 50% 100%)` }
    : { backgroundColor: swatch };

  return (
    <span
      aria-hidden
      className="h-7 w-7 rounded-full ring-1 ring-inset ring-ink/12"
      style={style}
    />
  );
}

export function VariantPicker({
  groups,
  chosen,
  onChoose,
}: {
  groups: VariantGroup[];
  /** group name → chosen option id */
  chosen: Record<string, string>;
  onChoose: (group: string, id: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="mt-7 space-y-5">
      {groups.map((g) => {
        const picked = g.options.find((o) => o.id === chosen[g.name]);

        return (
          <div key={g.name}>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-faint">
                {g.name}
              </span>
              {picked && <span className="text-sm font-medium text-ink">{picked.label}</span>}
            </div>

            <div role="radiogroup" aria-label={g.name} className="mt-2.5 flex flex-wrap gap-2.5">
              {g.options.map((o) => {
                const on = o.id === chosen[g.name];

                /* No swatch: the option is a word, so it is shown as one. A
                   grey disc standing in for "Switch rouge" would say nothing
                   the label does not say better. */
                if (!o.swatch) {
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={o.sold}
                      onClick={() => onChoose(g.name, o.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        on
                          ? "border-transparent text-ink ring-2 ring-ink ring-offset-2 ring-offset-paper"
                          : "border-line text-mute"
                      } ${soldStyle(o.sold)}`}
                    >
                      <span className={o.sold ? "line-through" : undefined}>{o.label}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={o.sold ? `${o.label} — ${t("pd.outOfStock")}` : o.label}
                    title={o.label}
                    disabled={o.sold}
                    onClick={() => onChoose(g.name, o.id)}
                    /* The chosen one is ringed, not merely outlined: the same
                       ring the gallery puts on the thumbnail you are looking
                       at, because it is the same statement. A one-pixel border
                       swap is invisible next to a swatch that is itself a
                       circle of colour. */
                    className={`relative grid h-11 w-11 place-items-center rounded-full border transition-colors ${
                      on
                        ? "border-transparent ring-2 ring-ink ring-offset-2 ring-offset-paper"
                        : "border-line"
                    } ${soldStyle(o.sold)}`}
                  >
                    <Swatch swatch={o.swatch} />
                    {/* struck through rather than merely dimmed: a dim swatch
                        reads as a pale colour, not as one you cannot have */}
                    {o.sold && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 grid place-items-center"
                      >
                        <span className="h-px w-9 rotate-45 bg-ink/70" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
