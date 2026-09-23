"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const MIN_SCALE = 1;
const MAX_SCALE = 4;
/** what a double tap springs to, and back from */
const TAP_SCALE = 2.5;
const SWIPE_PX = 70;
const SWIPE_VELOCITY = 400;
/** two taps inside this are one gesture */
const DOUBLE_TAP_MS = 280;
/** how long the panel takes to fade itself out before it unmounts */
const EXIT_MS = 300;
/** the shot growing out of the gallery, and shrinking back into it */
const EXPAND_S = 0.44;
const COLLAPSE_S = 0.28;

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 90, scale: 0.96 }),
  center: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.42, ease: EASE_OUT } },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -90,
    scale: 0.96,
    transition: { duration: 0.26, ease: "easeOut" },
  }),
};

/**
 * The full-screen viewer — PRD-03.
 *
 * Pinch and pan are driven from raw pointer events rather than a gesture
 * library: two fingers give two pointers, the ratio of the distance between
 * them is the scale, and the midpoint is what the image should stay anchored
 * to. That is the whole of it, and it behaves the same on every touch device
 * because nothing is guessing at browser gesture events.
 *
 * The rule that keeps it feeling right: a swipe only turns the page while the
 * image is at rest. Once it is magnified, a drag pans the picture — otherwise
 * every attempt to look at the corner of a photo would throw you to the next
 * one.
 *
 * It renders through a portal onto <body>, which is not optional. The gallery
 * that owns it sits in a `sticky` wrapper, and a sticky element creates a
 * stacking context: left in place, this panel's z-index would be compared only
 * against its siblings inside that context, and the fixed header — a z-index
 * in the *root* context — would paint straight over the top of it, along with
 * every part of the product column that follows the gallery in the document.
 * A portal is the only way out of an ancestor stacking context.
 */
