"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { splitLocale } from "@/lib/locales";

/**
 * The way into the PC Builder — and only into it.
 *
 * The site has two transitions already and each answers a different question.
 * The logo curtain says *whose* site you are on, which is why it runs between
 * every top-level section. The light-bolt tear says *this thing opens up*,
 * which is why it runs from a catalogue card to a product. Neither says
 * anything about a machine being assembled, and the builder is the one page on
 * the site where that is the whole subject.
 *
 * So: a board energising. Two white shutters close onto a seam, current runs
 * the length of it, and eight traces branch off — one for each bay — each
 * ending in a pad that lights as the current reaches it. Then the shutters
 * part onto the builder.
 *
 * White because the builder is: a curtain in ink parting onto a pale page is a
 * flash of the wrong page, and the eye reads it as a mis-load rather than as a
 * transition. The plate is a shade brighter than the paper behind it, so it
 * still reads as something arriving.
 *
 * Eight is not decoration. The build sheet seats its eight parts down a spine,
 * one after another, in the same order and at nearly the same pace; this plays
 * that sequence a second before the page that performs it arrives. The
 * transition is the destination's own animation, heard through the wall.
 *
 * It deliberately carries no mark and no words. The logo curtain is already
 * doing brand three seconds earlier on most routes, and repeating it here
 * would make the two read as the same event at different speeds.
 */

/* ── the eight traces ──
   Positions and lengths are fixed rather than generated. A layout drawn from
   Math.random() on each run reads as a glitch the first time a customer sees
   two different ones — the same reasoning the split transition records for its
   own jitter. Alternating sides and uneven lengths keep it from reading as a
   bar chart. */
const BRANCHES = [
  { x: 7, h: 54, up: true },
  { x: 17, h: 92, up: false },
  { x: 28, h: 68, up: true },
  { x: 39, h: 116, up: false },
  { x: 52, h: 78, up: true },
  { x: 64, h: 100, up: false },
  { x: 77, h: 60, up: true },
  { x: 90, h: 86, up: false },
] as const;

/**
 * Two paces, the same reasoning the logo curtain records for its own.
 *
 * The difference is how much is cut. The curtain drops its outline pass on a
 * repeat, because a stroke that draws in a fifth of a second reads as a
 * flicker rather than as drawing. Here everything survives — the sequence *is*
 * the idea, and a power-on with half its pads missing is not a shorter
 * power-on, it is a broken one. So a repeat runs the same beats at about
 * two-thirds the length.
 */
const PACE = {
  first: { cover: 300, hold: 900, reveal: 400 },
  again: { cover: 220, hold: 560, reveal: 300 },
} as const;

/** Never hold the shutters closed longer than this, whatever the network does. */
const MAX_HOLD_MS = 3500;

type Phase = "idle" | "cover" | "hold" | "reveal";

const SEEN_KEY = "apl:builder-curtain-shown";
let shownThisLoad = false;

function alreadyShown() {
  if (shownThisLoad) return true;
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown() {
  shownThisLoad = true;
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode — the variable above still covers this load */
  }
}

/** The builder, under any locale. */
const isBuilder = (pathname: string) => splitLocale(pathname).path === "/configurateur";

/* ── the imperative way in ──
   Most routes into the builder are ordinary links and are caught by the click
   listener below. Two are not: "Ajouter au PC Builder" on a product page and
   on a catalogue card both navigate with `router.push`, because they are
   buttons with a disabled state rather than anchors. A click listener never
   sees those, so without this they would be the only two doors into the
   flagship module that open with no transition at all — and they are the doors
   PCB-02 is specifically about.

   Rewriting them as anchors was the alternative. It is the better markup, but
   it means reworking a disabled state and a hover bar inside a card that is
   already a link, to serve an animation — so instead they ask, and fall back
   to navigating plainly if the answer is no. */
let begin: ((href: string) => boolean) | null = null;

