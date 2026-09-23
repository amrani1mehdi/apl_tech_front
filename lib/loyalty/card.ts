/**
 * The card itself — MODULE 8, FID-01 to FID-04.
 *
 * Points earned are not stored. They are read back from the orders every
 * time, which is what keeps FID-02 honest: an order earns at the moment it is
 * marked delivered, and an order that comes back is an order that no longer
 * says "delivered", so the points go with it. A stored counter would have to
 * be corrected by hand at every return, and a counter that can drift from the
 * orders behind it is a counter customers will eventually be arguing about.
 *
 * What *is* stored is the spending — the coupons bought, in `wallet.ts` —
 * because nothing else records that it happened.
 *
 *   cumulative = earned − withdrawn     the tier reads this, and spending
 *                                       never touches it (FID-03)
 *   balance    = cumulative − spent     the coupon shop reads this (FID-05)
 *
 * ⚠ FRONT-END STAND-IN, inherited from the two files it reads: the orders are
 * this browser's plus the demo ones (`lib/checkout/tracking.ts`), and the
 * wallet is this browser's. The server will compute the same two numbers from
 * the order table and a points ledger; `cardOf` is then a request, and the
 * screens that read it do not change.
 */

import type { Account } from "@/lib/auth/accounts";
import { ordersForPhone, type TrackedOrder } from "@/lib/checkout/tracking";
import { couponById, pointsForOrder, tierOf, tierReaches, type Tier } from "./program";
import { couponsOf, mint, type OwnedCoupon } from "./wallet";

/**
 * A line of the history — FID-04.
 *
 * `points` is always positive; the kind says which way it went. A "revoke" is
 * a delivered order that was later returned, and it keeps the earn that came
 * before it rather than erasing it, so the history reads as what happened.
 */
export type EntryKind = "earn" | "revoke" | "spend";

export type Entry = {
  id: string;
  kind: EntryKind;
  at: number;
  points: number;
  /** earn and revoke — the order it came from */
  order?: string;
  /** spend — the shelf row it was spent on */
  couponId?: string;
};

export type Card = {
  tier: Tier;
  /** everything ever earned, less anything returned — what the tier reads */
  lifetime: number;
  /** what is left to spend */
  balance: number;
  spent: number;
  /** newest first */
  entries: Entry[];
  coupons: readonly OwnedCoupon[];
};

/* ── what the orders say — FID-01, FID-02 ───────────────────────────────── */

function entriesFor(orders: TrackedOrder[]): Entry[] {
  const entries: Entry[] = [];

  for (const order of orders) {
    const points = pointsForOrder(order.draft);
    if (points <= 0) continue;

    /* Credited on delivery, and only on delivery: an order still on the road
       has earned nothing yet. */
    const credited = order.history.delivered;
    if (!credited) continue;
    entries.push({ id: `earn-${order.number}`, kind: "earn", at: credited, points, order: order.number });

    /* Delivered, then off the road again — returned. The points that were
       credited come back out. */
    if (order.status === "cancelled") {
      const at = order.history.cancelled ?? credited;
      entries.push({ id: `revoke-${order.number}`, kind: "revoke", at, points, order: order.number });
    }
  }

  return entries;
}

function entriesForCoupons(coupons: readonly OwnedCoupon[]): Entry[] {
  return coupons.map((c) => ({
    id: `spend-${c.code}`,
    kind: "spend" as const,
    at: c.boughtAt,
    points: c.cost,
    couponId: c.couponId,
  }));
}

/** The whole card for one customer. Orders are found by phone, the way the
    account page finds them — orders are placed without an account, so the
    phone is what the two have in common. */
export function cardOf(account: Account, now = Date.now()): Card {
  const coupons = couponsOf(account.id);
  const entries = [...entriesFor(ordersForPhone(account.phone, now)), ...entriesForCoupons(coupons)].sort(
    (a, b) => b.at - a.at,
  );

  const sum = (kind: EntryKind) => entries.reduce((n, e) => (e.kind === kind ? n + e.points : n), 0);
  const lifetime = sum("earn") - sum("revoke");
  const spent = sum("spend");

  return { tier: tierOf(lifetime), lifetime, balance: lifetime - spent, spent, entries, coupons };
}

/* ── buying a coupon — FID-05 ───────────────────────────────────────────── */

export type BuyResult =
  | { ok: true; owned: OwnedCoupon }
  | { ok: false; reason: "unknown" | "tier" | "points" };

/**
 * Spending points on a coupon.
 *
 * The balance is read *after* the wait, not before it: the shop shows what a
 * coupon costs and what the customer holds, but the moment between pressing
 * the button and the answer is exactly when another tab could have spent the
 * same points. The server will re-check the same way, for better reasons.
 *
 * ⚠ FRONT-END STAND-IN — see the note at the top of `wallet.ts`.
 */
export async function buyCoupon(account: Account, couponId: string): Promise<BuyResult> {
  await new Promise((r) => setTimeout(r, 700));

  const coupon = couponById(couponId);
  if (!coupon) return { ok: false, reason: "unknown" };

  const card = cardOf(account);
  if (!tierReaches(card.tier.key, coupon.tier)) return { ok: false, reason: "tier" };
  if (card.balance < coupon.cost) return { ok: false, reason: "points" };

  return { ok: true, owned: mint(account.id, coupon) };
}
