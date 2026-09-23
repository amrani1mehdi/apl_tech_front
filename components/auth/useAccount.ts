"use client";

import { useSyncExternalStore } from "react";
import { currentAccount, subscribeAccount, type Account } from "@/lib/auth/accounts";

const never = () => () => {};

/**
 * Who is signed in.
 *
 * `ready` is false for the server render and the first client render — the
 * session is in browser storage, which neither can read — so anything that
 * differs by account can hold its shape until it knows, instead of showing a
 * signed-out header that flips a moment later.
 */
export function useAccount(): { account: Account | null; ready: boolean } {
  const account = useSyncExternalStore(subscribeAccount, currentAccount, () => null);
  const ready = useSyncExternalStore(never, () => true, () => false);
  return { account, ready };
}

/**
 * Where to go after signing in — `?retour=` when it is a path on this site,
 * the account page otherwise. Anything that could leave the site ("//evil",
 * "https://…") is ignored rather than followed.
 */
export function returnPath(raw: string | null, fallback = "/compte"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}

export const initialOf = (account: Pick<Account, "firstName" | "lastName">): string =>
  `${account.firstName.trim().charAt(0)}${account.lastName.trim().charAt(0)}`.toUpperCase();
