import { fill } from "@/lib/pcbuilder/engine";
import type { Locale } from "@/lib/locales";

/**
 * Points, written out — "1 240 pts".
 *
 * Grouped with `fr-FR` in every language, the way `formatDA` groups prices:
 * the number a customer reads on their card and the number on the price tag
 * should be spaced the same, whichever language the page is in.
 */
export const formatPoints = (n: number, t: (key: string) => string): string =>
  fill(t("fid.pts"), { n: n.toLocaleString("fr-FR") });

const tagOf = (locale: Locale) => (locale === "ar" ? "ar-DZ" : locale === "en" ? "en-GB" : "fr-DZ");

/** A day as the rest of the customer's screens write it — "14 mars". */
export const formatDay = (at: number, locale: Locale): string =>
  new Intl.DateTimeFormat(tagOf(locale), { day: "numeric", month: "long" }).format(at);
