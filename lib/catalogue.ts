/* The catalogue's filtering, kept out of the components that draw it.
   The rules are the ones the store has always used — every group ANDed
   together, the choices inside one group ORed — with the controls added
   around them rather than in place of them.

   Everything here reads the same PRODUCTS array the grid renders, so a count
   shown beside an option and the result of clicking it come from one source.  */

import { PRODUCTS, type Product } from "./products";

export type Availability = "all" | "in" | "pre" | "out";

export type FilterState = {
  /** category key, or "all" */
  cat: string;
  brands: string[];
  /** null means the whole range — an untouched slider is not a filter */
  price: { min: number; max: number } | null;
  availability: Availability;
  promoOnly: boolean;
  /** spec key → chosen values, already normalised by specToken */
  specs: Record<string, string[]>;
  /** the header's search term, which narrows exactly like any other group */
  q: string;
};

/** Everything a control may change — the search term comes from the URL. */
export type FilterPatch = Partial<Omit<FilterState, "q">>;

export const NO_FILTERS: Omit<FilterState, "q"> = {
  cat: "all",
  brands: [],
  price: null,
  availability: "all",
  promoOnly: false,
  specs: {},
};

/* ── Spec normalisation ───────────────────────────────────────────────────
   Spec values are written for a human reading one product ("16 Go GDDR7",
   "1 To NVMe"), so filtering on them raw gives one option per product. A
   value that opens with a quantity is reduced to that quantity, which is the
   part several products can share; anything else is kept verbatim, because
   "AM5" and "Optiques Gen-3" are already the thing you would filter by. */
const QUANTITY = /^(\d+(?:[.,]\d+)?)\s*(Go|To|Mo|Ko|GHz|MHz|Hz|W|mm|ms|g|h|%|″|")/i;

export function specToken(value: string): string {
  const m = QUANTITY.exec(value.trim());
  if (!m) return value.trim();
  const [, n, unit] = m;
  // a space before % reads as French typography; before ″ it reads as a typo
  return unit === "″" || unit === '"' ? `${n}${unit}` : `${n} ${unit}`;
}

/** Numeric where the values start with a number, alphabetical otherwise. */
function compareTokens(a: string, b: string): number {
  const na = parseFloat(a.replace(",", "."));
  const nb = parseFloat(b.replace(",", "."));
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "fr");
}

/* ── Selection ──────────────────────────────────────────────────────────── */

export type Group = "cat" | "brand" | "price" | "availability" | "promo" | "term";

type Options = {
  /** groups to leave out — how a facet counts itself */
  except?: Group[];
  /** spec key to leave out, or "*" for every spec constraint */
  exceptSpec?: string;
};

function haystack(p: Product): string {
  return `${p.name} ${p.brand} ${p.specs.map((s) => s.v).join(" ")}`.toLowerCase();
}

/**
 * Products matching the state, optionally with one group lifted out.
 *
 * Lifting is what makes a count beside an option mean "what you would get by
 * choosing this", rather than "what you have now" — a number that only ever
 * reads 0 once you have ticked something is worse than no number at all.
 */
export function selectProducts(s: FilterState, o: Options = {}): Product[] {
  const skip = new Set(o.except ?? []);
  const term = s.q.trim().toLowerCase();
  const specEntries = Object.entries(s.specs).filter(
    ([k, v]) => v.length > 0 && o.exceptSpec !== "*" && k !== o.exceptSpec,
  );

  return PRODUCTS.filter((p) => {
    if (!skip.has("cat") && s.cat !== "all" && p.category !== s.cat) return false;
    if (!skip.has("brand") && s.brands.length > 0 && !s.brands.includes(p.brand)) return false;
    if (!skip.has("price") && s.price && (p.price < s.price.min || p.price > s.price.max))
      return false;
    if (!skip.has("availability") && s.availability !== "all") {
      // pre-order is its own shelf: orderable, but not stock you can collect,
      // so it belongs to neither "in stock" nor "out of stock"
      if (s.availability === "pre" && !p.preorder) return false;
      if (s.availability === "in" && (!p.stock || p.preorder)) return false;
      if (s.availability === "out" && (p.stock || p.preorder)) return false;
    }
    if (!skip.has("promo") && s.promoOnly && p.oldPrice === undefined) return false;
    if (!skip.has("term") && term && !haystack(p).includes(term)) return false;
    for (const [k, values] of specEntries) {
      if (!p.specs.some((sp) => sp.k === k && values.includes(specToken(sp.v)))) return false;
    }
    return true;
  });
}

/* ── Counts ─────────────────────────────────────────────────────────────── */

