"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Heart } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useWishlist } from "./WishlistProvider";

/** where the sparks fly, in degrees — six is enough to read as a burst */
const SPARKS = [0, 60, 120, 180, 240, 300];

/**
 * The favourite button — PRD-13, on the product page and on every card.
 *
 * The whole point of the animation is that it only plays on the way *in*, and
 * only when a person did it. A heart restored from storage on page load
 * arrives already filled and perfectly still: a burst there would claim the
 * reader had just done something they did not do, and on the catalogue that
 * would be a dozen bursts at once on every reload.
 *
 * So `burst` is set in the click handler and nowhere else, and it is what the
 * ring and the sparks hang off — never `on`.
 */
export function WishHeart({
  slug,
  size = "sm",
  className = "",
}: {
  slug: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState(0);

  const on = has(slug);
  const box = size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const icon = size === "lg" ? "h-5 w-5" : "h-[17px] w-[17px]";

  /* The ring and the sparks are positioned against this button, so it has to
     establish a containing block — but only when the caller has not already
     positioned it. `relative` and `absolute` are both `position` utilities, so
     a caller passing `absolute` does not override a hardcoded `relative`: the
     winner is whichever Tailwind emits last, which is `relative`. Hardcoding
     it silently dropped a card's heart back into normal flow, on top of the
     badges at the opposite corner. Any position the caller sets stands, and
     it still establishes the containing block those children need. */
  const positioned = /(?:^|\s)(?:absolute|fixed|sticky|relative)(?:\s|$)/.test(className);

  const click = () => {
    // the burst belongs to the moment of adding, not to removing
    if (!on && !reduced) setBurst((n) => n + 1);
    toggle(slug);
  };

  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={on}
      aria-label={t(on ? "pd.wishOn" : "pd.wishOff")}
      title={t(on ? "pd.wishOn" : "pd.wishOff")}
      data-on={on || undefined}
      className={`wish-btn ${positioned ? "" : "relative"} grid ${box} place-items-center rounded-full border border-line bg-white/90 text-ink backdrop-blur transition-colors ${className}`}
    >
      {/* the ring: one quick push outward from under the heart */}
      <AnimatePresence>
        {burst > 0 && (
          <motion.span
            key={burst}
            initial={{ scale: 0.2, opacity: 0.55 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* the sparks, thrown along six spokes and gone before they land */}
      {burst > 0 && !reduced && (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          {SPARKS.map((deg) => (
            <motion.span
              key={`${burst}-${deg}`}
              initial={{ x: "-50%", y: "-50%", scale: 0, opacity: 1 }}
              animate={{
                x: `calc(-50% + ${Math.cos((deg * Math.PI) / 180) * 17}px)`,
                y: `calc(-50% + ${Math.sin((deg * Math.PI) / 180) * 17}px)`,
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-accent"
            />
          ))}
        </span>
      )}

      {/* The heart itself dips before it swells — the small crouch is what
          makes the pop read as a press rather than a jump. */}
      <motion.span
        animate={
          reduced || burst === 0
            ? { scale: 1 }
            : { scale: [1, 0.82, 1.24, 1] }
        }
        transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1], times: [0, 0.2, 0.55, 1] }}
        className="relative grid place-items-center"
      >
        <Heart
          className={`${icon} transition-colors duration-200 ${
            on ? "fill-accent text-accent" : "fill-transparent"
          }`}
        />
      </motion.span>
    </button>
  );
}
