"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { promoEffect } from "@/components/checkout/PromoField";
import { formatDay, formatPoints } from "@/components/loyalty/format";
import { couponById } from "@/lib/loyalty/program";
import type { Entry } from "@/lib/loyalty/card";
import { fill } from "@/lib/pcbuilder/engine";

const SHOWN = 6;

/**
 * Where the points came from and where they went — FID-04.
 *
 * Every line says which order or which coupon, because "+240 points" with no
 * name beside it is not something a customer can check. An earn is a link to
 * the order it came from; the tracking page will show the delivery that
 * credited it.
 *
 * A return keeps its earn above it rather than replacing it. Both lines are
 * what happened.
 */
export function PointsHistory({ entries }: { entries: Entry[] }) {
  const { t } = useLocale();
  const [all, setAll] = useState(false);
  const shown = all ? entries : entries.slice(0, SHOWN);

  return (
    <section aria-labelledby="fid-history" className="rounded-3xl border border-line bg-white p-6 lg:sticky lg:top-28">
      <h2 id="fid-history" className="font-display text-lg font-bold text-ink">
        {t("fid.history")}
      </h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-[13.5px] leading-relaxed text-mute">{t("fid.history.empty")}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-line-soft">
            {shown.map((entry) => (
              <li key={entry.id}>
                <EntryRow entry={entry} />
              </li>
            ))}
          </ul>

          {!all && entries.length > SHOWN && (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="mt-4 text-[13px] font-semibold text-accent transition-colors hover:text-accent-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("fid.history.all")}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const { t, locale } = useLocale();

  const earned = entry.kind === "earn";
  const coupon = entry.couponId ? couponById(entry.couponId) : undefined;

  const label =
    entry.kind === "spend"
      ? coupon
        ? `${t("fid.history.spend")} · ${promoEffect(coupon.grant, t, locale)}`
        : t("fid.history.spend")
      : fill(t(`fid.history.${entry.kind}`), { order: entry.order ?? "" });

  const body = (
    <>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          earned ? "bg-accent/[0.08] text-accent" : entry.kind === "revoke" ? "bg-alert/[0.07] text-alert" : "bg-ink/[0.05] text-mute"
        }`}
      >
        {earned ? (
          <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.2} />
        ) : entry.kind === "revoke" ? (
          <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
        ) : (
          <ArrowDownLeft className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.2} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[12px] text-faint">{formatDay(entry.at, locale)}</span>
      </span>

      {/* `dir` isolates the amount the way `formatDA` isolates a price: in
          Arabic the sign would otherwise drift off the number it belongs to. */}
      <span
        dir="ltr"
        className={`shrink-0 text-[13.5px] font-semibold tabular-nums ${earned ? "text-accent" : "text-mute"}`}
      >
        {earned ? "+" : "−"}
        {formatPoints(entry.points, t)}
      </span>
    </>
  );

  /* An earn or a return points at the order behind it; a spend has nowhere
     to go — the coupon it bought is on the list above. */
  return entry.order ? (
    <Link
      href={`/suivi?commande=${encodeURIComponent(entry.order)}`}
      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-cloud"
    >
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 py-3">{body}</div>
  );
}
