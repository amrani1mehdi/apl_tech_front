"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { APL_PATHS, APL_VIEWBOX } from "@/lib/logo";
import { PRINCIPAL_PATHS } from "@/lib/nav";
import { splitLocale } from "@/lib/locales";
import { AplGradient } from "./Logo";

/**
 * Between-pages curtain.
 *
 * The order matters: the panel has to cover the screen *before* the route
 * changes, otherwise the incoming page is visible for a beat first. So link
 * clicks are intercepted, the cover animation runs, and only then is the
 * navigation pushed — behind the curtain. Timings mirror globals.css.
 *
 * One rule decides whether it runs at all, in `shouldCover` below: it is for
 * crossing between the site's top-level sections. Everything else — a product,
 * the cart, checkout, the account, a filter, the language switch — navigates
 * plainly.
 */

/**
 * Two paces for the same curtain.
 *
 * The mark drawing itself is an arrival flourish, and an arrival that plays at
 * full length on every click stops being one — by the third crossing it is
 * just latency the reader has to sit through. So the full draw is kept for the
 * first crossing of a visit and every one after it runs brisk: the same panel
 * and the same mark, roughly half the time, no outline pass. The brand beat
 * survives; the waiting does not.
 */
const PACE = {
  first: { cover: 500, hold: 650, reveal: 500 },
  again: { cover: 300, hold: 180, reveal: 300 },
} as const;
/** Never hold the curtain longer than this, whatever the network is doing. */
const MAX_HOLD_MS = 3500;

type Phase = "idle" | "cover" | "hold" | "reveal";

/* Remembers that the full draw has been seen, so the rest of the visit gets
   the brisk pace. sessionStorage rather than a variable, so a reload mid-visit
   does not start it over; the variable is the fallback for when storage is
   blocked, which at least holds for this load. */
const SEEN_KEY = "apl:curtain-shown";
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

/** `fromUrl` and `toUrl` are pathnames, without the query. Both still carry
    their locale segment, which is stripped here: switching language is a
    crossing between two spellings of the same page, not between sections. */
function shouldCover(fromUrl: string, toUrl: string) {
  const from = splitLocale(fromUrl);
  const to = splitLocale(toUrl);
  // A filter, a sort, or the language switch is a step inside one section.
  if (from.path === to.path) return false;
  // The PC Builder brings its own way in — see BuilderTransition. Only on the
  // way *there*: leaving it is an ordinary crossing and keeps this curtain.
  // Both would otherwise fire on the same click, and the panel that covers
  // second is the one you would see.
  if (to.path === "/configurateur") return false;
  // Product pages, the cart, checkout and the account sit inside a section
  // rather than beside it. Covering the screen to reach one makes the site
  // feel slower, not more considered.
  return PRINCIPAL_PATHS.has(from.path) && PRINCIPAL_PATHS.has(to.path);
}

export function PageTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  /* Drives the CSS as well as the timers below, so the panel and the mark
     agree on how long they have. Held in a ref too: the hold-to-reveal effect
     reads it after the click handler that chose it has long since returned. */
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

  // ── intercept internal link clicks so we can cover before navigating ──
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

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // same destination — nothing to transition to
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      // read from location, not usePathname: this listener is bound once, so a
      // captured pathname would be the one from whichever page armed it
      if (!shouldCover(window.location.pathname, url.pathname)) return;

      // Next's Link checks defaultPrevented *after* running its own onClick,
      // so preventing here still lets menu/drawer close handlers fire.
      e.preventDefault();

      // read before marking, or the first crossing of a visit never gets the
      // full draw it is the whole point of
      const key = alreadyShown() ? "again" : "first";
      markShown();
      const p = PACE[key];
      pace.current = p;
      setRun(key);

      clearTimers();
      target.current = url.pathname + url.search;
      setPhase("cover");

      after(p.cover, () => {
        holdStart.current = Date.now();
        setPhase("hold");
        if (target.current) router.push(target.current);
      });
      // hard ceiling, so a stalled navigation can never strand the curtain
      after(p.cover + MAX_HOLD_MS, () => {
        target.current = null;
        setPhase("reveal");
        after(p.reveal, () => setPhase("idle"));
      });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, after, clearTimers]);

  // ── the route committed: finish the hold, then reveal ──
  useEffect(() => {
    if (phase !== "hold" || !target.current) return;
    if (!target.current.startsWith(pathname)) return;

    target.current = null;
    const elapsed = Date.now() - holdStart.current;
    const wait = Math.max(0, pace.current.hold - elapsed);

    clearTimers();
    after(wait, () => {
      setPhase("reveal");
      after(pace.current.reveal, () => setPhase("idle"));
    });
  }, [pathname, phase, after, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  if (phase === "idle") return null;

  return (
    <div className="page-curtain" data-phase={phase} data-run={run} aria-hidden>
      <svg className="curtain-logo" viewBox={APL_VIEWBOX}>
        <defs>
          <AplGradient id="apl-curtain-grad" />
        </defs>

        {/* outline draws on first */}
        <g className="curtain-stroke" fill="none" stroke="url(#apl-curtain-grad)" strokeWidth={3}>
          {APL_PATHS.map((d) => (
            <path key={d} d={d} pathLength={1} strokeLinejoin="round" />
          ))}
        </g>

        {/* then the solid fill blooms in behind it */}
        <g className="curtain-fill" fill="url(#apl-curtain-grad)">
          {APL_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        <text
          className="curtain-tech"
          x="113"
          y="274"
          fill="url(#apl-curtain-grad)"
          fontFamily="Montserrat, var(--font-sans), ui-sans-serif, sans-serif"
          fontSize="43"
          fontWeight="600"
          letterSpacing="18"
        >
          TECH
        </text>
      </svg>
    </div>
  );
}
