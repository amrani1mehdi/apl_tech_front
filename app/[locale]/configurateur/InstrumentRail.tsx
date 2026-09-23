"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { fill, type PowerVerdict } from "@/lib/pcbuilder/engine";
import { tierOf } from "@/lib/pcbuilder/fps";

/** Same ramp the table below the band uses — green through amber to red. One
    screen should not have two vocabularies for "this is fine". */
const FPS_TONE: Record<string, string> = {
  elite: "text-emerald-700",
  great: "text-emerald-700",
  smooth: "text-emerald-600",
  playable: "text-amber-600",
  poor: "text-red-600",
};

/**
 * A number that counts to its new value instead of jumping.
 *
 * The band's whole job is to make a change legible — you swap a graphics card
 * and you *watch* the total move, the draw move, the recommendation snap to
 * the next calibre. A figure that simply replaces itself shows the result and
 * hides the change, which is the one thing worth showing here.
 *
 * Tweened rather than rolled per digit: these are magnitudes, and the eye
 * should read "it went up by about twenty thousand", not spell out digits.
 */
function Ticker({ value, format }: { value: number; format: (n: number) => string }) {
  const reduced = useReducedMotion();
  /* Split rather than branched inside one component: with reduced motion there
     is no animation to run, so there is no state to hold and no effect to
     schedule — the value is simply printed. */
  return reduced ? <>{format(value)}</> : <Tweened value={value} format={format} />;
}

function Tweened({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);

  /* Where the next tween starts from. Held in a ref and advanced by the
     animation itself, so interrupting one mid-flight — a second swap before
     the first has settled — continues from the number on screen instead of
     snapping back to the last committed value and running again. */
  const from = useRef(value);

  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value]);

  return <>{format(Math.round(shown))}</>;
}

/**
 * A value measured against a target, on one track.
 *
 * Both readings here have the same shape — spend against a budget, draw
 * against a recommended supply — so they get the same instrument rather than
 * two inventions. The target is a tick on the track, not the end of it, which
 * is what lets the bar show *overshoot*: going past your budget and going past
 * your supply both push the fill beyond the tick, in the colour that says so,
 * instead of silently pinning at 100%.
 */
