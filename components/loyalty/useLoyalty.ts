"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAccount } from "@/components/auth/useAccount";
import { cardOf, type Card } from "@/lib/loyalty/card";
import { couponsOf, subscribeWallet, type OwnedCoupon } from "@/lib/loyalty/wallet";
import type { Account } from "@/lib/auth/accounts";

const NONE: readonly OwnedCoupon[] = Object.freeze([]);
const never = () => () => {};

/**
 * The signed-in customer's loyalty card — MODULE 8.
 *
 * `ready` carries the same meaning as on `useAccount`: false until the session
 * has been read from storage, so a screen can hold its shape instead of
 * showing "sign in to earn points" to someone who is already signed in.
 *
 * The wallet is subscribed to rather than read once: buying a coupon in this
 * tab, or spending one in another, has to move the balance on every screen
 * showing it. Points earned move with the orders, which only the server can
 * change — nothing here has to watch them.
 */
/**
 * Just the coupons in the wallet.
 *
 * The cart asks this rather than `useLoyalty`: it needs to know what the
 * customer can spend here, not what they have earned, and building the whole
 * card would walk the order history on every keystroke in the code field.
 */
export function useOwnedCoupons(): readonly OwnedCoupon[] {
  const { account } = useAccount();

  return useSyncExternalStore(
    account ? subscribeWallet : never,
    () => (account ? couponsOf(account.id) : NONE),
    () => NONE,
  );
}

export function useLoyalty(): { account: Account | null; ready: boolean; card: Card | null } {
  const { account, ready } = useAccount();

  const coupons = useSyncExternalStore(
    account ? subscribeWallet : never,
    () => (account ? couponsOf(account.id) : NONE),
    () => NONE,
  );

  const card = useMemo(() => {
    /* The card is derived from this snapshot — `cardOf` reads the wallet
       itself, so the snapshot is here to say when it is worth reading again. */
    void coupons;
    return account ? cardOf(account) : null;
  }, [account, coupons]);

  return { account, ready, card };
}
