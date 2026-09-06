/* The site's top-level destinations — the ones the main nav lists.
   Shared rather than repeated so the page curtain, which only runs between
   these, cannot drift from what the header actually offers. */

export const NAV = [
  { k: "home", href: "/" },
  { k: "store", href: "/catalogue" },
  { k: "configurateur", href: "/configurateur" },
  { k: "contact", href: "/contact" },
] as const;

export const PRINCIPAL_PATHS: ReadonlySet<string> = new Set(NAV.map((n) => n.href));