function Meter({ value, target, over }: { value: number; target: number; over: boolean }) {
  const scale = Math.max(value, target) * 1.06;
  const pct = (n: number) => `${Math.min((n / scale) * 100, 100)}%`;

  return (
    <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${
          over ? "bg-red-500" : "bg-accent"
        }`}
        style={{ width: pct(value) }}
      />
      <span
        aria-hidden
        className="absolute top-0 h-full w-px bg-ink/45"
        style={{ insetInlineStart: pct(target) }}
      />
    </div>
  );
}

const LABEL = "font-mono text-[10px] font-medium uppercase tracking-wider text-faint";
/* No colour here on purpose. The frame-rate figure is tinted by how good it
   is, and a `text-ink` baked into this constant would be a second colour
   utility in the same class string — which resolves by CSS source order, not
   by the order they are written, so the winner is a coin flip. Each figure
   states its own colour. */
const FIGURE = "mt-2 font-display text-[clamp(1.6rem,3.2vw,2.3rem)] font-bold leading-none";

/**
 * The three numbers the whole module exists to produce.
 *
 * At the top and at full width, because they are the answer. They spent four
 * questions and a build sequence getting here; finding the total underneath a
 * parts table, in the same size as a line item, is the screen failing to say
 * what it worked out.
 */
export function InstrumentRail({
  total,
  extras,
  budget,
  power,
  fps,
  fpsGame,
}: {
  /** the whole order — the machine plus whatever setup was chosen around it */
  total: number;
  /** how much of that total is peripherals; 0 when the tower was taken alone */
  extras: number;
  budget: number | null;
  power: PowerVerdict;
  fps: number | null;
  fpsGame: string | null;
}) {
  const { t, locale } = useLocale();

  const over = budget !== null && total > budget;
  const gap = budget === null ? 0 : Math.abs(budget - total);

  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {/* ── spend ── */}
      <section className="bg-white p-5 sm:p-6">
        <span className={LABEL}>{t("pcb.m.total")}</span>
        {/* No `dir` here, unlike the two figures beside it. `formatDA`
            isolates the digits and deliberately leaves the currency outside
            that isolate so it flows with the paragraph — which is what puts
            دج after the number in Arabic and DA after it in French, from one
            string. Forcing this paragraph to LTR overrode that and threw دج
            to the wrong end of every price on the page. */}
        <p className={`${FIGURE} text-ink`}>
          <Ticker value={total} format={(n) => formatDA(n, locale)} />
        </p>
        {budget !== null && (
          <>
            <Meter value={total} target={budget} over={over} />
            <p className={`mt-2.5 text-[12px] font-medium ${over ? "text-red-600" : "text-mute"}`}>
              {fill(t(over ? "pcb.m.over" : "pcb.m.under"), { gap: formatDA(gap, locale) })}
            </p>
          </>
        )}

        {/* The figure above is the whole order once peripherals are in it, and
            the parts table sums to less than that. Rather than run two totals
            on one page — which is how a customer ends up mistrusting both —
            the headline covers everything and this line says what it is made
            of. Absent when the tower was taken alone, because then there is
            nothing to split. */}
        {extras > 0 && (
          <p className="mt-1.5 text-[11.5px] tabular-nums text-faint">
            {fill(t("pcb.m.split"), {
              machine: formatDA(total - extras, locale),
              extras: formatDA(extras, locale),
            })}
          </p>
        )}
      </section>

      {/* ── power — PCB-07 and PCB-08 in one instrument ── */}
      <section className="bg-white p-5 sm:p-6">
        <span className={LABEL}>{t("pcb.m.draw")}</span>
        {/* A wattage is a pure Latin run with no currency in it, so it does
            take the direction wholesale — and needs the alignment back. */}
        <p dir="ltr" className={`${FIGURE} text-ink rtl:text-end`}>
          <Ticker value={power.draw} format={(n) => `${n} W`} />
        </p>
        <Meter
          value={power.draw}
          target={power.recommended}
          over={power.fitted !== null && power.fitted < power.target}
        />
        {/* The one line on the band that is genuinely bilingual: an Arabic
            label, then a wattage, then an 80+ rating. It carried `dir="ltr"`
            like its neighbours and that was wrong for mixed content — forcing
            the paragraph to LTR made the Arabic phrase an embedded run and
            pushed "650 W" into the middle of it, so the line read
            "W مزوّد الطاقة المنصوح · 650".

            The paragraph keeps the page's direction and each Latin run is
            isolated on its own instead. `<bdi>` is exactly this: order the
            contents independently, place the result where the sentence
            expects it. The figures either side of it are pure Latin runs with
            no label inside them, which is why they can still take `dir`
            wholesale. */}
        <p className="mt-2.5 truncate text-[12px] text-mute">
          {t("pcb.m.psu")} · <bdi>{power.recommended} W</bdi>
          {power.cert ? (
            <>
              {" · "}
              <bdi>{power.cert}</bdi>
            </>
          ) : null}
        </p>
      </section>

      {/* ── frames ──
          A readout, not a way in. The full table sits on the page directly
          below this band now, so a button here would send someone somewhere
          they can already see. This is the headline — the heaviest game they
          named, at 1080p — and the breakdown follows underneath. */}
      <section className="bg-white p-5 sm:col-span-2 sm:p-6 lg:col-span-1">
        <span className={LABEL}>{t("pcb.m.fps")}</span>
        {fps === null ? (
          <p className="mt-2 text-[13px] text-faint">{t("pcb.fps.needBoth")}</p>
        ) : (
          <>
            <p dir="ltr" className={`${FIGURE} ${FPS_TONE[tierOf(fps)]} rtl:text-end`}>
              <Ticker value={fps} format={(n) => String(n)} />
              <span className="ms-1.5 font-sans text-[13px] font-medium text-faint">fps</span>
            </p>
            <p className="mt-2.5 truncate text-[12px] text-mute">{fpsGame} · 1080p</p>
          </>
        )}
      </section>
    </div>
  );
}
