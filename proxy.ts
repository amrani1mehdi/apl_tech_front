import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/locales";

/* Every page renders from a locale segment, but only two of the three show
   one. French is the site's main language and sits at the root: /catalogue,
   not /fr/catalogue. English and Arabic keep their prefix.

   That leaves this file with three jobs, in order below: leave a prefixed
   non-default locale alone, retire the old /fr/… addresses, and render a bare
   path from the French route without letting the segment reach the URL bar.

   The last one is a rewrite rather than a redirect, which is the whole point:
   a redirect would put /fr back in the address bar, which is the thing we are
   trying to get rid of. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const head = pathname.split("/")[1];

  // /en/… and /ar/… are already exactly what they claim to be.
  if (isLocale(head) && head !== DEFAULT_LOCALE) return;

  /* /fr/… is now a second address for a page that lives at the bare path.
     Old links, bookmarks and anything already indexed still work, but they
     arrive at one canonical URL rather than serving the same page twice. */
  if (head === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url);
  }

  /* The root is the one place a saved choice still redirects — someone typing
     the bare domain gets the language they last picked.

     It is deliberately only the root. Applying the cookie to every unmarked
     path would mean /catalogue renders English for anyone who once clicked
     EN, which makes the French URLs unreachable and makes a shared link show
     a different language to each person who opens it. A bare path is French,
     for everyone, always. */
  if (pathname === "/") {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(saved) && saved !== DEFAULT_LOCALE) {
      const url = request.nextUrl.clone();
      url.pathname = `/${saved}`;
      return NextResponse.redirect(url);
    }
  }

  // Everything else unmarked is French, rendered from the /fr/… route while
  // the address bar keeps the clean path.
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  /* Everything but Next's own assets, route handlers, and anything that looks
     like a file — none of which belongs to a locale. */
  matcher: ["/((?!_next|api|.*\\.[\\w]+$).*)"],
};
