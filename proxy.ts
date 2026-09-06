import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/locales";

/* Every page lives under a locale segment, so a request without one has to be
   pointed at a locale before it can render.

   French is the fallback — it is the site's main language — but a visitor who
   has already chosen a language is returned to it rather than being marched
   back to French. That choice comes from the cookie the language switch
   writes, not from Accept-Language: a browser set to Arabic is a weak signal
   next to someone having clicked a language on this site. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isLocale(pathname.split("/")[1])) return;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  /* Everything but Next's own assets, route handlers, and anything that looks
     like a file — none of which belongs to a locale. */
  matcher: ["/((?!_next|api|.*\\.[\\w]+$).*)"],
};
