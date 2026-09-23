/**
 * What goes around the tower — PCB-04.
 *
 * The builder's eight bays make a computer; they do not make a setup. A
 * customer who has just watched a machine go together still has no screen to
 * look at it on, nothing to type on, and a case with whatever fans the
 * manufacturer happened to put in it. That is what this file sells them.
 *
 * It is deliberately *not* `parts.ts`. Nothing here is checked for
 * compatibility, nothing here draws power from the supply, nothing here is
 * required, and nothing here can stop a build from assembling — a monitor and
 * a chair have no opinion about a socket. Keeping the two tables apart is what
 * stops a headset ending up in the power budget, or an empty mousepad slot
 * reading as an incomplete machine.
 *
 * The other half of the rule is about *when*: the builder offers none of this
 * until the eight bays are full. Peripherals chosen beside a half-specced
 * machine are chosen against a total that is about to change, and a customer
 * who picks a 4K screen before the graphics card is settled has been sold the
 * wrong screen. So the tower is finished first, and then — with a real total
 * on the page and a real amount of budget left — the setup is built on top.
 *
 * Every option is an ordinary catalogue product on its own shelf. The builder
 * gets no private stock: what it offers is exactly what the store sells, at
 * the same price, and each one goes into the cart as itself rather than
 * disappearing into a configuration line.
 */

import { PRODUCTS, getProduct, isOrderable, type Product } from "@/lib/products";
import { PART_SPECS } from "./parts";
import type { Scope } from "./generate";

/* ── the slots ───────────────────────────────────────────────────────────── */

export type ExtraKind =
  | "monitor"
  | "keyboard"
  | "mouse"
  | "headset"
  | "mousepad"
  | "fans"
  | "mic"
  | "webcam"
  | "chair";

/**
 * Ordered by how much the choice has to do with the machine underneath it.
 *
 * The screen leads, because it is the one peripheral the tower's performance
 * argues with — the frame rates further down the page are quoted per
 * resolution, and the screen is what chooses the resolution. Then the three
 * things a computer cannot be used without, then the ones it can.
 */
export const EXTRA_KINDS: ExtraKind[] = [
  "monitor",
  "keyboard",
  "mouse",
  "headset",
  "mousepad",
  "fans",
  "mic",
  "webcam",
  "chair",
];

/**
 * Which shelf each slot draws from.
 *
 * By category where the whole category is the slot, and by subcategory where
 * it is not. `refroidissement` is the one that has to be narrow: it holds the
 * air coolers and AIOs the builder fits *inside* the machine as well as the
 * case fans sold around it, and a slot that took the whole category would
 * offer a customer a second processor cooler as an accessory.
 */
const SHELF: Record<ExtraKind, { category: string; sub?: string }> = {
  monitor: { category: "ecrans" },
  keyboard: { category: "peripheriques", sub: "peri-claviers" },
  mouse: { category: "peripheriques", sub: "peri-souris" },
  headset: { category: "peripheriques", sub: "peri-casques" },
  mousepad: { category: "peripheriques", sub: "peri-tapis" },
  fans: { category: "refroidissement", sub: "refro-ventilateurs" },
  mic: { category: "streaming", sub: "stream-micros" },
  webcam: { category: "streaming", sub: "stream-webcams" },
  chair: { category: "chaises" },
};

/* ── looking things up ───────────────────────────────────────────────────── */

function onShelf(p: Product, kind: ExtraKind): boolean {
  const shelf = SHELF[kind];
  if (p.category !== shelf.category) return false;
  return shelf.sub === undefined || p.subcategory === shelf.sub;
}

/**
 * Everything offered for one slot, cheapest first, in-stock ahead of not.
 *
 * Two things are filtered out rather than shown greyed. A product that is also
 * a buildable component has no business here — that is the same part offered
 * twice on one page, once inside the machine and once beside it — and a
 * product that cannot be ordered on its own cannot be added to a cart, so
 * offering it is offering a button that does nothing.
 *
 * That second rule is the opposite of the swap drawer's, deliberately. There,
 * an out-of-stock part still appears, because the customer came looking for it
 * and its absence would read as the shop not selling it. Here nobody came
 * looking for anything: this is a shelf being offered, and a shelf offers what
 * it can hand over.
 */
