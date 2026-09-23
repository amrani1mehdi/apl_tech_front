/**
 * Getting a finished configuration out of the browser — PCB-13, 14, 15.
 *
 * Four exits, and they exist because a build is rarely decided by the person
 * looking at the screen. It gets sent to a friend who knows about hardware, to
 * a parent who is paying, or to the shop to check a price. So: a printable
 * sheet, a text recap, a WhatsApp hand-off, and a link that reconstructs the
 * exact machine on someone else's phone.
 *
 * The link is the one that carries the most weight. It encodes the eight bay
 * slugs, the peripherals chosen around them, and nothing else — no prices, no
 * totals, no frame rates. Everything else is
 * recomputed by the receiving browser from the live catalogue, so a
 * configuration shared last week and opened today is priced today, and a part
 * that has since gone out of stock says so. A link that carried its own prices
 * would quietly become a lie the moment anything moved.
 */

import {
  PART_KINDS,
  lines,
  normalizeBuild,
  partOf,
  maxInBay,
  type Build,
  type PartKind,
} from "./parts";
import { EXTRA_KINDS, extraKindOf, extrasList, type ExtraKind, type Extras } from "./extras";

/* ── links: PCB-15 ───────────────────────────────────────────────────────── */

/** The query parameter a shared configuration travels in. */
export const BUILD_PARAM = "build";
/** And the one the setup around it travels in — PCB-04. Separate rather than
    appended to the same list, so a link written before peripherals existed
    still parses to exactly the machine it named. */
export const EXTRAS_PARAM = "extras";

/** Slugs in bay order. `~` separates because no slug contains one, and it
    survives a URL without being percent-escaped into noise.

    Inside a bay, `_` separates products and `*n` gives a quantity:
    `vengeance-32go-ddr5-6000*2_fury-beast-16go-ddr5-5600`. Neither character
    appears in a slug, both pass `URLSearchParams` and `encodeURIComponent`
    untouched, and a bay holding one part is written exactly as it was before
    bays were lists — so every link shared before this still parses. */
export function buildParam(build: Build): string {
  return PART_KINDS.map((kind) =>
    lines(build, kind)
      .map(({ slug, qty }) => (qty > 1 ? `${slug}*${qty}` : slug))
      .join("_"),
  ).join("~");
}

/** The same encoding for the nine optional slots. Mostly empty in practice,
    which is why the caller leaves the parameter off a link entirely when
    nothing is chosen rather than sending eight tildes. */
export function extrasParam(extras: Extras): string {
  return EXTRA_KINDS.map((kind) => extras[kind] ?? "").join("~");
}

/**
 * A build from a shared link.
 *
 * Every slug is checked against the catalogue on the way in. A link naming a
 * product that has since been delisted loses that bay and keeps the rest,
 * which leaves the recipient with a nearly-complete machine and one empty slot
 * to fill — a better outcome than an error page, and the compatibility engine
 * will rule on whatever they put there.
 */
export function parseBuildParam(value: string | null): Build {
  if (!value) return {};
  const bays = value.split("~");
  const out: Build = {};

  PART_KINDS.forEach((kind, i) => {
    /* A hand-edited `*9999` is not a machine anybody can order, and building a
       ten-thousand-entry list to find that out would be the page's own fault.
       Capped at the most a bay takes — the same ceiling the stepper has. */
    const cap = maxInBay(kind);
    const slugs: string[] = [];

    for (const item of (bays[i] ?? "").split("_")) {
      const [slug, count] = item.split("*");
      if (!slug || partOf(slug)?.spec.kind !== kind) continue;

      const qty = count === undefined ? 1 : Number.parseInt(count, 10);
      if (!Number.isFinite(qty) || qty < 1) continue;

      for (let n = 0; n < qty && slugs.length < cap; n++) slugs.push(slug);
    }

    if (slugs.length > 0) out[kind] = slugs;
  });

  return out;
}

/**
 * The setup from a shared link.
 *
 * Checked the same way and for the same reason as the build, with one extra
 * rule: a slug is only kept if it is still sold as an extra *for that slot*.
 * A product that has since been promoted into a buildable component, or moved
 * to another shelf, quietly drops out rather than appearing under a heading it
 * no longer belongs to.
 */
export function parseExtrasParam(value: string | null): Extras {
  if (!value) return {};
  const slugs = value.split("~");
  const out: Extras = {};

  EXTRA_KINDS.forEach((kind, i) => {
    const slug = slugs[i];
    if (slug && extraKindOf(slug) === kind) out[kind] = slug;
  });

  return out;
}

export function shareUrl(build: Build, extras: Extras, origin: string, path: string): string {
  const url = new URL(path, origin);
  url.searchParams.set(BUILD_PARAM, buildParam(build));
  /* Omitted entirely when the customer took the tower alone — a link that
     carries an empty parameter reads as a setting somebody cleared. */
  if (extrasList(extras).length > 0) url.searchParams.set(EXTRAS_PARAM, extrasParam(extras));
  return url.toString();
}

