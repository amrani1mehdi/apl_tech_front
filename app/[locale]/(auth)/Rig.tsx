"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useAnimate, useAnimationFrame, useReducedMotion } from "motion/react";
import { APL_PATHS } from "@/lib/logo";
import type { RigState } from "./machine";

/**
 * A gaming tower seen through its glass side panel — the thing this shop
 * sells — powering up as the customer signs in.
 *
 * It answers the form, part by part. What identifies the customer (phone,
 * e-mail, name) fills the memory: a stick lights for every few characters and
 * all four once the entry is valid. The password drives the front fans: each
 * step of strength lights one more and spins them faster. The strip along the
 * shroud is the total. Pressing the button sends every fan to full speed with a
 * light running the strip; getting in lights the whole machine and puts the
 * customer's initial on the glass; being refused flickers it out.
 *
 * Fans and the strip are driven frame by frame rather than with keyframed
 * loops, because they have to change speed smoothly — a fan that jumps from
 * slow to fast looks broken, one that winds up looks like a fan.
 */

const STRIP = 14;

/* front intake, stacked along the front; then the processor cooler, the
   graphics card's pair, and the rear exhaust */
const FRONT = [96, 172, 248];

function spinOf(fan: string, s: RigState): number {
  if (s.mode === "idle" || s.mode === "error") return 0;
  if (s.mode === "working") return 1.5;
  if (s.mode === "success") return 0.9;
  if (fan === "cpu" || fan === "gpu") return 0.2;
  if (fan === "rear") return s.fans >= 3 ? 0.75 : 0;
  return Number(fan) < s.fans ? [0.3, 0.55, 0.85][s.fans - 1] : 0;
}

