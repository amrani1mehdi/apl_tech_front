"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";

/** The house rise, borrowed from the scroll reveals so the one title that
    animates on load moves the way every title further down the page does. */
const RISE = [0.16, 0.84, 0.28, 1] as const;
const STEP = 0.075;

/**
 * A store header: the same light band every other subpage opens on, with a
 * slightly larger title because these pages have no section headings under
 * them to carry the weight.
 *
 * Shared by the catalogue and the coupon shop, which are the same kind of
 * page — a shelf you browse — and should open the same way.
 *
 * The title is the one thing on the page that arrives rather than appears.
 * It is split into words, each rising out of its own clipping edge — the
 * site's own device, run on mount here instead of on scroll, because this
 * heading is above the fold and would otherwise be the only display line in
 * the store that never moves. The full stop is held back and set in accent:
 * it is punctuation, not reading, so it can land after the sentence it ends.
 *
 * Splitting stops at word boundaries. Arabic joins its letters, and a per-
 * character reveal would take "الكتالوج" apart into forms that do not exist
 * on their own.
 */
export function StoreHero({
  crumbKey = "cata.crumb",
  titleKey = "cata.title",
  subtitleKey,
}: {
  crumbKey?: string;
  titleKey?: string;
  /** one line under the title — it says what is on the shelf and stops, so
      the title keeps the weight */
  subtitleKey?: string;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();

  const title = t(titleKey);
  const stop = title.endsWith(".") ? "." : "";
  const words = (stop ? title.slice(0, -1) : title).split(/\s+/).filter(Boolean);

  /* One helper for both, so the stop cannot drift from the words it follows.
     Reduced motion drops the whole sequence rather than shortening it — the
     line is legible the moment it is painted. */
  const rise = (index: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: "112%", rotate: 3.5 },
          animate: { opacity: 1, y: "0%", rotate: 0 },
          transition: { duration: 0.86, ease: RISE, delay: 0.1 + index * STEP },
        };

  /* The band's top padding clears the fixed header (~69px) before it is
     spacing at all, so it reads much smaller than it measures: the gap the eye
     sees is pt minus the header. These leave ~27px of it on small screens and
     ~43px from lg up. */
  return (
    <section className="border-b border-line bg-cloud pb-6 pt-24 lg:pb-8 lg:pt-28">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        <motion.nav
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: RISE }}
          className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase text-faint"
        >
          <Link href="/" className="transition-colors hover:text-ink">
            APL TECH
          </Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-mute">{t(crumbKey)}</span>
        </motion.nav>

        <h1 className="mt-3 font-display text-[clamp(2.6rem,5.5vw,4rem)] font-bold leading-[1] tracking-[-0.02em] text-ink">
          {words.map((w, i) => (
            <Fragment key={`${w}-${i}`}>
              {/* the space has to sit OUTSIDE the clip box, or the words run
                  together the moment the mask closes over it */}
              {i > 0 ? " " : null}
              <span className="rv-w">
                <motion.span className="inline-block" {...rise(i)}>
                  {w}
                </motion.span>
              </span>
            </Fragment>
          ))}
          {stop && (
            <span className="rv-w">
              <motion.span className="inline-block text-accent" {...rise(words.length + 0.6)}>
                {stop}
              </motion.span>
            </span>
          )}
        </h1>

        {subtitleKey && <p className="mt-3 text-mute">{t(subtitleKey)}</p>}
      </div>
    </section>
  );
}
