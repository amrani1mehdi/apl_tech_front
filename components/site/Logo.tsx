"use client";

import { useId, type CSSProperties } from "react";
import {
  APL_PATHS,
  APL_STOPS,
  APL_SYMBOL_RATIO,
  APL_SYMBOL_VIEWBOX,
  APL_FULL_RATIO,
  APL_VIEWBOX,
} from "@/lib/logo";

/** The three brand stops. Needs a unique id per instance — several logos share a page. */
export function AplGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stopColor={APL_STOPS[0]} />
      <stop offset="50%" stopColor={APL_STOPS[1]} />
      <stop offset="100%" stopColor={APL_STOPS[2]} />
    </linearGradient>
  );
}

export function AplMark({
  className,
  height = 30,
  style,
  symbolOnly = true,
}: {
  className?: string;
  height?: number;
  style?: CSSProperties;
  symbolOnly?: boolean;
}) {
  const gid = `apl-grad-${useId()}`;
  const ratio = symbolOnly ? APL_SYMBOL_RATIO : APL_FULL_RATIO;

  return (
    <svg
      viewBox={symbolOnly ? APL_SYMBOL_VIEWBOX : APL_VIEWBOX}
      height={height}
      width={height * ratio}
      className={className}
      style={style}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <AplGradient id={gid} />
      </defs>
      <g fill={`url(#${gid})`}>
        {APL_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {!symbolOnly && (
        <text
          x="113"
          y="274"
          fill={`url(#${gid})`}
          fontFamily="Montserrat, var(--font-sans), ui-sans-serif, sans-serif"
          fontSize="43"
          fontWeight="600"
          letterSpacing="18"
        >
          TECH
        </text>
      )}
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`group inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <AplMark
        height={26}
        className="shrink-0 transition-transform duration-500 group-hover:-translate-y-0.5"
      />
      <span className="flex items-baseline gap-1 font-display text-[1rem] font-bold uppercase leading-none tracking-[0.12em] sm:gap-1.5 sm:text-[1.15rem] sm:tracking-[0.18em]">
        <span className={light ? "text-white" : "text-ink"}>Tech</span>
        <span className={`text-[0.7rem] font-medium ${light ? "text-white/60" : "text-faint"}`}>
          .dz
        </span>
      </span>
    </span>
  );
}