function tally<T extends string>(list: Product[], of: (p: Product) => T): Record<T, number> {
  const by = {} as Record<T, number>;
  for (const p of list) by[of(p)] = (by[of(p)] ?? 0) + 1;
  return by;
}

export function categoryCounts(s: FilterState): Record<string, number> {
  const pool = selectProducts(s, { except: ["cat"] });
  return { all: pool.length, ...tally(pool, (p) => p.category) };
}

export function brandCounts(s: FilterState): Record<string, number> {
  return tally(selectProducts(s, { except: ["brand"] }), (p) => p.brand);
}

export function availabilityCounts(s: FilterState): Record<Availability, number> {
  const pool = selectProducts(s, { except: ["availability"] });
  return {
    all: pool.length,
    in: pool.filter((p) => p.stock && !p.preorder).length,
    pre: pool.filter((p) => p.preorder).length,
    out: pool.filter((p) => !p.stock && !p.preorder).length,
  };
}

export function promoCount(s: FilterState): number {
  return selectProducts(s, { except: ["promo"] }).filter((p) => p.oldPrice !== undefined).length;
}

/* ── Price bounds ─────────────────────────────────────────────────────────
   Taken from everything the other filters allow, rounded outwards to the
   nearest thousand so the slider lands on numbers a price is written in. */
export const PRICE_STEP = 1000;

export function priceBounds(s: FilterState): { min: number; max: number } {
  const pool = selectProducts(s, { except: ["price"] });
  if (pool.length === 0) return { min: 0, max: 0 };
  const prices = pool.map((p) => p.price);
  return {
    min: Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP,
    max: Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP,
  };
}

/** The slider's working range: the chosen one, held inside the live bounds. */
export function effectivePrice(
  s: FilterState,
  bounds: { min: number; max: number },
): { min: number; max: number } {
  if (!s.price) return bounds;
  return {
    min: Math.max(bounds.min, Math.min(s.price.min, bounds.max)),
    max: Math.min(bounds.max, Math.max(s.price.max, bounds.min)),
  };
}

/* ── Technical facets ─────────────────────────────────────────────────────
   Built from the specs the products in the chosen category actually carry,
   so the section changes shape between graphics cards and monitors without
   a hand-written list to maintain.

   Only inside a category: across the whole catalogue the keys are dozens of
   one-off marketing lines, and a section of those is noise. A key also has to
   describe at least two products and offer at least two distinct values —
   below that it is a label for a single product, not a filter. */
export type Facet = { key: string; values: { value: string; count: number }[] };

const MIN_PRODUCTS = 2;
const MIN_VALUES = 2;

export function specFacets(s: FilterState): Facet[] {
  if (s.cat === "all") return [];

  const pool = selectProducts(s, { exceptSpec: "*" });
  const keys = new Map<string, Set<string>>();
  const seenBy = new Map<string, number>();

  for (const p of pool) {
    const own = new Set<string>();
    for (const sp of p.specs) {
      if (!keys.has(sp.k)) keys.set(sp.k, new Set());
      keys.get(sp.k)!.add(specToken(sp.v));
      own.add(sp.k);
    }
    for (const k of own) seenBy.set(k, (seenBy.get(k) ?? 0) + 1);
  }

  const facets: Facet[] = [];
  for (const [key, tokens] of keys) {
    if ((seenBy.get(key) ?? 0) < MIN_PRODUCTS || tokens.size < MIN_VALUES) continue;
    // counted with this key's own choices lifted, like every other group
    const base = selectProducts(s, { exceptSpec: key });
    const values = [...tokens]
      .map((value) => ({
        value,
        count: base.filter((p) => p.specs.some((sp) => sp.k === key && specToken(sp.v) === value))
          .length,
      }))
      .sort((a, b) => compareTokens(a.value, b.value));
    facets.push({ key, values });
  }
  return facets.sort((a, b) => b.values.length - a.values.length);
}

/* ── Summary ────────────────────────────────────────────────────────────── */

/** How many separate narrowings are in force, search term excluded. */
export function activeFilterCount(s: FilterState, bounds: { min: number; max: number }): number {
  const specCount = Object.values(s.specs).reduce((n, v) => n + v.length, 0);
  const priced = s.price !== null && (s.price.min > bounds.min || s.price.max < bounds.max);
  return (
    (s.cat !== "all" ? 1 : 0) +
    s.brands.length +
    (priced ? 1 : 0) +
    (s.availability !== "all" ? 1 : 0) +
    (s.promoOnly ? 1 : 0) +
    specCount
  );
}