/* ── the text recap: PCB-14 ──────────────────────────────────────────────── */

export type RecapStrings = {
  title: string;
  /** bay labels, already translated */
  partLabel: (kind: PartKind) => string;
  /** and the slot labels for the setup around it */
  extraLabel: (kind: ExtraKind) => string;
  /** the heading the peripherals are listed under, when there are any */
  setup: string;
  total: string;
  power: string;
  psu: string;
  money: (n: number) => string;
};

/**
 * The recap that goes to the clipboard and into WhatsApp.
 *
 * Deliberately plain text with no table drawing. It is read on a phone, in a
 * chat bubble, at whatever width that app decides — anything aligned with
 * spaces collapses into rubble there. One part per line, name then price, and
 * the three figures that summarise the machine at the bottom.
 */
export function recapText(
  build: Build,
  extras: Extras,
  totalDa: number,
  watts: number,
  psuWatts: number,
  s: RecapStrings,
): string {
  const out = [s.title, ""];

  /* A row per product, not per unit: "2 × Corsair Vengeance" priced for the
     pair, so the lines still add up to the total at the bottom. */
  for (const kind of PART_KINDS) {
    for (const { part, qty } of lines(build, kind)) {
      const name = qty > 1 ? `${qty} × ${part.product.name}` : part.product.name;
      out.push(`• ${s.partLabel(kind)} — ${name} · ${s.money(part.product.price * qty)}`);
    }
  }

  /* Under their own heading, not mixed into the parts. Whoever reads this is
     being asked one question about the machine and a different one about the
     screen and the chair — a flat list of thirteen bullets hides which of the
     two the price at the bottom is mostly made of. */
  const setup = extrasList(extras);
  if (setup.length > 0) {
    out.push("", s.setup);
    for (const { kind, product } of setup) {
      out.push(`• ${s.extraLabel(kind)} — ${product.name} · ${s.money(product.price)}`);
    }
  }

  out.push("", `${s.total} : ${s.money(totalDa)}`, `${s.power} : ${watts} W`, `${s.psu} : ${psuWatts} W`);

  return out.join("\n");
}

/** Matches how the product page already shares — no recipient in the link, so
    the customer picks the conversation rather than being dropped into ours. */
/** Returns whether the tab actually opened, the same way `printSheet` does.
    `window.open` hands back null when a popup blocker stops it, and a button
    that swallows that answer is a button that silently does nothing. */
