/**
 * Promo codes — MODULE 5, PAN-02.
 *
 * ⚠ DUMMY CODES. The four below exist to exercise every state the field has
 * to draw — a fixed discount with a minimum, a capped percentage, free
 * delivery, and an expired code. Real codes will be created by the admin and
 * checked on the server.
 *
 * That is why `validatePromoCode` is async although nothing here waits on
 * anything: the field already awaits it, so moving the check to the server
 * later changes this function's body and nothing that calls it.
 *
 * Whatever the server decides, a discount shown here is never trusted when an
 * order is placed — the server re-checks the code against the order it
 * receives, the same way it re-prices the lines.
 */

import { findOwnedCoupon } from "@/lib/loyalty/wallet";

export type PromoKind = "percent" | "fixed" | "shipping";

export type Promo = {
  code: string;
  kind: PromoKind;
  /** percent: 0–100 · fixed: DA · shipping: unused */
  value: number;
  /** the order, after nothing else, has to reach this — DA */
  minSubtotal?: number;
  /** percent codes only — the most the code can take off, DA */
  maxDiscount?: number;
  /** ISO date, inclusive */
  expires?: string;
};

/** ⚠ DUMMY — see the note at the top of this file. */
const CODES: Promo[] = [
  { code: "BIENVENUE", kind: "fixed", value: 2_000, minSubtotal: 20_000 },
  { code: "APL10", kind: "percent", value: 10, maxDiscount: 15_000 },
  { code: "LIVRAISON", kind: "shipping", value: 0 },
  { code: "GAMER24", kind: "percent", value: 15, expires: "2024-12-31" },
];

/** Codes are typed by people on phones: case, stray spaces and a pasted
    trailing newline are not a different code. */
export const normalizeCode = (input: string): string => input.replace(/\s+/g, "").toUpperCase();

export type PromoCheck =
  | { ok: true; promo: Promo }
  | { ok: false; reason: "empty" | "unknown" | "expired" | "used" }
  | { ok: false; reason: "min"; promo: Promo; min: number };

/**
 * The rules, synchronously — what the order summary re-runs every time the
 * cart changes, so a code whose minimum is no longer met stops applying.
 *
 * Two shelves are searched: the campaign codes above, and the loyalty coupons
 * the signed-in customer has bought with their points (MODULE 8, FID-06).
 * Both arrive here as a `Promo`, so everything downstream — the discount, the
 * summary, the order — treats them identically. A loyalty coupon is good once,
 * which is the only rule a campaign code does not have.
 */
export function checkPromo(input: string, subtotal: number, today = new Date()): PromoCheck {
  const code = normalizeCode(input);
  if (!code) return { ok: false, reason: "empty" };

  const owned = findOwnedCoupon(code, today.getTime());
  const promo = CODES.find((p) => p.code === code) ?? owned?.promo;
  if (!promo) return { ok: false, reason: "unknown" };

  if (owned?.state === "used") return { ok: false, reason: "used" };

  if (promo.expires && today.toISOString().slice(0, 10) > promo.expires) {
    return { ok: false, reason: "expired" };
  }
  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return { ok: false, reason: "min", promo, min: promo.minSubtotal };
  }
  return { ok: true, promo };
}

/** Pressing "Appliquer". See the note at the top for why this is async. */
export async function validatePromoCode(input: string, subtotal: number): Promise<PromoCheck> {
  return checkPromo(input, subtotal);
}

/** What the code takes off the goods, in DA. Delivery codes take nothing off
    the goods — they waive the delivery line instead. */
export function discountOf(promo: Promo, subtotal: number): number {
  if (promo.kind === "fixed") return Math.min(promo.value, subtotal);
  if (promo.kind === "percent") {
    const raw = Math.floor((subtotal * promo.value) / 100);
    return Math.min(raw, promo.maxDiscount ?? raw);
  }
  return 0;
}
