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
  /** subcategory key, or "all" — a narrower shelf inside `cat`, never across
      categories, so choosing a different `cat` clears it */
  sub: string;
  brands: string[];
  /** null means the whole range — an untouched slider is not a filter */
  price: { min: number; max: number } | null;
  availability: Availability;
  promoOnly: boolean;
  /** the header's search term, which narrows exactly like any other group */
  q: string;
};

/** Everything a control may change — the search term comes from the URL. */
export type FilterPatch = Partial<Omit<FilterState, "q">>;

export const NO_FILTERS: Omit<FilterState, "q"> = {
  cat: "all",
  sub: "all",
  brands: [],
  price: null,
  availability: "all",
  promoOnly: false,
};

/* ── Selection ──────────────────────────────────────────────────────────── */

export type Group = "cat" | "sub" | "brand" | "price" | "availability" | "promo" | "term";

type Options = {
  /** groups to leave out — how a group counts itself */
  except?: Group[];
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

  return PRODUCTS.filter((p) => {
    if (!skip.has("cat") && s.cat !== "all" && p.category !== s.cat) return false;
    if (!skip.has("sub") && s.sub !== "all" && p.subcategory !== s.sub) return false;
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
  /* the sub is lifted out alongside the cat: a count shown against
     "Processeurs" while "SSD NVMe" was still applied would read 0 on every
     category but the one that sub belongs to. */
  const pool = selectProducts(s, { except: ["cat", "sub"] });
  return { all: pool.length, ...tally(pool, (p) => p.category) };
}

/** Counts for the shelves inside the chosen category, keyed by sub key.
    `all` is the category's own total, which is what the "Tout" row shows. */
export function subCounts(s: FilterState): Record<string, number> {
  const pool = selectProducts(s, { except: ["sub"] });
  return { all: pool.length, ...tally(pool, (p) => p.subcategory ?? "") };
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

/* ── Summary ────────────────────────────────────────────────────────────── */

/** How many separate narrowings are in force, search term excluded. */
export function activeFilterCount(s: FilterState, bounds: { min: number; max: number }): number {
  const priced = s.price !== null && (s.price.min > bounds.min || s.price.max < bounds.max);
  return (
    (s.cat !== "all" ? 1 : 0) +
    (s.sub !== "all" ? 1 : 0) +
    s.brands.length +
    (priced ? 1 : 0) +
    (s.availability !== "all" ? 1 : 0) +
    (s.promoOnly ? 1 : 0)
  );
}

/* ── URL round-trip ───────────────────────────────────────────────────────
   The filters live in the query string so a narrowed view is a link someone
   can send. Everything at its default is left out entirely, which keeps a
   plain /catalogue clean and makes the shared URL say only what was actually
   chosen.

   Separators have to be absent from the data, and that is asserted rather
   than assumed — the first choice used a comma, which quietly broke every
   French decimal ("2,72 GHz" split into "2" and "72 GHz"). A test now checks
   every key and token in PRODUCTS against all three, so a new product cannot
   corrupt a link either. */
export const SPEC_SEP = { group: ";", key: "~", value: "|" } as const;

export function serializeFilters(s: Omit<FilterState, "q">, q: string, sort: string): string {
  const p = new URLSearchParams();
  if (s.cat !== "all") p.set("cat", s.cat);
  if (s.sub !== "all") p.set("sub", s.sub);
  if (q.trim()) p.set("q", q.trim());
  if (s.brands.length) p.set("brand", s.brands.join(SPEC_SEP.value));
  if (s.price) p.set("price", `${s.price.min}-${s.price.max}`);
  if (s.availability !== "all") p.set("avail", s.availability);
  if (s.promoOnly) p.set("promo", "1");

  if (sort && sort !== "pop") p.set("sort", sort);
  return p.toString();
}

const AVAIL = new Set<Availability>(["in", "pre", "out"]);

export function parseFilters(qs: string | URLSearchParams): {
  filters: Omit<FilterState, "q">;
  q: string;
  sort: string | null;
} {
  const p = typeof qs === "string" ? new URLSearchParams(qs) : qs;

  const rawPrice = p.get("price");
  let price: FilterState["price"] = null;
  if (rawPrice) {
    const [lo, hi] = rawPrice.split("-").map(Number);
    // a malformed range is no range, not a range of NaN
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi) price = { min: lo, max: hi };
  }

  const avail = p.get("avail") as Availability | null;

  return {
    filters: {
      cat: p.get("cat") ?? "all",
      sub: p.get("sub") ?? "all",
      brands: (p.get("brand") ?? "").split(SPEC_SEP.value).filter(Boolean),
      price,
      availability: avail && AVAIL.has(avail) ? avail : "all",
      promoOnly: p.get("promo") === "1",
    },
    q: p.get("q") ?? "",
    sort: p.get("sort"),
  };
}
