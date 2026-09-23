/* The locale primitives, kept apart from the phrasebook in lib/i18n.ts.

   proxy.ts needs the locale list to route, and Next's docs are explicit that
   the proxy should not lean on shared modules — it can be deployed to a CDN
   on its own. Importing lib/i18n there would drag several hundred lines of
   translations into that bundle for the sake of three strings, so the three
   strings live here and both sides import this. */

export type Locale = "fr" | "ar" | "en";

export const LOCALES: Locale[] = ["fr", "ar", "en"];

/* French is the site's main language, and it is the one locale with no
   segment of its own: the catalogue is /catalogue, not /fr/catalogue. The
   other two keep theirs (/en/catalogue, /ar/catalogue).

   The cost is a special case, and it is paid in exactly two places — the
   `withLocale` below, which writes every link on the site, and proxy.ts,
   which maps a bare path onto the /fr/… route that actually renders it.
   Nothing else in the app knows the difference. */
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

/** "/catalogue" under "ar" -> "/ar/catalogue", and under "fr" -> "/catalogue".
    Idempotent: a path that already carries a locale is re-pointed rather than
    prefixed twice, so switching from Arabic to French strips the segment
    rather than stacking another one on top. */
export function withLocale(pathname: string, locale: Locale): string {
  const { path } = splitLocale(pathname);
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
