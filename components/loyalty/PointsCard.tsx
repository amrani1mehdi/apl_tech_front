"use client";

import { motion, useReducedMotion } from "motion/react";
import { Info } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatPoints } from "@/components/loyalty/format";
import { nextTier, tierProgress } from "@/lib/loyalty/program";
import { fill } from "@/lib/pcbuilder/engine";
import type { Card } from "@/lib/loyalty/card";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The card — FID-03 and FID-04, the two counters side by side.
 *
 * The balance is the big number because it is the one that answers "what can
 * I get right now". The cumulative total is smaller and sits under the bar
 * that it fills, where it reads as what it is: the record that decides the
 * tier, and the only one of the two that spending never touches. Saying so
 * out loud, under both, is the whole point of showing them together — a
 * customer who spends 1 000 points and sees one number drop needs to see the
 * other one stay.
 */
export function PointsCard({ card }: { card: Card }) {
  const { t } = useLocale();
  const reduced = useReducedMotion();

  const next = nextTier(card.lifetime);
  const progress = tierProgress(card.lifetime);
  const tierName = t(`fid.tier.${card.tier.key}`);

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      aria-labelledby="fid-card"
      className="relative overflow-hidden rounded-3xl bg-ink p-7 text-paper lg:p-9"
    >
      {/* the accent, thrown behind the numbers rather than under them */}
      <span
        aria-hidden
        className="bg-accent-gradient pointer-events-none absolute -end-24 -top-28 h-72 w-72 rounded-full opacity-40 blur-3xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="fid-card" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-paper/50">
            {t("fid.balance")}
          </h2>
          <p className="mt-2 font-display text-[clamp(2.4rem,6vw,3.6rem)] font-bold leading-none tracking-[-0.02em] tabular-nums">
            {formatPoints(card.balance, t)}
          </p>
          <p className="mt-2 text-[13.5px] text-paper/60">{t("fid.balanceNote")}</p>
        </div>

        <div className="text-end">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-paper/50">{t("fid.tierLabel")}</p>
          <span
            className={`tier-${card.tier.key} mt-2 inline-block rounded-full px-4 py-1.5 font-display text-[15px] font-bold tracking-[0.02em]`}
          >
            {tierName}
          </span>
        </div>
      </div>

      {/* ── the climb ── */}
      <div className="relative mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[13px] text-paper/70">
            {t("fid.lifetime")}{" "}
            <span className="font-semibold tabular-nums text-paper">{formatPoints(card.lifetime, t)}</span>
          </p>
          <p className="text-[13px] text-paper/70">
            {next
              ? fill(t("fid.toNext"), {
                  n: formatPoints(next.from - card.lifetime, t),
                  tier: t(`fid.tier.${next.key}`),
                })
              : t("fid.top")}
          </p>
        </div>

        <div
          className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/12"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={t("fid.lifetime")}
        >
          <motion.span
            initial={{ scaleX: reduced ? progress : 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            style={{ transformOrigin: "var(--bar-origin, left)" }}
            className="bg-accent-gradient-x block h-full w-full rounded-full [--bar-origin:left] rtl:[--bar-origin:right]"
          />
        </div>

        <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-paper/55">{t("fid.lifetimeNote")}</p>
      </div>

      <p className="relative mt-6 flex items-start gap-2 border-t border-white/10 pt-5 text-[12.5px] leading-relaxed text-paper/55">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {t("fid.credited")}
      </p>
    </motion.section>
  );
}
