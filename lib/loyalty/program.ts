/**
 * The loyalty programme's rules — MODULE 8.
 *
 * Two counters, never one. **Cumulative points** are everything the customer
 * has ever earned: they decide the tier and are not touched by spending.
 * The **balance** is what is left to spend in the coupon shop. Buying a
 * coupon takes from the balance alone — a customer who cashes in every point
 * stays Or, because the tier is a record of what they bought from us, not of
 * what they are holding.
 *
 * ⚠ ADMIN-SET, STAND-IN VALUES. The thresholds, the shelf of coupons and the
 * points a product carries are all set from the back-office (FID-08 → FID-11).
 * Until that exists they live here, in the shapes the admin screens will
 * write: thresholds as a list, coupons as rows, product points as a field on
 * the product with a rule to fall back on. Nothing that reads them changes
 * when the values start coming from the server.
 */

import type { Promo } from "@/lib/checkout/promo";
import type { OrderDraft } from "@/lib/checkout/order";
import { getProduct, type Product } from "@/lib/products";

/* ── the tiers — FID-03 ─────────────────────────────────────────────────── */

export type TierKey = "bronze" | "silver" | "gold";

/** `from` is the cumulative points the tier starts at. */
export type Tier = { key: TierKey; from: number };

/**
 * ⚠ ADMIN-SET — the énoncé's example scale, 1 000 / 3 000.
 *
 * Bronze starts at zero rather than at a threshold of its own: every signed-in
 * customer holds a card from their first visit, and a card that says "no tier
 * yet" is a card nobody carries. The climb is what the thresholds are for.
 */
export const TIERS: readonly Tier[] = [
  { key: "bronze", from: 0 },
  { key: "silver", from: 1_000 },
  { key: "gold", from: 3_000 },
] as const;

/** The tier a cumulative total sits in — the last one it has reached. */
export function tierOf(lifetime: number): Tier {
  let tier = TIERS[0];
  for (const t of TIERS) if (lifetime >= t.from) tier = t;
  return tier;
}

/** The one after it, or null at the top. */
export function nextTier(lifetime: number): Tier | null {
  return TIERS.find((t) => lifetime < t.from) ?? null;
}

/** How far along the current tier the customer is, 0 → 1. Full at the top,
    where there is nothing left to climb. */
export function tierProgress(lifetime: number): number {
  const here = tierOf(lifetime);
  const next = nextTier(lifetime);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (lifetime - here.from) / (next.from - here.from)));
}

/** Whether a tier can reach a coupon's shelf — Or sees everything Bronze
    sees, so this is a floor and not an equality. */
export function tierReaches(tier: TierKey, required: TierKey): boolean {
  return TIERS.findIndex((t) => t.key === tier) >= TIERS.findIndex((t) => t.key === required);
}

/* ── what a product earns — FID-01 ──────────────────────────────────────── */

/**
 * ⚠ ADMIN-SET fallback. FID-10 puts the points on the product itself, so
 * `product.points` wins wherever the admin has set it. The rule below is what
 * a product with nothing set earns, so the programme works across the whole
 * catalogue from the first day instead of only on the rows someone got to.
 */
/**
 * One point per 100 DA spent, which is what makes the rest of the numbers
 * mean anything: a 38 000 DA drive earns 380 points, Argent lands at about
 * 100 000 DA of lifetime orders and Or at 300 000 DA, and the shelf below
 * gives roughly 2–3 % of spending back. Ten times stingier and no customer
 * would ever see the second tier; ten times looser and the first order buys
 * the best coupon on the shelf.
 */
export const DA_PER_POINT = 100;

export function pointsOf(product: Product): number {
  return product.points ?? Math.floor(product.price / DA_PER_POINT);
}

/**
 * What one order line earns.
 *
 * The price paid is the fallback's input when the product has left the
 * catalogue — an order from last season still has to be worth what it was
 * worth, and a line whose slug no longer resolves would otherwise earn zero.
 */
export function pointsForLine(slug: string, unitPrice: number, qty: number): number {
  const product = getProduct(slug);
  const each = product ? pointsOf(product) : Math.floor(unitPrice / DA_PER_POINT);
  return each * qty;
}

/** An order's points — the sum of its lines, as FID-01 says. Delivery and
    discounts earn nothing: points are for the goods. */
