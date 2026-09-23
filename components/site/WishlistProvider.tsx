"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * The favourites list — PRD-13.
 *
 * The spec puts this in the customer's account (CLI-06), and there is no
 * account yet: the store takes orders without a login. So it lives on the
 * device for now, behind the same three calls it will keep afterwards.
 * Replacing `read` and `write` with a fetch is the whole migration — nothing
 * that draws a heart needs to know which one it is talking to.
 *
 * It is read through `useSyncExternalStore` rather than copied into state in
 * an effect, because that is exactly what localStorage is: a store outside
 * React that can change without React being told. Going through the hook
 * gets three things an effect would not — no cascading render on mount, a
 * server snapshot React can hydrate against, and a list that stays in step
 * across two tabs of the same shop.
 */

const KEY = "apl:wishlist";

/* The snapshot has to be referentially stable or the hook re-renders forever,
   so the parsed list is cached and only rebuilt when the raw string changes. */
const EMPTY: string[] = [];
let cachedRaw: string | null = null;
let cached: string[] = EMPTY;

const listeners = new Set<() => void>();

/* TODO(CLI-06): when accounts land these two become a GET and a PUT against
   the signed-in customer. `subscribe` keeps its job either way. */
function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode or blocked storage — treat it as an empty list */
    return EMPTY;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const list: unknown = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : EMPTY;
  } catch {
    /* someone else's JSON in our key */
    cached = EMPTY;
  }
  return cached;
}

function write(slugs: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* the list still holds for this visit */
  }
  // localStorage does not notify the tab that wrote it, so we do
  listeners.forEach((fn) => fn());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // ...and the browser notifies the *other* tabs, which we pass straight on
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The server has no favourites to report, and must say so consistently. */
const readOnServer = () => EMPTY;

type Ctx = {
  slugs: string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
};

const WishCtx = createContext<Ctx | null>(null);

export function useWishlist() {
  const ctx = useContext(WishCtx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const slugs = useSyncExternalStore(subscribe, read, readOnServer);

  const toggle = useCallback((slug: string) => {
    const list = read();
    write(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ slugs, has: (slug: string) => slugs.includes(slug), toggle }),
    [slugs, toggle],
  );

  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}
