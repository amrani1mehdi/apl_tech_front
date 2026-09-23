import type { CSSProperties } from "react";
import { BRAND_MARKS, monogram } from "@/lib/brands";
import { APL_PATHS, APL_SYMBOL_VIEWBOX } from "@/lib/logo";

/** The house brand is in no icon set — it has ours. */
const HOUSE = "APL TECH";

/**
 * A brand's own mark, sized to one fixed slot so the labels beside them stay
 * on a line however differently the logos are shaped.
 *
 * Every mark is still painted through a mask rather than dropped in as
 * artwork — the SVGs carry no colour of their own, so the mask is what lets
 * each one be given its brand's. A mark with no colour on file falls back to
 * the row's ink and goes on dimming and lighting with its label.
 *
 * Three cases, in order — the house mark, a real mark, and initials for a
 * brand no icon set covers. The monogram is the point of the component: it
 * means adding a product from an unknown brand can never leave a hole.
 */
export function BrandMark({ brand }: { brand: string }) {
  if (brand === HOUSE) {
    return (
      /* the house mark's own colour is the accent the rest of the site is
         built on, so it is the one brand here that is not a lookup */
      <span className="brand-slot" style={{ color: "var(--color-accent)" }}>
        <svg viewBox={APL_SYMBOL_VIEWBOX} className="brand-slot-svg" fill="currentColor" aria-hidden>
          {APL_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </span>
    );
  }

  const mark = BRAND_MARKS[brand];
  if (mark) {
    return (
      <span className="brand-slot">
        <span
          className="brand-slot-mark"
          style={
            {
              "--mark": `url(/brands/${mark.slug}.svg)`,
              ...(mark.color ? { "--mark-color": mark.color } : null),
            } as CSSProperties
          }
          aria-hidden
        />
      </span>
    );
  }

  return (
    <span className="brand-slot">
      <span className="brand-monogram" aria-hidden>
        {monogram(brand)}
      </span>
    </span>
  );
}
