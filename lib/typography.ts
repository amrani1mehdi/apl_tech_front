import type { Locale } from "@/lib/locales";

/**
 * French puts a space before ? ! : ; and inside « » — and a line break is
 * allowed at an ordinary space, so a title can end with a lone "?" on the next
 * line. The space becomes a non-breaking one, which is what French typesetting
 * uses there. Other languages are returned untouched.
 */
export function typeset(text: string, locale: Locale): string {
  if (locale !== "fr") return text;
  return text.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
}
