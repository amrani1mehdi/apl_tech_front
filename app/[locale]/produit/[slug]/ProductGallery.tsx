"use client";

import { useCallback, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "motion/react";
import { ChevronLeft, ChevronRight, Expand, ZoomIn } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Lightbox } from "./Lightbox";

/** how much the hover zoom magnifies — PRD-02 */
const ZOOM = 2.4;
/** a drag has to travel this far, or be thrown this fast, to turn the page */
const SWIPE_PX = 60;
const SWIPE_VELOCITY = 380;

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * The shot swap — PRD-01.
 *
 * Direction is passed through AnimatePresence's `custom` for the same reason
 * the catalogue grid does it: the outgoing image is rendered from the props it
 * had before the click, so asking it which way to leave gets last turn's
 * answer. A number, so an unrelated re-render cannot restart an exit already
 * running.
 */
const shot: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 64, scale: 1.04 }),
  center: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.44, ease: EASE_OUT } },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -64,
    scale: 0.98,
    transition: { duration: 0.28, ease: "easeOut" },
  }),
};

export function ProductGallery({
  images,
  alt,
  badge,
}: {
  images: string[];
  alt: string;
  badge?: React.ReactNode;
}) {
  const { t, dir } = useLocale();
  const reduced = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);

  const [i, setI] = useState(0);
  const [turn, setTurn] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  /* Where the shot was standing when the viewer was asked for, so it can grow
     out of exactly that rectangle instead of fading in over the top of it. */
  const [fromRect, setFromRect] = useState<DOMRect | null>(null);

  /* Arabic reads the other way, so "next" has to travel the other way with
     it — the same rule the catalogue pager follows. */
  const flip = dir === "rtl" ? -1 : 1;
  const sweep = reduced ? 0 : turn * flip;

  /* The zoom origin is a pair of motion values rather than state: a spring
     reads them every frame without React re-rendering the image on every
     pixel of cursor travel, and the spring is what stops the magnified view
     snapping about as the hand moves. */
  const ox = useMotionValue(50);
  const oy = useMotionValue(50);
  const sx = useSpring(ox, { stiffness: 380, damping: 34, mass: 0.4 });
  const sy = useSpring(oy, { stiffness: 380, damping: 34, mass: 0.4 });
  const origin = useMotionTemplate`${sx}% ${sy}%`;

  /* The magnification is a motion value too, and it has to be.
     
     Written as `animate={{ scale }}` it did not animate at all — it jumped
     straight from 1 to 2.4 and back. The image sits inside the slide wrapper,
     which drives `variants` with `animate="center"`, and a motion child under
     a variant-driven parent inherits that label rather than running its own
     animate prop. A motion value in `style` is applied directly and never
     goes near variant resolution, which is exactly why the origin spring
     above always worked while the scale beside it silently did not. */
  const zoomTo = useMotionValue(1);
  const scale = useSpring(zoomTo, { stiffness: 240, damping: 26, mass: 0.7 });

  const go = useCallback(
    (next: number) => {
      const count = images.length;
      const wrapped = (next + count) % count;
      setI((cur) => {
        if (wrapped === cur) return cur;
        setTurn(next > cur ? 1 : -1);
        return wrapped;
      });
    },
    [images.length],
  );

  const pick = (next: number) => {
    if (next === i) return;
    setTurn(next > i ? 1 : -1);
    setI(next);
  };

  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    ox.set(((e.clientX - box.left) / box.width) * 100);
    oy.set(((e.clientY - box.top) / box.height) * 100);
  };

  /* Mouse gets the zoom, touch gets the full-screen viewer — PRD-02 against
     PRD-03. Read from the pointer that actually arrived rather than from the
     viewport width, so a touchscreen laptop behaves like whichever one the
     reader just used, not like whichever one its screen size implies. */
  const enter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduced) return;
    track(e);
    setZooming(true);
    zoomTo.set(ZOOM);
  };

  const leave = () => {
    setZooming(false);
    zoomTo.set(1);
  };

  const open = () => {
    const el = frame.current?.querySelector<HTMLImageElement>("[data-hero-image]");
    setFromRect(el?.getBoundingClientRect() ?? null);
    setLightbox(true);
  };

  const multiple = images.length > 1;

  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <motion.div
        ref={frame}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        onPointerEnter={enter}
        onPointerMove={(e) => zooming && track(e)}
        onPointerLeave={leave}
        onClick={(e) => {
          // a mouse is already zooming in place; a finger opens the viewer
          if ((e.nativeEvent as PointerEvent).pointerType !== "mouse") open();
        }}
        /* The cursor carries the state; a border tint was tried here and
           silently did nothing, because globals.css sets a default
           border-color outside any layer and unlayered CSS outranks Tailwind
           utilities. The vignette above is the visual cue instead. */
        className={`group/frame relative aspect-square touch-pan-y overflow-hidden rounded-2xl border border-line bg-cloud ${
          zooming ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
      >
        <AnimatePresence mode="popLayout" custom={sweep} initial={false}>
          <motion.div
            key={images[i]}
            custom={sweep}
            variants={shot}
            initial="enter"
            animate="center"
            exit="exit"
            drag={multiple && !zooming ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            onDragEnd={(_, info) => {
              const thrown =
                info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_VELOCITY
                  ? 1
                  : info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_VELOCITY
                    ? -1
                    : 0;
              if (thrown) go(i + thrown * flip);
            }}
            className="absolute inset-0"
          >
            {/* The spring feeds the transform origin, so the magnified view
                glides after the cursor rather than tracking it rigidly. It is
                a motion template rather than state: the origin changes on
                every pixel of cursor travel, and re-rendering the image that
                often to move it would be the one thing that makes a zoom feel
                cheap. */}
            <motion.img
              src={images[i]}
              alt={alt}
              draggable={false}
              data-hero-image
              style={{ scale, transformOrigin: origin }}
              className="pointer-events-none h-full w-full select-none object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* While magnified the frame gets a soft inner shade. It does almost
            nothing on its own, and that is the point: it separates "zoomed"
            from "not zoomed" without a label, a border flash, or anything else
            that would compete with the photograph. */}
        <AnimatePresence>
          {zooming && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              aria-hidden
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.28)]"
            />
          )}
        </AnimatePresence>

        {badge}

        {/* the hint fades out the moment the zoom takes over */}
        <AnimatePresence>
          {!zooming && (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute bottom-3 end-3 hidden items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-[11px] font-medium text-paper backdrop-blur lg:flex"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              {t("pd.zoomHint")}
            </motion.span>
          )}
        </AnimatePresence>

        {/* the finger's way in, and the only control a phone needs here */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          aria-label={t("pd.expand")}
          className="absolute bottom-3 start-3 grid h-10 w-10 place-items-center rounded-full bg-ink/70 text-paper backdrop-blur transition-opacity lg:opacity-0 lg:group-hover/frame:opacity-100"
        >
          <Expand className="h-4 w-4" />
        </button>

        {multiple && (
          <>
            <Arrow side="start" onClick={() => go(i - 1)} label={t("pd.prevShot")} />
            <Arrow side="end" onClick={() => go(i + 1)} label={t("pd.nextShot")} />
          </>
        )}

        {/* dots, for the phone where the thumbnails are a scroll away */}
        {multiple && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
            {images.map((src, n) => (
              <span
                key={src}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  n === i ? "w-5 bg-paper" : "w-1.5 bg-paper/50"
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── thumbnails ── */}
      {multiple && (
        <div className="no-bar mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button
              key={src}
              onClick={() => pick(n)}
              aria-label={`${t("pd.shot")} ${n + 1}`}
              aria-current={n === i ? "true" : undefined}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg"
            >
              <img
                src={src}
                alt=""
                draggable={false}
                className={`h-full w-full object-cover transition-[opacity,transform] duration-300 ${
                  n === i ? "opacity-100" : "opacity-55 hover:opacity-90"
                }`}
              />
              {/* One ring for the whole strip, travelling between thumbnails —
                  the same device the category rail and the pager use, so every
                  "which one is on" answer on this site is told the same way. */}
              {n === i && (
                <motion.span
                  layoutId="gallery-ring"
                  transition={
                    reduced ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 38 }
                  }
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-ink ring-offset-2 ring-offset-paper"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Deliberately not wrapped in AnimatePresence. The viewer renders
          through a portal and runs its own nested AnimatePresence and drag
          handlers, and presence bookkeeping across that boundary took about a
          second and a half to release it — the panel sat there, faded out and
          inert, long after being dismissed. It fades itself out instead and
          unmounts the moment that finishes. */}
      {lightbox && (
        <Lightbox
          images={images}
          alt={alt}
          index={i}
          onIndex={pick}
          onClose={() => setLightbox(false)}
          from={fromRect}
        />
      )}
    </div>
  );
}

/** Sits out of the way until the frame is hovered, and is always there on touch. */
function Arrow({
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
      className={`absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-paper/85 text-ink shadow-sm backdrop-blur transition-all duration-300 hover:bg-paper lg:opacity-0 lg:group-hover/frame:opacity-100 ${
        side === "start" ? "start-3 lg:-translate-x-1 lg:group-hover/frame:translate-x-0" : "end-3 lg:translate-x-1 lg:group-hover/frame:translate-x-0"
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
