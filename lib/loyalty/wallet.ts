/**
 * The coupons a customer owns — MODULE 8, FID-05 and FID-06.
 *
 * Bought with points, kept against the account, spent at the cart like any
 * other code. That last part is the whole design: a loyalty coupon *is* a
 * promo code, so `checkPromo` finds it, the order summary discounts it and
 * the checkout sends it, with nothing along that path knowing where the code
 * came from.
 *
 * ⚠ FRONT-END STAND-IN, and a thinner one than most. Real coupons are minted
 * and burned on the server, which is the only place that can stop the same
 * code being spent twice; here they sit in this browser's storage, next to the
 * accounts (see `lib/auth/accounts.ts`), and anything in the page can rewrite
 * them. The functions below already answer in the shapes the pages expect.
 *
 * This file deliberately knows nothing about orders — the points *earned*
 * side of the card lives in `card.ts`, which reads this one. Keeping the
 * coupon lookup free of the order history is what lets `lib/checkout/promo.ts`
 * call into it without the two importing each other in a circle.
 */

import type { Promo } from "@/lib/checkout/promo";
import { currentAccount } from "@/lib/auth/accounts";
import { couponById, mintCouponCode, type Coupon } from "./program";

/** A coupon after it has been bought. */
export type OwnedCoupon = {
  /** the minted code — what gets typed into the cart */
  code: string;
  couponId: string;
  /** what it cost, kept here so the history survives the shelf being repriced */
  cost: number;
  boughtAt: number;
  expiresAt: number;
  /** set when an order was placed with it; a coupon is good once */
  usedAt?: number;
  usedOn?: string;
};

export type CouponState = "active" | "used" | "expired";

/**
 * The last day the coupon works, as `checkPromo` reads dates — an ISO day,
 * inclusive.
 *
 * Expiry is a day and not an instant so that the wallet and the cart agree.
 * A coupon bought at 22:00 and given "30 days" to the millisecond would stop
 * working mid-morning on its last day, and the screen saying "expires the
 * 14th" would be wrong by the only measure the customer has.
 */
export const expiryDay = (owned: OwnedCoupon): string => new Date(owned.expiresAt).toISOString().slice(0, 10);

export function stateOf(owned: OwnedCoupon, now = Date.now()): CouponState {
  if (owned.usedAt) return "used";
  return new Date(now).toISOString().slice(0, 10) > expiryDay(owned) ? "expired" : "active";
}

/* ── storage ────────────────────────────────────────────────────────────── */

const KEY = "apltech-loyalty";
const EVENT = "apltech-loyalty";
const DAY = 86_400_000;

/** Keyed by account: two people signing in on the same machine do not share a
    wallet, the same way they do not share an order list. */
type Store = Record<string, { coupons: OwnedCoupon[] }>;

const local = () => (typeof localStorage === "undefined" ? undefined : localStorage);

/* The raw string is cached so an unchanged wallet is the same object every
   time: `useSyncExternalStore` re-renders on every new object it is given, and
   a fresh parse on each read would never stop re-rendering. */
let cachedRaw: string | null | undefined;
let cached: Store = {};

function readStore(): Store {
  let raw: string | null = null;
  try {
    raw = local()?.getItem(KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cached = parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    cached = {};
  }
  return cached;
}

function writeStore(next: Store) {
  try {
    local()?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the purchase is lost on reload, and the screen that
       asked for it still shows what happened */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/* One empty array for every wallet that has none, rather than a fresh `[]`
   per call: this is a `useSyncExternalStore` snapshot, and a new object every
   read is a re-render every read — which React stops by throwing. */
const EMPTY: readonly OwnedCoupon[] = Object.freeze([]);

/** The wallet as a snapshot React can subscribe to. */
export function couponsOf(accountId: string): readonly OwnedCoupon[] {
  return readStore()[accountId]?.coupons ?? EMPTY;
}

export function subscribeWallet(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  /* another tab buying or spending one */
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Adds a bought coupon to the wallet and returns it. Called by `buyCoupon`
    in `card.ts`, which is where the balance is known and checked. */
export function mint(accountId: string, coupon: Coupon, now = Date.now()): OwnedCoupon {
  const owned: OwnedCoupon = {
    code: mintCouponCode(coupon),
    couponId: coupon.id,
    cost: coupon.cost,
    boughtAt: now,
    expiresAt: now + coupon.validDays * DAY,
  };
  const store = readStore();
  writeStore({ ...store, [accountId]: { coupons: [owned, ...(store[accountId]?.coupons ?? [])] } });
  return owned;
}

/* ── spending one — FID-06 ──────────────────────────────────────────────── */

/** The promo a bought coupon carries, or null if the shelf no longer has the
    row it was bought from. Its expiry travels with it, so an out-of-date
    coupon is refused by the ordinary rule rather than a second one. */
export function promoOf(owned: OwnedCoupon): Promo | null {
  const coupon = couponById(owned.couponId);
  return coupon ? { ...coupon.grant, code: owned.code, expires: expiryDay(owned) } : null;
}

export type LoyaltyMatch = { promo: Promo; owned: OwnedCoupon; state: CouponState };

/**
 * A code, looked up among the signed-in customer's coupons — what
 * `checkPromo` asks before it decides a code is unknown.
 *
 * Signed out, every loyalty code is unknown, which is FID-07 at the one place
 * it matters most: a code read off someone else's screen does nothing.
 */
export function findOwnedCoupon(code: string, now = Date.now()): LoyaltyMatch | null {
  const account = currentAccount();
  if (!account) return null;

  const owned = couponsOf(account.id).find((c) => c.code === code);
  if (!owned) return null;

  const promo = promoOf(owned);
  return promo ? { promo, owned, state: stateOf(owned, now) } : null;
}

/**
 * Burns the coupon an order was placed with — the checkout calls this once
 * the order is away, for whatever code was applied. A campaign code is not
 * in the wallet, so this quietly does nothing, and the caller does not have
 * to know which kind it had.
 */
export function redeemCoupon(code: string | null, orderNumber: string, now = Date.now()) {
  if (!code) return;
  const account = currentAccount();
  if (!account) return;

  const coupons = couponsOf(account.id);
  if (!coupons.some((c) => c.code === code && !c.usedAt)) return;

  const store = readStore();
  writeStore({
    ...store,
    [account.id]: {
      coupons: coupons.map((c) => (c.code === code ? { ...c, usedAt: now, usedOn: orderNumber } : c)),
    },
  });
}
