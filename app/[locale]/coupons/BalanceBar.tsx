"use client";

import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatPoints } from "@/components/loyalty/format";
import { nextTier, tierProgress } from "@/lib/loyalty/program";
import { fill } from "@/lib/pcbuilder/engine";
import type { Card } from "@/lib/loyalty/card";

/**
 * What the customer has to spend, kept in view while they browse.
 *
 * It sticks under the header for the same reason the catalogue's category
 * rail does: the question this page asks on every row — can I have that one? —
 * cannot be answered without the number, and a balance that scrolls away
 * leaves you counting backwards up the page.
 */
export function BalanceBar({ card }: { card: Card }) {
  const { t } = useLocale();

  const next = nextTier(card.lifetime);
  const progress = tierProgress(card.lifetime);

  return (
    <div className="rounded-2xl border border-line bg-cloud px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className={`tier-${card.tier.key} shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold`}>
          {t(`fid.tier.${card.tier.key}`)}
        </span>

        <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
          {formatPoints(card.balance, t)}
          <span className="ms-2 text-[12.5px] font-normal text-mute">{t("fid.balanceNote")}</span>
        </p>

        {next && (
          <div className="ms-auto flex min-w-0 items-center gap-3">
            <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-line sm:block">
              <span
                style={{ transform: `scaleX(${progress})` }}
                className="bg-accent-gradient-x block h-full w-full origin-left rounded-full rtl:origin-right"
              />
            </span>
            <span className="truncate text-[12.5px] text-mute">
              {fill(t("fid.toNext"), {
                n: formatPoints(next.from - card.lifetime, t),
                tier: t(`fid.tier.${next.key}`),
              })}
            </span>
          </div>
        )}

        <Link
          href="/compte"
          className={`shrink-0 text-[12.5px] font-semibold text-accent transition-colors hover:text-accent-deep ${next ? "" : "ms-auto"}`}
        >
          {t("fid.link")}
        </Link>
      </div>
    </div>
  );
}
