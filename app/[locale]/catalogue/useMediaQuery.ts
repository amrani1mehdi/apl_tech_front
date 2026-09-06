"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches, safe to read while rendering.
 *
 * useSyncExternalStore rather than an effect: it takes a separate snapshot for
 * the server, and React keeps using that one through hydration before
 * re-rendering with the real value. Reading matchMedia directly during render
 * would disagree with the HTML the server sent and tear the tree; setting it
 * from an effect would render one frame of the wrong layout first.
 *
 * The server snapshot is always `false`, so a query written as a min-width
 * makes the small layout the one the server commits to — the safer half to be
 * wrong about, since it is also the one that cannot afford a reflow.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
