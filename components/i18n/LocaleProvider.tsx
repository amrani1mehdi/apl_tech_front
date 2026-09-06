"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const search = useSearchParams();

  /* Changing language is a navigation: same page, different locale segment.
     The cookie is only so an unmarked request (someone typing the bare domain,
     or a bookmark from before) can be returned to this choice — see proxy.ts. */
  const setLocale = useCallback(
    (l: Locale) => {
      try {
        document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`;
      } catch {
        /* storage blocked — the URL still carries the choice for this visit */
      }
      const query = search.toString();
      router.push(withLocale(pathname, l) + (query ? `?${query}` : ""));
    },
    [router, pathname, search],
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
