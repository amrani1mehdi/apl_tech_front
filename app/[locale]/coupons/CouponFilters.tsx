"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatPoints } from "@/components/loyalty/format";
import { PriceSlider } from "@/app/[locale]/catalogue/PriceSlider";
import { TIERS, type TierKey } from "@/lib/loyalty/program";
import { costBounds, type Availability, type ShopFilters } from "@/lib/loyalty/shop";

const AVAILABILITY: Availability[] = ["all", "unlocked", "affordable"];

/**
 * The shelf's filters — the same three questions the catalogue's panel asks,
 * in the terms this shelf has: which tier it belongs to, what it costs, and
 * whether the customer can actually take it today.
 *
 * The slider is the catalogue's own: a coupon's cost in points is a price
 * like any other, and a second implementation of a two-handled range would
 * be two to keep working.
 */
export function CouponFilters({
  state,
  patch,
  idPrefix,
}: {
  state: ShopFilters;
  patch: (next: Partial<ShopFilters>) => void;
  idPrefix: string;
}) {
  const { t } = useLocale();
  const bounds = costBounds();

  const toggleTier = (key: TierKey) =>
    patch({ tiers: state.tiers.includes(key) ? state.tiers.filter((k) => k !== key) : [...state.tiers, key] });

  return (
    <div className="space-y-6">
      {/* ── tier ── */}
      <fieldset>
        <legend className="font-sans text-[10px] font-semibold uppercase text-faint">{t("fid.filter.tier")}</legend>
        <div className="mt-3 space-y-2">
          {TIERS.map((tier) => {
            const id = `${idPrefix}-tier-${tier.key}`;
            const on = state.tiers.includes(tier.key);
            return (
              <label key={tier.key} htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleTier(tier.key)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span className={`tier-${tier.key} rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold`}>
                  {t(`fid.tier.${tier.key}`)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ── cost ── */}
      <fieldset className="border-t border-line-soft pt-5">
        <legend className="font-sans text-[10px] font-semibold uppercase text-faint">{t("fid.filter.cost")}</legend>
        <div className="mt-3">
          <PriceSlider
            bounds={bounds}
            value={state.cost}
            step={50}
            onChange={(cost) => patch({ cost })}
            minLabel={t("cata.min")}
            maxLabel={t("cata.max")}
            unit={t("fid.pts.unit")}
          />
        </div>
        <p className="mt-2 text-[12px] tabular-nums text-mute">
          {formatPoints(state.cost.min, t)} — {formatPoints(state.cost.max, t)}
        </p>
      </fieldset>

      {/* ── what the customer can take today ── */}
      <fieldset className="border-t border-line-soft pt-5">
        <legend className="font-sans text-[10px] font-semibold uppercase text-faint">{t("fid.filter.avail")}</legend>
        <div className="mt-3 space-y-2">
          {AVAILABILITY.map((value) => {
            const id = `${idPrefix}-avail-${value}`;
            return (
              <label key={value} htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
                <input
                  id={id}
                  type="radio"
                  name={`${idPrefix}-avail`}
                  checked={state.avail === value}
                  onChange={() => patch({ avail: value })}
                  className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                {t(`fid.avail.${value}`)}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
