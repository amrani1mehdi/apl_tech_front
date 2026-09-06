"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fires once when the element scrolls in. `armed` is set client-side only, so
 * the hidden state never reaches server HTML — without JS everything renders
 * visible instead of blank.
 */
function useReveal<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Without an observer, `armed` is never set either — and the hidden state
    // is gated on it — so the content is already visible. Nothing to do.
    if (!el || typeof IntersectionObserver === "undefined") return;
    setArmed(true);
    // A working observer always delivers an initial callback (even a
    // non-intersecting one). Track that, so the safety net only fires when the
    // observer is genuinely dead — an unconditional timer would reveal every
    // section a couple of seconds after load, scrolled to or not.
    let heard = false;
    const io = new IntersectionObserver(
      (entries) => {
        heard = true;
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    const bail = setTimeout(() => {
      if (!heard) setInView(true);
    }, 1200);
    return () => {
      io.disconnect();
      clearTimeout(bail);
    };
  }, [rootMargin]);

  return { ref, armed: armed || undefined, inView: inView || undefined };
}

/**
 * Block reveal — the content is wiped up from behind its own bottom edge
 * rather than faded in. Used for cards, images, grids.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, armed, inView } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-rv-block
      data-armed={armed}
      data-in={inView}
      style={{ ["--rv-d" as string]: `${delay}s` }}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Display-face reveal — each word rises from behind a clipping edge with a
 * slight tilt, staggered across the line. The clip is what sells it: the words
 * arrive from somewhere rather than materialising in place.
 */
export function SplitText({
  text,
  className,
  delay = 0,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const { ref, armed, inView } = useReveal<HTMLElement>();
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-rv-split
      data-armed={armed}
      data-in={inView}
      className={className}
    >
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span className="rv-w">
            <span
              className="rv-wi"
              style={{ ["--i" as string]: i, ["--rv-d" as string]: `${delay}s` }}
            >
              {w}
            </span>
          </span>
          {/* the separator has to sit OUTSIDE .rv-w — inside the clip box it
              collapses and the words run together */}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}

/**
 * Utility-face reveal — the label resolves out of noise, left to right.
 * The scramble pool is built from the string itself, so it works the same in
 * Arabic as it does in Latin.
 */
export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const { ref, inView } = useReveal<HTMLSpanElement>("0px 0px -6% 0px");
  const [shown, setShown] = useState(text);
  /** which string the scramble last ran for — a locale switch changes `text`,
   *  and the label has to re-resolve to the new language rather than stay
   *  frozen on whatever was rendered first */
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!inView || ranFor.current === text) return;
    ranFor.current = text;

    const chars = [...text];
    const pool = [...new Set(chars.filter((c) => c.trim()))];
    // too few distinct glyphs to scramble convincingly — show it as typed
    if (pool.length < 4) {
      const id = setTimeout(() => setShown(text), 0);
      return () => clearTimeout(id);
    }

    // Stepped on a timer rather than rAF: the effect is short and the step
    // count needs to be the same on a throttled or low-end device, where rAF
    // can collapse the whole run into one or two frames.
    const STEPS = 22;
    const STEP_MS = 28;
    let step = 0;

    const id = setInterval(() => {
      step += 1;
      const p = step / STEPS;
      // the resolve point sweeps across the string; everything past it is noise
      const resolved = p * chars.length;
      if (step >= STEPS) {
        clearInterval(id);
        setShown(text);
        return;
      }
      setShown(
        chars
          .map((c, i) => (!c.trim() || i < resolved ? c : pool[(Math.random() * pool.length) | 0]))
          .join(""),
      );
    }, STEP_MS);

    return () => clearInterval(id);
  }, [inView, text]);

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}