/**
 * Play the power-on, then navigate to `href` behind it.
 *
 * Returns false when the transition declined — reduced motion, one already
 * running, or the builder is already on screen — in which case the caller is
 * expected to navigate itself. Never throws and never leaves the caller
 * without a navigation to make.
 */
export function enterBuilder(href: string): boolean {
  return begin ? begin(href) : false;
}

export function BuilderTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<keyof typeof PACE>("first");

  const pace = useRef<(typeof PACE)[keyof typeof PACE]>(PACE.first);
  const target = useRef<string | null>(null);
  const holdStart = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  /* Read synchronously by `start` below, which has to know whether a curtain
     is already up before React would have re-rendered to tell it. */
  const running = useRef(false);

  /**
   * Cover first, navigate second.
   *
   * The order is the whole trick, and it is the one the logo curtain already
   * learned: if the route changes first, the builder is on screen for a beat
   * before anything covers it, and the transition becomes a thing that happens
   * *after* you have already arrived.
   */
  const start = useCallback(
    (href: string): boolean => {
      /* Someone who has asked for less motion gets a plain navigation. Not a
         shortened one — this is nine hundred milliseconds of pulsing light,
         which is exactly what that setting is asking us not to do. */
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      if (running.current) return false;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (!isBuilder(url.pathname)) return false;

      /* Already here: "Ajouter au PC Builder" pressed from inside the builder
         only changes the query, and powering the board up again to land on the
         page you are looking at reads as a stall. */
      if (isBuilder(window.location.pathname)) return false;

      const key = alreadyShown() ? "again" : "first";
      markShown();
      const p = PACE[key];
      pace.current = p;
      setRun(key);

      clearTimers();
      running.current = true;
      target.current = url.pathname + url.search;
      setPhase("cover");

      after(p.cover, () => {
        holdStart.current = Date.now();
        setPhase("hold");
        if (target.current) router.push(target.current);
      });

      after(p.cover + MAX_HOLD_MS, () => {
        target.current = null;
        setPhase("reveal");
        after(p.reveal, () => {
          running.current = false;
          setPhase("idle");
        });
      });

      return true;
    },
    [router, after, clearTimers],
  );

  /* Publish for the two buttons that navigate imperatively. */
  useEffect(() => {
    begin = start;
    return () => {
      begin = null;
    };
  }, [start]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;

      /* Next's Link checks defaultPrevented *after* running its own onClick, so
         preventing here still lets drawer and menu close handlers fire — but
         only prevent once `start` has actually taken the navigation on. */
      if (start(anchor.href)) e.preventDefault();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  /* ── the builder is behind the shutters: finish the sequence, then part ── */
  useEffect(() => {
    if (phase !== "hold" || !target.current) return;
    if (!isBuilder(pathname)) return;

    target.current = null;
    const elapsed = Date.now() - holdStart.current;
    const wait = Math.max(0, pace.current.hold - elapsed);

    clearTimers();
    after(wait, () => {
      setPhase("reveal");
      after(pace.current.reveal, () => {
        running.current = false;
        setPhase("idle");
      });
    });
  }, [pathname, phase, after, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  if (phase === "idle") return null;

  return (
    <div className="pcb-curtain" data-phase={phase} data-run={run} aria-hidden>
      <span className="pcb-shutter pcb-shutter-t" />
      <span className="pcb-shutter pcb-shutter-b" />

      <div className="pcb-rig">
        {/* the bus the current runs along */}
        <span className="pcb-seam">
          <span className="pcb-spark" />
        </span>

        {BRANCHES.map((b, i) => (
          <span
            key={b.x}
            className={`pcb-branch ${b.up ? "is-up" : "is-down"}`}
            style={
              {
                "--x": `${b.x}%`,
                "--h": `${b.h}px`,
                "--i": i,
              } as React.CSSProperties
            }
          >
            <span className="pcb-pad" />
          </span>
        ))}
      </div>
    </div>
  );
}