export function extraPool(kind: ExtraKind): Product[] {
  return PRODUCTS.filter(
    (p) => onShelf(p, kind) && !PART_SPECS[p.slug] && isOrderable(p),
  ).sort((a, b) => Number(b.stock) - Number(a.stock) || a.price - b.price);
}

/** The slot a product belongs to, or null when it is not sold as an extra —
    how a slug arriving from a shared link or from storage is checked. */
export function extraKindOf(slug: string): ExtraKind | null {
  const product = getProduct(slug);
  if (!product) return null;
  return (
    EXTRA_KINDS.find(
      (kind) => onShelf(product, kind) && !PART_SPECS[slug] && isOrderable(product),
    ) ?? null
  );
}

/* ── the chosen setup ────────────────────────────────────────────────────── */

/**
 * One product per slot, or nothing.
 *
 * The same shape as `Build`, for the same reason: a slot holds a decision, and
 * a customer who wants two of something is expressing a quantity in the cart
 * rather than a second decision here. Every slot is optional — this is the
 * half of the order nobody has to buy.
 */
export type Extras = Partial<Record<ExtraKind, string>>;

export const extrasTotal = (extras: Extras): number =>
  EXTRA_KINDS.reduce((sum, kind) => sum + (getProduct(extras[kind] ?? "")?.price ?? 0), 0);

export const extrasCount = (extras: Extras): number =>
  EXTRA_KINDS.filter((kind) => extras[kind]).length;

/** The chosen products in slot order, each with the slot it fills — what the
    printed sheet, the recap and the cart all walk. */
export function extrasList(extras: Extras): { kind: ExtraKind; product: Product }[] {
  return EXTRA_KINDS.flatMap((kind) => {
    const product = getProduct(extras[kind] ?? "");
    return product ? [{ kind, product }] : [];
  });
}

/** Drops anything no longer sold as an extra — a delisted product, a slug that
    has since become a buildable part, a hand-edited link. */
export function cleanExtras(extras: Extras): Extras {
  const out: Extras = {};
  for (const kind of EXTRA_KINDS) {
    const slug = extras[kind];
    if (slug && extraKindOf(slug) === kind) out[kind] = slug;
  }
  return out;
}

/* ── what the customer already asked for ─────────────────────────────────── */

/** The slots each answer to "tower only, with a screen, or the lot?" opens
    with something already in them, in the order they get filled — so that a
    budget which only stretches to two of them buys the two you cannot use a
    computer without. */
const SUGGESTED: Record<Scope, ExtraKind[]> = {
  tower: [],
  screen: ["monitor"],
  full: ["monitor", "keyboard", "mouse", "headset"],
};

/**
 * The most of a budget the setup is ever allowed to take.
 *
 * A ceiling rather than a target. The reserve below is normally the actual
 * floor price of the slots the customer asked for, and this only binds on
 * small budgets — where holding back what a screen and three peripherals cost
 * would leave nothing that assembles. Past this share, the machine wins and
 * the setup gets whatever it can buy.
 */
const SETUP_SHARE = 0.3;

/** What the cheapest in-stock version of a scope's slots comes to. */
function floorFor(scope: Scope): number {
  return SUGGESTED[scope].reduce((sum, kind) => {
    const cheapest = extraPool(kind).find((p) => p.stock);
    return sum + (cheapest?.price ?? 0);
  }, 0);
}

