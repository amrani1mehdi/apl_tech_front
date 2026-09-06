/* The locale primitives, kept apart from the phrasebook in lib/i18n.ts.

   proxy.ts needs the locale list to route, and Next's docs are explicit that
   the proxy should not lean on shared modules — it can be deployed to a CDN
   on its own. Importing lib/i18n there would drag several hundred lines of
   translations into that bundle for the sake of three strings, so the three
   strings live here and both sides import this. */

export type Locale = "fr" | "ar" | "en";

export const LOCALES: Locale[] = ["fr", "ar", "en"];

/* French is the site's main language: the one an unmarked request lands in.
   It still carries its segment (/fr/catalogue, never /catalogue) — one shape
   for all three keeps links, canonical URLs and the switch free of special
   cases. */
export const DEFAULT_LOCALE: Locale = "fr";

/** written by the language switch, read by the proxy on an unmarked request */
export const LOCALE_COOKIE = "apltech-locale";

export const isLocale = (v: string | undefined): v is Locale =>
  !!v && (LOCALES as readonly string[]).includes(v);

export const dirOf = (l: Locale): "rtl" | "ltr" => (l === "ar" ? "rtl" : "ltr");

/** the locale a pathname carries, and the path underneath it */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, head, ...rest] = pathname.split("/");
  if (!isLocale(head)) return { locale: DEFAULT_LOCALE, path: pathname };
  const path = "/" + rest.join("/");
  return { locale: head, path: path === "/" ? "/" : path.replace(/\/$/, "") };
}

/** "/catalogue" under "ar" -> "/ar/catalogue". Idempotent: a path that already
    carries a locale is re-pointed rather than prefixed twice. */
export function withLocale(pathname: string, locale: Locale): string {
  const { path } = splitLocale(pathname);
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