export function pointsForOrder(draft: OrderDraft): number {
  return draft.lines.reduce((sum, l) => sum + pointsForLine(l.slug, l.unitPrice, l.qty), 0);
}

/* ── the shelf — FID-05 ─────────────────────────────────────────────────── */

/**
 * A coupon as the shop offers it: what it costs in points, which tier may buy
 * it, and the discount it becomes once bought.
 *
 * `grant` is a promo without its code, because the code is minted per
 * purchase — two customers buying the same coupon get two codes, and a code
 * that has been used cannot be used again by the person it was sold to.
 */
export type Coupon = {
  id: string;
  cost: number;
  /** the minimum tier — a customer below it is not shown the coupon */
  tier: TierKey;
  /** how long the bought coupon lasts, in days */
  validDays: number;
  grant: Omit<Promo, "code">;
};

/**
 * ⚠ ADMIN-SET — the shelf the back-office will edit (FID-11).
 *
 * Four to a tier, and deliberately not four of the same thing: each shelf
 * carries free delivery or a small fixed sum to spend quickly, a percentage
 * for a large basket, and a bigger fixed sum that asks for one. A shelf of
 * four near-identical discounts is a shelf nobody has to think about — and
 * thinking about it is how a customer finds the one that fits the order they
 * were already planning.
 *
 * Costs run at roughly 2–3 % of the spending that earns them, rising a little
 * with the tier, which is what makes climbing worth anything.
 */
export const COUPONS: readonly Coupon[] = [
  /* ── bronze ── */
  {
    id: "delivery",
    cost: 250,
    tier: "bronze",
    validDays: 60,
    grant: { kind: "shipping", value: 0 },
  },
  {
    id: "da1000",
    cost: 400,
    tier: "bronze",
    validDays: 60,
    grant: { kind: "fixed", value: 1_000, minSubtotal: 15_000 },
  },
  {
    id: "pct3",
    cost: 550,
    tier: "bronze",
    validDays: 45,
    grant: { kind: "percent", value: 3, maxDiscount: 4_000 },
  },
  {
    id: "da2000",
    cost: 700,
    tier: "bronze",
    validDays: 60,
    grant: { kind: "fixed", value: 2_000, minSubtotal: 25_000 },
  },

  /* ── argent ── */
  {
    id: "da3000",
    cost: 1_000,
    tier: "silver",
    validDays: 60,
    grant: { kind: "fixed", value: 3_000, minSubtotal: 40_000 },
  },
  {
    id: "pct5",
    cost: 1_400,
    tier: "silver",
    validDays: 45,
    grant: { kind: "percent", value: 5, maxDiscount: 8_000 },
  },
  {
    id: "da5000",
    cost: 1_800,
    tier: "silver",
    validDays: 60,
    grant: { kind: "fixed", value: 5_000, minSubtotal: 60_000 },
  },
  {
    id: "pct8",
    cost: 2_200,
    tier: "silver",
    validDays: 45,
    grant: { kind: "percent", value: 8, maxDiscount: 12_000 },
  },

  /* ── or ── */
  {
    id: "pct10",
    cost: 2_600,
    tier: "gold",
    validDays: 45,
    grant: { kind: "percent", value: 10, maxDiscount: 20_000 },
  },
  {
    id: "da10000",
    cost: 3_500,
    tier: "gold",
    validDays: 30,
    grant: { kind: "fixed", value: 10_000, minSubtotal: 120_000 },
  },
  {
    id: "pct12",
    cost: 4_500,
    tier: "gold",
    validDays: 30,
    grant: { kind: "percent", value: 12, maxDiscount: 30_000 },
  },
  {
    id: "da20000",
    cost: 6_500,
    tier: "gold",
    validDays: 30,
    grant: { kind: "fixed", value: 20_000, minSubtotal: 200_000 },
  },
] as const;

export const couponById = (id: string): Coupon | undefined => COUPONS.find((c) => c.id === id);

/**
 * The code a bought coupon carries.
 *
 * `FID-` in front so a customer reading it back over the phone, and the admin
 * looking it up, can both tell a loyalty coupon from a campaign code at a
 * glance. The tail is random rather than counted: a code that is one more than
 * the last one is a code anyone can guess.
 */
export function mintCouponCode(coupon: Coupon): string {
  const tail = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return `FID-${coupon.id.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${tail.slice(-6)}`;
}