/**
 * How much of the budget to hold back before the machine is specced.
 *
 * This has to happen *before*, and that is the one genuinely load-bearing
 * thing about it. The generator spends whatever ceiling it is handed — that is
 * its job, and `spendLeftovers` exists specifically to use up what is left. So
 * a customer who says "écran et périphériques" on 400 000 DA and is specced a
 * 400 000 DA tower has been answered with a machine that ate the screen they
 * asked for. Subtracting the setup first is what makes the answer to the scope
 * question mean anything at all.
 *
 * Zero for a tower-only answer, and zero when no budget was given — with no
 * ceiling there is nothing to divide.
 */
export function reserveFor(scope: Scope | null, budget: number | null): number {
  if (!scope || budget === null) return 0;
  return Math.min(floorFor(scope), Math.round(budget * SETUP_SHARE));
}

/**
 * A starting setup for someone who said they wanted one.
 *
 * The scope question has been asked since the first version of the builder and
 * nothing ever read the answer. This does: say "écran et périphériques" and
 * the four slots that phrase means are already filled when the setup section
 * comes into view.
 *
 * Filled out of what is *left* of the budget, which is the whole reason it runs
 * after the tower rather than during it. Somebody who asked for peripherals
 * inside a 300 000 DA budget did not mean "spend 132 000 of it on the screen";
 * they meant the machine first and the setup out of what remains. When nothing
 * remains, nothing is suggested — an empty slot the customer fills on purpose
 * is honest, a pre-ticked one that puts them 80 000 over is not.
 *
 * Each slot takes the *best* it can afford while still leaving the cheapest
 * version of every slot after it payable. Cheapest-first was the first attempt
 * and it gave bad advice at the top of the range: a 587 000 DA machine with an
 * RTX 5080 in it was being handed a 32 000 DA 1080p screen, with a frame-rate
 * table on the same page quoting its 4K figures. Reserving the floor of the
 * remaining slots is what stops the screen eating the keyboard — the customer
 * asked for four things, not for one good thing and three empty rows.
 */
export function suggestExtras(scope: Scope | null, budgetLeft: number): Extras {
  if (!scope) return {};

  const wanted = SUGGESTED[scope];
  const out: Extras = {};
  let left = budgetLeft;

  wanted.forEach((kind, i) => {
    /* What the slots after this one cost at the floor — held back so a
       generous screen cannot spend the mouse. */
    const rest = wanted
      .slice(i + 1)
      .reduce((sum, k) => sum + (extraPool(k).find((p) => p.stock)?.price ?? 0), 0);

    const ceiling = left - rest;
    const affordable = extraPool(kind).filter((p) => p.stock && p.price <= ceiling);

    /* The pool is cheapest-first, so the last one under the ceiling is the
       best one affordable — except when no budget was ever stated, where
       "best affordable" has nothing to measure itself against and the modest
       option is the only defensible guess to put in front of someone. */
    const pick = Number.isFinite(ceiling) ? affordable.at(-1) : affordable[0];
    if (!pick) return;

    out[kind] = pick.slug;
    left -= pick.price;
  });

  return out;
}

/* ── the guard rail ──────────────────────────────────────────────────────── */

/**
 * Slots the catalogue can no longer fill, and products claimed by two tables.
 *
 * The same job as `auditParts()`, called from the same place. A shelf key
 * renamed in `products.ts` would silently empty a slot here, and the failure
 * would be a row that quietly stops appearing rather than anything anyone
 * notices. An empty slot is not fatal — the section skips it — so this reports
 * rather than throws.
 */
export function auditExtras(): string[] {
  const problems: string[] = [];

  for (const kind of EXTRA_KINDS) {
    if (extraPool(kind).length === 0) problems.push(`no product on the "${kind}" shelf`);

    const clash = PRODUCTS.filter((p) => onShelf(p, kind) && PART_SPECS[p.slug]);
    if (clash.length > 0) {
      const shelf = SHELF[kind];
      problems.push(
        `"${kind}" (${shelf.sub ?? shelf.category}) overlaps buildable parts: ${clash
          .map((p) => p.slug)
          .join(", ")}`,
      );
    }
  }

  return problems;
}
