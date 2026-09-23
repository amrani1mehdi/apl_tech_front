/**
 * Browsing the coupon shelf — MODULE 8, FID-05.
 *
 * The same shape as `lib/catalogue.ts`, and for the same reason: the page
 * holds the filters, this holds what they mean, and the two can be reasoned
 * about apart. A coupon is a thing on a shelf with a price in points, so it
 * is filtered and sorted like anything else in the store.
 */

import type { PromoKind } from "@/lib/checkout/promo";
import type { Card } from "./card";
import { COUPONS, tierReaches, type Coupon, type TierKey } from "./program";

/** The rail above the grid: the three kinds of discount, and everything. */
export type KindFilter = "all" | PromoKind;
export const KINDS: readonly KindFilter[] = ["all", "shipping", "fixed", "percent"] as const;

/**
 * What a customer can do with a coupon right now.
 *
 * "unlocked" is a tier question and "affordable" is a balance question, and
 * they are genuinely different: Or coupons stay out of reach for a Bronze
 * customer however many points they hold, and a coupon on your own shelf can
 * still cost more than you have.
 */
export type Availability = "all" | "unlocked" | "affordable";

export type ShopFilters = {
  kind: KindFilter;
  /** empty means every tier — the same "no filter is no constraint" the
      catalogue's brand list uses */
  tiers: TierKey[];
  cost: { min: number; max: number };
  avail: Availability;
};

export type ShopSort = "tier" | "asc" | "desc";
export const SORTS: readonly ShopSort[] = ["tier", "asc", "desc"] as const;

/** The cheapest and dearest coupon on the shelf — the slider's ends. */
export function costBounds(): { min: number; max: number } {
  const costs = COUPONS.map((c) => c.cost);
  return { min: Math.min(...costs), max: Math.max(...costs) };
}

export const noFilters = (): ShopFilters => ({
  kind: "all",
  tiers: [],
  cost: costBounds(),
  avail: "all",
});

/** How many constraints are actually narrowing the shelf — what the "Filtres"
    badge counts, and what "Réinitialiser" has to undo. */
export function activeFilterCount(f: ShopFilters): number {
  const bounds = costBounds();
  let n = 0;
  if (f.kind !== "all") n++;
  if (f.tiers.length > 0) n++;
  if (f.cost.min > bounds.min || f.cost.max < bounds.max) n++;
  if (f.avail !== "all") n++;
  return n;
}

const tierOrder: Record<TierKey, number> = { bronze: 0, silver: 1, gold: 2 };

/**
 * The shelf as the page shows it.
 *
 * The card is passed in because two of the filters are about the customer
 * rather than the coupon — what they have reached, and what they can pay for.
 */
export function selectCoupons(f: ShopFilters, sort: ShopSort, card: Card): Coupon[] {
  const picked = COUPONS.filter((c) => {
    if (f.kind !== "all" && c.grant.kind !== f.kind) return false;
    if (f.tiers.length > 0 && !f.tiers.includes(c.tier)) return false;
    if (c.cost < f.cost.min || c.cost > f.cost.max) return false;

    const unlocked = tierReaches(card.tier.key, c.tier);
    if (f.avail === "unlocked" && !unlocked) return false;
    if (f.avail === "affordable" && (!unlocked || c.cost > card.balance)) return false;
    return true;
  });

  /* Sorted by tier then by cost, which is the shelf climbing — the order the
     programme itself is in, and the one a customer reading down the page
     expects. The other two are the plain price sorts. */
  return picked.sort((a, b) =>
    sort === "asc"
      ? a.cost - b.cost
      : sort === "desc"
        ? b.cost - a.cost
        : tierOrder[a.tier] - tierOrder[b.tier] || a.cost - b.cost,
  );
}