export function Rig({ state }: { state: RigState }) {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<SVGSVGElement>();
  const uid = useId();
  const ids = { glow: `${uid}-glow`, bloom: `${uid}-bloom`, glass: `${uid}-glass`, window: `${uid}-window` };

  const { mode, ram, fans } = state;
  const full = mode === "working" || mode === "success";
  const on = mode !== "idle";

  /* the frame loop reads the latest state without re-subscribing */
  const latest = useRef(state);
  const spin = useRef<{ angle: number; speed: number }[]>([]);
  const strip = useRef<number[]>(Array(STRIP).fill(0.12));
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useAnimationFrame((time, delta) => {
    const svg = scope.current;
    if (!svg) return;
    const s = latest.current;
    const dt = Math.min(delta, 64);

    if (!reduced) {
      svg.querySelectorAll<SVGGElement>("[data-blades]").forEach((el, i) => {
        const fan = (spin.current[i] ??= { angle: i * 37, speed: 0 });
        const target = spinOf(el.dataset.fan ?? "", s);
        /* winds up quickly, runs down slowly — as a fan does */
        fan.speed += (target - fan.speed) * (1 - Math.exp(-dt / (target > fan.speed ? 260 : 700)));
        fan.angle = (fan.angle + fan.speed * dt) % 360;
        el.setAttribute("transform", `rotate(${fan.angle.toFixed(2)})`);
      });
    }

    const level = Math.round(((s.ram + s.fans) / 7) * STRIP);
    svg.querySelectorAll<SVGRectElement>("[data-seg]").forEach((el, i) => {
      let target: number;
      if (s.mode === "error") target = 0.1;
      else if (s.mode === "working")
        target = reduced ? 0.7 : Math.max(0.12, 1 - Math.abs(i - (((time / 650) % 1) * (STRIP + 6) - 3)) / 2.6);
      else if (s.mode === "success") target = reduced ? 1 : 0.6 + 0.4 * Math.sin(time / 240 - i * 0.55);
      else target = i < level ? 0.95 : 0.12;
      const current = strip.current[i];
      const next = reduced ? target : current + (target - current) * (1 - Math.exp(-dt / 90));
      strip.current[i] = next;
      el.setAttribute("opacity", next.toFixed(3));
    });
  });

  /* The counters outlive this drawing — they belong to the store, which lasts
     the whole visit — so what counts is a change since it was put on screen,
     not a count above zero. Coming back to the sign-in page after a refusal
     must not replay the refusal. */
  const seen = useRef({ pulse: state.pulse, failures: state.failures });

  /* a keystroke flashes the memory */
  useEffect(() => {
    if (state.pulse === seen.current.pulse) return;
    seen.current.pulse = state.pulse;
    if (!reduced) animate("[data-ram-flash]", { opacity: [0.5, 0] }, { duration: 0.35, ease: "easeOut" });
  }, [animate, reduced, state.pulse]);

  /* a refusal: the lights drop out twice, the case jolts */
  useEffect(() => {
    if (state.failures === seen.current.failures) return;
    seen.current.failures = state.failures;
    if (reduced) return;
    animate("[data-light]", { opacity: [1, 0.1, 0.85, 0.05, 1] }, { duration: 0.7, ease: "linear" });
    animate("[data-case]", { x: [0, -7, 6, -3, 0] }, { duration: 0.45, ease: "easeInOut" });
  }, [animate, reduced, state.failures]);

  const glow = `url(#${ids.glow})`;
  const lit = (yes: boolean) => (yes ? glow : undefined);
  const initial = state.name?.trim().charAt(0).toUpperCase() ?? "";

  return (
    <svg ref={scope} viewBox="40 20 330 405" className="h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <filter id={ids.glow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={ids.bloom}>
          <stop offset="0" style={{ stopColor: "var(--color-accent-lit)", stopOpacity: 0.7 }} />
          <stop offset="1" style={{ stopColor: "var(--color-accent)", stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={ids.glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={ids.window}>
          <rect x={100} y={48} width={222} height={340} rx={10} />
        </clipPath>
      </defs>

      {/* the light the machine throws on the wall behind it */}
      <motion.circle
        cx={211}
        cy={210}
        r={200}
        fill={`url(#${ids.bloom})`}
        initial={false}
        animate={{
          opacity:
            mode === "success" ? 0.55 : mode === "working" ? 0.32 : mode === "error" ? 0.03 : on ? 0.1 + (ram + fans) * 0.02 : 0.05,
        }}
        transition={{ duration: reduced ? 0 : 0.8, ease: "easeOut" }}
      />
      <ellipse cx={202} cy={411} rx={150} ry={9} className="fill-black/50" />

      <g data-case>
        {/* ── the case ── */}
        <rect x={94} y={398} width={46} height={9} rx={3} className="fill-[#26262e]" />
        <rect x={264} y={398} width={46} height={9} rx={3} className="fill-[#26262e]" />
        <rect x={70} y={34} width={264} height={368} rx={18} className="fill-[#1c1c23] stroke-white/12" strokeWidth={2} />
        <rect x={78} y={46} width={16} height={344} rx={6} className="fill-[#16161c]" />
        {Array.from({ length: 20 }, (_, i) => (
          <line key={i} x1={82} y1={96 + i * 14} x2={90} y2={96 + i * 14} className="stroke-white/6" strokeWidth={2} strokeLinecap="round" />
        ))}

        {/* power — breathing in standby, steady when on, red when refused */}
        <circle cx={86} cy={64} r={6.5} className="fill-[#101014] stroke-white/20" strokeWidth={1.2} />
        <motion.circle
          key={`led-${mode}`}
          cx={86}
          cy={64}
          r={2.6}
          className={mode === "error" ? "fill-alert" : "fill-accent-lit"}
          filter={glow}
          animate={
            reduced
              ? { opacity: 1 }
              : mode === "idle"
                ? { opacity: [0.25, 1, 0.25] }
                : mode === "working"
                  ? { opacity: [1, 0.3, 1] }
                  : { opacity: 1 }
          }
          transition={
            !reduced && mode === "idle"
              ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              : !reduced && mode === "working"
                ? { duration: 0.4, repeat: Infinity }
                : { duration: 0.2 }
          }
        />

        {/* ── through the glass ── */}
        <rect x={100} y={48} width={222} height={340} rx={10} className="fill-[#0f0f14] stroke-white/8" strokeWidth={1.5} />
        <g clipPath={`url(#${ids.window})`}>
          {/* the board, and a few traces on it */}
          <rect x={164} y={60} width={148} height={240} rx={4} className="fill-[#16161d] stroke-white/6" strokeWidth={1.2} />
          <path d="M176 160 H232 V196 M290 150 V200 H250 M176 270 H300" className="fill-none stroke-white/5" strokeWidth={1.5} />

          {/* processor cooler */}
          <rect x={224} y={84} width={14} height={56} rx={2} className="fill-[#23232c]" />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={224} y1={88 + i * 6} x2={238} y2={88 + i * 6} className="stroke-black/40" strokeWidth={1.2} />
          ))}
          <Fan id="cpu" cx={200} cy={112} r={22} lit={on} glow={glow} />

          {/* memory */}
          <rect x={246} y={180} width={38} height={6} rx={1.5} className="fill-[#0b0b0f]" />
          {Array.from({ length: 4 }, (_, i) => {
            const stick = full || i < ram;
            return (
              <rect
                key={i}
                data-light
                x={250 + i * 8}
                y={124}
                width={5}
                height={58}
                rx={1.5}
                className={`transition-[fill] duration-300 ${stick ? "fill-accent-lit" : "fill-white/10"}`}
                filter={lit(stick)}
              />
            );
          })}
          <rect data-ram-flash x={246} y={120} width={38} height={66} rx={3} className="fill-accent-lit" opacity={0} />

          {/* rear exhaust */}
          <Fan id="rear" cx={287} cy={94} r={19} lit={full || fans >= 3} glow={glow} />

          {/* front intake */}
          {FRONT.map((cy, i) => (
            <Fan key={cy} id={String(i)} cx={127} cy={cy} r={24} lit={full || i < fans} glow={glow} />
          ))}

          {/* graphics card */}
          <rect x={152} y={214} width={158} height={36} rx={6} className="fill-[#22222a] stroke-white/10" strokeWidth={1.2} />
          <rect x={310} y={208} width={6} height={46} rx={1} className="fill-[#2c2c35]" />
          <rect
            data-light
            x={158}
            y={216.5}
            width={146}
            height={3}
            rx={1.5}
            className={`transition-[fill] duration-300 ${full || ram >= 4 ? "fill-accent-lit" : "fill-white/10"}`}
            filter={lit(full || ram >= 4)}
          />
          <Fan id="gpu" cx={200} cy={234} r={12} lit={on} glow={glow} />
          <Fan id="gpu" cx={262} cy={234} r={12} lit={on} glow={glow} />

          {/* the shroud over the supply, the strip along it, the mark on it */}
          <rect x={100} y={314} width={222} height={74} className="fill-[#15151b]" />
          <line x1={100} y1={314} x2={322} y2={314} className="stroke-white/8" strokeWidth={1.5} />
          {Array.from({ length: STRIP }, (_, i) => (
            <rect
              key={i}
              data-seg
              x={108 + i * 15}
              y={320}
              width={11}
              height={3}
              rx={1.5}
              className="fill-accent-lit"
              opacity={0.12}
              filter={glow}
            />
          ))}
          <g
            data-light
            transform="translate(211 356) scale(0.14) translate(-266 -139)"
            className={`transition-[fill] duration-500 ${mode === "success" ? "fill-accent-lit" : "fill-white/15"}`}
            filter={mode === "success" ? glow : undefined}
          >
            {APL_PATHS.map((p) => (
              <path key={p} d={p} />
            ))}
          </g>

          {/* reflections on the glass */}
          <path d="M100 48 H178 L100 176 Z" fill={`url(#${ids.glass})`} />
          <path d="M196 48 H212 L100 236 V206 Z" className="fill-white/[0.025]" />
        </g>

        {/* ── the welcome ── */}
        {mode === "success" && (
          <motion.g
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: [0.4, 1.12, 1] }}
            transition={{ duration: reduced ? 0 : 0.6, ease: "easeOut", delay: reduced ? 0 : 0.15 }}
          >
            <circle cx={211} cy={176} r={40} className="fill-accent stroke-white/85" strokeWidth={3} filter={glow} />
            {initial ? (
              <text
                x={211}
                y={177}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white font-display"
                fontSize={34}
                fontWeight={700}
              >
                {initial}
              </text>
            ) : (
              <path d="M195 177 L206 188 L227 165" className="fill-none stroke-white" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </motion.g>
        )}
      </g>
    </svg>
  );
}