export function Lightbox({
  images,
  alt,
  index,
  onIndex,
  onClose,
  from,
}: {
  images: string[];
  alt: string;
  index: number;
  onIndex: (n: number) => void;
  onClose: () => void;
  /** where the shot sat in the gallery, so it can grow out of exactly there */
  from?: DOMRect | null;
}) {
  const { t, dir } = useLocale();
  const reduced = useReducedMotion();
  const flip = dir === "rtl" ? -1 : 1;

  const [turn, setTurn] = useState(0);
  const [scale, setScale] = useState(1);
  /* The fade-out is ours to run: `closing` starts it, and the panel calls
     back to be unmounted the frame it lands. Nothing outside has to wait on
     anything, and there is no state in which a dismissed viewer is still on
     screen. */
  const [closing, setClosing] = useState(false);
  /* Whether two fingers are currently down. It has to be state rather than the
     ref below, because the image transition is chosen while rendering and a
     ref read there is not something React can be asked to re-run on. */
  const [pinching, setPinching] = useState(false);

  /* Panning a magnified image is motion's own drag — the element moves, and
     the stage is what it is not allowed to leave. Keeping a copy of the offset
     in state as well would be two sources of truth for one position. */
  const stage = useRef<HTMLDivElement>(null);
  const shot = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const zoomed = scale > 1.01;

  /* ── magnification ──
     A motion value, not `animate={{ scale }}`. This image sits inside the
     slide wrapper, which drives variants, and a motion child under a
     variant-driven parent inherits the parent's variant instead of running its
     own animate prop — so the pinch and the double tap were both snapping
     straight to their target with nothing in between. Style-bound motion
     values never go near variant resolution. */
  const zoomTo = useMotionValue(1);
  const zoomScale = useSpring(zoomTo, { stiffness: 400, damping: 30, mass: 0.5 });

  const setZoom = useCallback(
    (v: number) => {
      setScale(v);
      zoomTo.set(v);
    },
    [zoomTo],
  );

  /* ── the expand ──
     The shot does not fade in, it grows out of the gallery: we measure where it
     was on screen, start it there, and let it travel to where it belongs.
     Kept as its own pair of values and multiplied with the zoom above, so a
     pinch halfway through an expand cannot fight it — each owns its own
     number and the transform is the product. */
  const flipX = useMotionValue(0);
  const flipY = useMotionValue(0);
  const flipS = useMotionValue(1);

  /* Held back for exactly as long as it takes to work out where the shot has
     to start from. Without this the picture paints once at its final size and
     only then jumps back to the gallery to begin — the one frame that would
     give the whole trick away. Nothing to hide when there is no rectangle to
     grow from, so it starts visible in that case. */
  const revealed = useMotionValue(from ? 0 : 1);
  const totalScale = useTransform([flipS, zoomScale], (v) => (v[0] as number) * (v[1] as number));

  /** the mapping that put the shot over the gallery, kept for the way back */
  const mapping = useRef<{ x: number; y: number; s: number } | null>(null);

  useLayoutEffect(() => {
    const el = shot.current;
    if (!from || !el || reduced) return;

    /* The measurement has to wait for the picture to have a size.

       A freshly mounted <img> frequently has none yet, even for a file the
       gallery is already displaying from cache, and measuring then returns a
       zero rectangle. Guarding against that by giving up meant the expand
       played or did not play depending on how warm the image happened to be —
       which is the worst kind of animation bug, because it looks fine every
       time you check it. So it waits for a frame, and for the decode if the
       file genuinely is not ready, and only then decides. */
    let cancelled = false;

    const arm = () => {
      if (cancelled || !shot.current) return;
      const to = shot.current.getBoundingClientRect();
      if (!to.width || !to.height) {
        revealed.set(1);
        return;
      }

      const map = {
        x: from.left + from.width / 2 - (to.left + to.width / 2),
        y: from.top + from.height / 2 - (to.top + to.height / 2),
        // cover rather than contain: the gallery crops its shot, so matching
        // the larger ratio keeps the two reading as the same picture
        s: Math.max(from.width / to.width, from.height / to.height),
      };
      mapping.current = map;

      flipX.set(map.x);
      flipY.set(map.y);
      flipS.set(map.s);
      revealed.set(1);

      const opts = { duration: EXPAND_S, ease: [0.16, 1, 0.3, 1] as const };
      animate(flipX, 0, opts);
      animate(flipY, 0, opts);
      animate(flipS, 1, opts);
    };

    let raf = 0;
    if (el.complete) raf = requestAnimationFrame(arm);
    else el.addEventListener("load", () => (raf = requestAnimationFrame(arm)), { once: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // measured once, on the way in: `from` is fixed for the life of the panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => setClosing(true), []);

  /* On the way out it retraces the same path. The panel unmounts on its own
     timer either way, so a collapse that cannot finish never traps anyone. */
  useEffect(() => {
    if (!closing) return;
    const map = mapping.current;
    if (!map) return;
    const opts = { duration: COLLAPSE_S, ease: "easeIn" as const };
    animate(flipX, map.x, opts);
    animate(flipY, map.y, opts);
    animate(flipS, map.s, opts);
  }, [closing, flipX, flipY, flipS]);

  /* A safety net, not the mechanism: if the fade is interrupted — a tab
     backgrounded mid-animation, say — onAnimationComplete may never fire, and
     a viewer that cannot be closed is worse than one that closes abruptly. */
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onClose, EXIT_MS + 120);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  const go = useCallback(
    (next: number) => {
      const wrapped = (next + images.length) % images.length;
      if (wrapped === index) return;
      setTurn(next > index ? 1 : -1);
      // a new shot always arrives at rest, however magnified the last one was
      setZoom(1);
      onIndex(wrapped);
    },
    [images.length, index, onIndex, setZoom],
  );

  /* Escape closes, the arrows walk the set — a viewer that fills the screen
     has to answer the keyboard, since there is nothing else on screen to
     click past it. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") go(index + flip);
      if (e.key === "ArrowLeft") go(index - flip);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss, go, index, flip]);

  /* The page behind must not scroll while this is up, and it must go back to
     exactly what it was — not to "auto", which would quietly undo any overflow
     the page had set for itself. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const down = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      pinch.current = { dist: spread(), scale };
      setPinching(true);
    }
  };

  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const next = (spread() / pinch.current.dist) * pinch.current.scale;
      setZoom(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
    }
  };

  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
      setPinching(false);
    }

    // a pinch that has been let go settles back rather than sticking just off
    if (pointers.current.size === 0 && scale < 1.15) setZoom(1);
  };

  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      setZoom(zoomed ? 1 : TAP_SCALE);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: EASE_OUT }}
      onAnimationComplete={() => {
        if (closing) onClose();
      }}
      className="fixed inset-0 z-[120] flex flex-col bg-ink/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      {/* ── bar ── */}
      <div className="flex items-center justify-between px-4 py-4 text-paper sm:px-6">
        <span className="font-mono text-xs tabular-nums text-paper/70">
          {index + 1} / {images.length}
        </span>
        <button
          onClick={dismiss}
          aria-label={t("c.close")}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-paper transition-colors hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── stage ── */}
      <div
        ref={stage}
        className="relative flex-1 touch-none overflow-hidden"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={tap}
      >
        <AnimatePresence mode="popLayout" custom={reduced ? 0 : turn * flip} initial={false}>
          <motion.div
            key={images[index]}
            custom={reduced ? 0 : turn * flip}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            drag={zoomed ? true : images.length > 1 ? "x" : false}
            /* Zoomed, the stage is the leash — motion keeps the dragged
               element covering it, so a magnified photo can be pushed around
               to look at a corner but never dragged off into nothing. At rest
               the only travel allowed is the horizontal throw that turns the
               page. */
            dragConstraints={zoomed ? stage : { left: 0, right: 0 }}
            dragElastic={zoomed ? 0.05 : 0.18}
            dragMomentum={zoomed}
            onDragEnd={(_, info) => {
              if (zoomed) return;
              const thrown =
                info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_VELOCITY
                  ? 1
                  : info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_VELOCITY
                    ? -1
                    : 0;
              if (thrown) go(index + thrown * flip);
            }}
            /* Flex, not grid, and the distinction matters: a grid here sizes
               its single row to the image, so the image's own `max-h-full`
               resolves against a height that depends on the image — circular,
               so the browser drops it and only the width cap survives. The
               picture then keeps its natural ratio straight past the bottom of
               the stage. A flex item's containing block is the container's
               content box, which is definite, so the percentage resolves. */
            className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
          >
            <motion.img
              ref={shot}
              src={images[index]}
              alt={alt}
              draggable={false}
              style={{ x: flipX, y: flipY, scale: totalScale, opacity: revealed }}
              className="max-h-full max-w-full select-none rounded-xl object-contain shadow-2xl"
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && !zoomed && (
          <>
            <Nav side="start" onClick={() => go(index - flip)} label={t("pd.prevShot")} />
            <Nav side="end" onClick={() => go(index + flip)} label={t("pd.nextShot")} />
          </>
        )}
      </div>

      {/* ── filmstrip ── */}
      {images.length > 1 && (
        <div className="no-bar flex justify-start gap-2 overflow-x-auto px-4 pb-5 pt-1 sm:justify-center sm:px-6">
          {images.map((src, n) => (
            <button
              key={src}
              onClick={(e) => {
                e.stopPropagation();
                go(n);
              }}
              aria-label={`${t("pd.shot")} ${n + 1}`}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md"
            >
              <img
                src={src}
                alt=""
                draggable={false}
                className={`h-full w-full object-cover transition-opacity duration-300 ${
                  n === index ? "opacity-100" : "opacity-45 hover:opacity-80"
                }`}
              />
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 rounded-md ring-2 transition-all duration-200 ${
                  n === index ? "ring-paper" : "ring-transparent"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* said once, quietly, and only where it applies */}
      {!zoomed && (
        <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-paper/45 sm:hidden">
          {t("pd.pinchHint")}
        </p>
      )}
    </motion.div>,
    document.body,
  );
}

function Nav({
  side,
  onClick,
  label,
}: {
  side: "start" | "end";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-ink/50 text-paper backdrop-blur transition-colors hover:bg-white/10 ${
        side === "start" ? "start-3 sm:start-6" : "end-3 sm:end-6"
      }`}
    >
      {side === "start" ? (
        <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
      ) : (
        <ChevronRight className="h-5 w-5 rtl:rotate-180" />
      )}
    </button>
  );
}