export function openWhatsApp(text: string): boolean {
  const w = window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
  return w !== null;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ── the printable sheet: PCB-13 ─────────────────────────────────────────── */

export type SheetRow = { label: string; name: string; price: string; stock: string };

export type SheetData = {
  heading: string;
  subheading: string;
  rows: SheetRow[];
  columns: { part: string; product: string; price: string; stock: string };
  /** the peripherals, in their own table — absent when none were chosen */
  extras?: { heading: string; rows: SheetRow[] };
  totals: { label: string; value: string }[];
  fps?: { heading: string; columns: string[]; rows: { game: string; cells: string[] }[] };
  footer: string;
  dir: "ltr" | "rtl";
  lang: string;
};

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * A self-contained A4 sheet.
 *
 * Written into a new window rather than printed from the page itself. Printing
 * the live page would mean fighting the site's stylesheet with `@media print`
 * overrides for every dark panel, sticky rail and animated element on it — and
 * getting one wrong produces a black A4 page at a customer's expense. A fresh
 * document has no such inheritance, so what is written here is exactly what
 * comes out.
 *
 * The styles are inline and the type is system-stacked on purpose: the shop's
 * webfonts are loaded by the app that this document is *not* part of, and a
 * print that waits on a font request is a print that sometimes arrives blank.
 */
export function sheetHtml(d: SheetData): string {
  const body = (list: SheetRow[]) =>
    list
      .map(
        (r) => `<tr>
        <td class="k">${escape(r.label)}</td>
        <td class="n">${escape(r.name)}</td>
        <td class="p">${escape(r.price)}</td>
        <td class="s">${escape(r.stock)}</td>
      </tr>`,
      )
      .join("");

  const rows = body(d.rows);

  /* A second table rather than more rows in the first. The sheet is handed to
     somebody checking a price, and the machine and the setup around it are two
     things they may well decide separately — the totals at the bottom are for
     the order, the tables are for the decision. */
  const extras =
    d.extras && d.extras.rows.length > 0
      ? `<h2>${escape(d.extras.heading)}</h2>
         <table><tbody>${body(d.extras.rows)}</tbody></table>`
      : "";

  const totals = d.totals
    .map((t) => `<tr><td class="tl" colspan="2">${escape(t.label)}</td><td class="tv" colspan="2">${escape(t.value)}</td></tr>`)
    .join("");

  const fps = d.fps
    ? `<h2>${escape(d.fps.heading)}</h2>
       <table class="fps">
         <thead><tr><th></th>${d.fps.columns.map((c) => `<th>${escape(c)}</th>`).join("")}</tr></thead>
         <tbody>${d.fps.rows
           .map((r) => `<tr><td class="g">${escape(r.game)}</td>${r.cells.map((c) => `<td>${escape(c)}</td>`).join("")}</tr>`)
           .join("")}</tbody>
       </table>`
    : "";

  return `<!doctype html>
<html lang="${escape(d.lang)}" dir="${d.dir}">
<head>
<meta charset="utf-8">
<title>${escape(d.heading)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 12px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #15151a;
  }
  header { display: flex; align-items: baseline; justify-content: space-between;
           border-bottom: 2px solid #15151a; padding-bottom: 10px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .brand span { color: #922da9; }
  h1 { font-size: 15px; margin: 18px 0 4px; }
  .sub { color: #69696f; margin: 0 0 14px; font-size: 11px; }
  h2 { font-size: 12px; margin: 22px 0 8px; text-transform: none; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: start; font-size: 10px; color: #69696f; font-weight: 600;
       border-bottom: 1px solid #dfdee6; padding: 0 0 6px; }
  td { padding: 7px 0; border-bottom: 1px solid #e8e8ef; vertical-align: top; }
  .k { color: #69696f; width: 22%; }
  .n { width: 46%; font-weight: 600; }
  .p { width: 20%; text-align: end; white-space: nowrap; }
  .s { width: 12%; text-align: end; color: #69696f; font-size: 10px; }
  .tl { padding-top: 10px; font-weight: 600; }
  .tv { padding-top: 10px; text-align: end; font-weight: 700; white-space: nowrap; }
  tr:last-child .tv { font-size: 15px; }
  .fps td, .fps th { text-align: center; }
  .fps .g { text-align: start; font-weight: 600; }
  footer { margin-top: 20px; border-top: 1px solid #dfdee6; padding-top: 10px;
           color: #69696f; font-size: 10px; }
</style>
</head>
<body onload="window.print()">
  <header>
    <div class="brand">APL<span>.</span>TECH</div>
    <div class="sub" style="margin:0">${escape(d.subheading)}</div>
  </header>

  <h1>${escape(d.heading)}</h1>

  <table>
    <thead><tr>
      <th>${escape(d.columns.part)}</th>
      <th>${escape(d.columns.product)}</th>
      <th style="text-align:end">${escape(d.columns.price)}</th>
      <th style="text-align:end">${escape(d.columns.stock)}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  ${extras}

  <table><tbody>${totals}</tbody></table>

  ${fps}

  <footer>${escape(d.footer)}</footer>
</body>
</html>`;
}

/**
 * Opens the sheet and hands it to the browser's print dialog.
 *
 * Returns false when the window never opened, which in practice means a popup
 * blocker — the caller says so rather than leaving a button that looks broken.
 */
export function printSheet(d: SheetData): boolean {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return false;

  w.document.open();
  w.document.write(sheetHtml(d));
  w.document.close();
  return true;
}

/* ── saving: PCB-15 ──────────────────────────────────────────────────────── */

/* There is no customer account on the site yet, so "sauvegarde dans l'espace
   client" saves to this browser. The shape is the one an account would use —
   a list of named builds with timestamps — so moving it server-side later is a
   change of storage, not a change of model. */

const STORE_KEY = "apltech-builds";

/** `extras` is optional so a build saved before peripherals existed still
    loads — it reads back as a tower with nothing around it, which is what it
    was. */
export type SavedBuild = {
  id: string;
  name: string;
  build: Build;
  extras?: Extras;
  total: number;
  at: number;
};

export function loadSaved(): SavedBuild[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    /* Saved before bays were lists, a build held one slug per bay. Read back
       through the same normaliser, so an old entry is the machine it was
       rather than a record whose bays are strings pretending to be lists. */
    return (parsed as SavedBuild[]).map((entry) => ({ ...entry, build: normalizeBuild(entry?.build) }));
  } catch {
    /* private window, storage disabled, or something else wrote here first —
       an empty list is the honest answer and the page still works */
    return [];
  }
}

export function saveBuild(entry: SavedBuild): SavedBuild[] {
  const next = [entry, ...loadSaved().filter((b) => b.id !== entry.id)].slice(0, 20);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    /* nothing to do — the build stays on screen, it just will not outlive the tab */
  }
  return next;
}

export function forgetBuild(id: string): SavedBuild[] {
  const next = loadSaved().filter((b) => b.id !== id);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    /* see saveBuild */
  }
  return next;
}