/**
 * A fan, centred on its own origin so turning it is one `rotate()`. The
 * blades are left unrotated here; the frame loop owns that attribute.
 */
function Fan({ id, cx, cy, r, lit, glow }: { id: string; cx: number; cy: number; r: number; lit: boolean; glow: string }) {
  const r0 = r * 0.3;
  const r1 = r * 0.86;
  const blade = `M0 ${-r0} C${r * 0.36} ${-r * 0.42} ${r * 0.44} ${-r * 0.74} ${r * 0.16} ${-r1} C${-r * 0.06} ${-r * 0.78} ${-r * 0.1} ${-r * 0.5} 0 ${-r0}Z`;

  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} className="fill-[#0c0c11]" />
      <g data-blades data-fan={id}>
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            d={blade}
            transform={`rotate(${i * 72})`}
            className={`transition-[fill] duration-500 ${lit ? "fill-accent-lit/40" : "fill-white/12"}`}
          />
        ))}
      </g>
      <circle r={r0} className="fill-[#1b1b22] stroke-white/20" strokeWidth={1.2} />
      <circle
        data-light
        r={r - 1.4}
        className={`fill-none transition-[stroke] duration-500 ${lit ? "stroke-accent-lit" : "stroke-white/12"}`}
        strokeWidth={r > 15 ? 2.6 : 1.8}
        filter={lit ? glow : undefined}
      />
    </g>
  );
}
