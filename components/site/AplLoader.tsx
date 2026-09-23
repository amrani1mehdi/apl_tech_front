import type { CSSProperties } from "react";
import { APL_PATHS, APL_STOPS, APL_SYMBOL_RATIO, APL_SYMBOL_VIEWBOX } from "@/lib/logo";

/**
 * The mark drawing itself, on a loop — what the store shows over the
 * placeholders while the catalogue is still on its way.
 *
 * Three layers of the same four shapes, which is what makes it read as one
 * mark being made rather than four shapes appearing:
 *
 *   · a ghost silhouette that never leaves, so there is always something
 *     there to be drawn onto and the logo never blinks out between passes,
 *   · an outline that traces itself, staggered across the four shapes,
 *   · the brand gradient flooding in behind the line once it has closed.
 *
 * The trace works on every path without measuring any of them: pathLength
 * normalises each one to 1, so a single dasharray fits all four however
 * different their real lengths are.
 *
 * The gradient is attached as a presentation attribute rather than from the
 * stylesheet: a url(#id) paint written in CSS resolves against the
 * stylesheet's own URL, which under Next is /_next/static/css/…, so the
 * reference misses the gradient sitting in this very file and the mark
 * paints black. Only the animation belongs in CSS.
 *
 * A server component — it renders inside the Suspense fallback, and there is
 * nothing here to hydrate. The gradient id is fixed rather than generated
 * because exactly one of these is ever on screen at a time.
 */
export function AplLoader({ height = 74 }: { height?: number }) {
  return (
    <svg
      viewBox={APL_SYMBOL_VIEWBOX}
      height={height}
      width={height * APL_SYMBOL_RATIO}
      className="apl-loader"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id="apl-loader-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={APL_STOPS[0]} />
          <stop offset="50%" stopColor={APL_STOPS[1]} />
          <stop offset="100%" stopColor={APL_STOPS[2]} />
        </linearGradient>
      </defs>

      <g className="apl-loader-ghost">
        {APL_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {APL_PATHS.map((d, i) => (
        <path
          key={`fill-${d}`}
          d={d}
          fill="url(#apl-loader-grad)"
          className="apl-loader-fill"
          style={{ "--i": i } as CSSProperties}
        />
      ))}

      {APL_PATHS.map((d, i) => (
        <path
          key={`line-${d}`}
          d={d}
          pathLength={1}
          fill="none"
          stroke="url(#apl-loader-grad)"
          className="apl-loader-line"
          style={{ "--i": i } as CSSProperties}
        />
      ))}
    </svg>
  );
}
