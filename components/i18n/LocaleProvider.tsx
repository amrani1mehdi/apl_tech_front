"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { translate, dirOf, withLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
};

const LocaleCtx = createContext<Ctx | null>(null);

export function useLocale() {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/* The locale is the URL's, handed down from the layout that read the segment —
   not state this component owns. That is the point of putting it in the path:
   there is one source of truth, it survives a reload and a shared link, and
   the server renders the right language on the first paint instead of
   correcting itself once localStorage arrives. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  /* Changing language is a navigation: same page, different locale segment.
     The cookie is only so an unmarked request (someone typing the bare domain,
     or a bookmark from before) can be returned to this choice — see proxy.ts.

     The query string is read here rather than through useSearchParams. That
     hook makes every client component above the nearest Suspense boundary
     render on the client, and this provider wraps the whole app — there is no
     boundary above it, so it would opt the entire site out of prerendering
     (and fails the production build outright). Nothing needs the query while
     rendering; only this handler does, it only ever runs from a click, and
     location.search is exactly as current there. */
  const setLocale = useCallback(
    (l: Locale) => {
      try {
        document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`;
      } catch {
        /* storage blocked — the URL still carries the choice for this visit */
      }
      router.push(withLocale(pathname, l) + window.location.search);
    },
    [router, pathname],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => translate(key, locale),
      dir: dirOf(locale),
    }),
    [locale, setLocale],
  );

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}
