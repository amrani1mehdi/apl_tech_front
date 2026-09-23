/**
 * Order tracking — MODULE 5.
 *
 * A customer with no account finds an order the way a courier would: by its
 * number and the phone it was placed with. Both are needed. A number alone is
 * short enough to guess, and the result shows an address and what is being
 * delivered to it.
 *
 * ⚠ FRONT-END STAND-IN. There is no order table yet, so `trackOrder` looks in
 * two places: orders placed in this browser (see `localOrders`), which advance
 * along the road as time passes since they were placed (see `travelled`), and
 * four demo orders that exist so every state the page can be in is visible at
 * once — one on its way, one waiting at a pickup point, one delivered, one
 * cancelled. All four answer to 0661 22 33 44. The backend version of
 * `trackOrder` asks the server; nothing that calls it changes.
 */

import { getProduct } from "@/lib/products";
import { normalizePhone } from "./validate";
import { localOrders, totalsOf, type OrderDraft, type StoredOrder } from "./order";
import type { DeliveryMethod } from "./shipping";

export type OrderStatus = "received" | "confirmed" | "preparing" | "shipped" | "out" | "delivered" | "cancelled";

/** The road an order travels, in order. "Cancelled" is not on it — it is a
    way off it, drawn separately. */
export const STEPS: Exclude<OrderStatus, "cancelled">[] = [
  "received",
  "confirmed",
  "preparing",
  "shipped",
  "out",
  "delivered",
];

export type TrackedOrder = {
  number: string;
  status: OrderStatus;
  /** when each step that has happened happened */
  history: Partial<Record<OrderStatus, number>>;
  /** the courier's own reference, once shipped */
  courierRef?: string;
  draft: OrderDraft;
};

/**
 * An order number as it is stored.
 *
 * People copy these from a confirmation screen and retype them from a phone
 * call: lower case, spaces, a missing dash, the "APL-" left off entirely. Every
 * one of those is the same order.
 */
export function normalizeOrderNumber(input: string): string {
  const raw = input.replace(/[\s_]+/g, "").toUpperCase();
  const body = raw.replace(/^APL-?/, "");
  return body ? `APL-${body}` : "";
}

export const isOrderNumber = (input: string): boolean => /^APL-[A-Z0-9]{4,12}$/.test(normalizeOrderNumber(input));

/* ── the demo orders ── */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const DEMO_PHONE = "0661223344";

function demoDraft(
  slugs: [string, number][],
  method: DeliveryMethod,
  wilaya: string,
  commune: string,
  firstName: string,
): OrderDraft {
  const lines = slugs.flatMap(([slug, qty]) => {
    const p = getProduct(slug);
    return p ? [{ slug, name: p.name, qty, unitPrice: p.price }] : [];
  });
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  return {
    lines,
    customer: { firstName, lastName: "Benali", phone: DEMO_PHONE },
    delivery: { method, wilaya, commune, address: method === "home" ? "12 rue Larbi Ben M'hidi" : undefined },
    payment: "cod",
    promoCode: null,
    shown: totalsOf(subtotal, null, wilaya, method),
  };
}

/** Built on every lookup, relative to now, so the dates always read as
    recent. */
function demoOrders(now: number): TrackedOrder[] {
  const placed = (daysAgo: number) => now - daysAgo * DAY;
  const at = (start: number, ...offsets: number[]) => offsets.map((o) => start + o);

  const a = placed(3);
  const [aC, aP, aS, aO] = at(a, 1.2 * HOUR, 19 * HOUR, 27 * HOUR, 2.7 * DAY);
  const b = placed(2);
  const [bC, bP, bS, bO] = at(b, 0.8 * HOUR, 17 * HOUR, 26 * HOUR, 1.9 * DAY);
  const c = placed(6);
  const [cC, cP, cS, cO, cD] = at(c, 2 * HOUR, 20 * HOUR, 30 * HOUR, 3 * DAY, 3.3 * DAY);
  const d = placed(4);

  /* Two older deliveries, months back. They are what makes the demo account
     a customer with a history rather than one recent order: the loyalty card
     reads its tier from delivered orders (MODULE 8, FID-02), so a shop worth
     380 points can only ever show Bronze, and every screen above that tier —
     the Argent and Or shelves, the climb on the card — would go unseen. */
  const e = placed(38);
  const [eC, eP, eS, eO, eD] = at(e, 1.5 * HOUR, 20 * HOUR, 28 * HOUR, 2.8 * DAY, 3.4 * DAY);
  const f = placed(96);
  const [fC, fP, fS, fO, fD] = at(f, 2.5 * HOUR, 21 * HOUR, 29 * HOUR, 3.1 * DAY, 3.8 * DAY);

  return [
    {
      number: "APL-DEMO01",
      status: "out",
      history: { received: a, confirmed: aC, preparing: aP, shipped: aS, out: aO },
      courierRef: "58392017",
      draft: demoDraft([["rtx-5060-ti-16go", 1], ["fury-beast-16go-ddr5-5600", 1]], "home", "31", "Ain Turk", "Amina"),
    },
    {
      number: "APL-DEMO02",
      status: "out",
      history: { received: b, confirmed: bC, preparing: bP, shipped: bS, out: bO },
      courierRef: "58391145",
      draft: demoDraft([["vengeance-32go-ddr5-6000", 2]], "pickup", "16", "Bab Ezzouar", "Yacine"),
    },
    {
      number: "APL-DEMO03",
      status: "delivered",
      history: { received: c, confirmed: cC, preparing: cP, shipped: cS, out: cO, delivered: cD },
      courierRef: "58310962",
      draft: demoDraft([["samsung-990-pro-2to", 1]], "home", "19", "Setif", "Karim"),
    },
    {
      number: "APL-DEMO04",
      status: "cancelled",
      history: { received: d, cancelled: d + 1.5 * DAY },
      draft: demoDraft([["ryzen-7-7800x3d", 1]], "home", "25", "Constantine", "Nadia"),
    },
    {
      number: "APL-DEMO05",
      status: "delivered",
      history: { received: e, confirmed: eC, preparing: eP, shipped: eS, out: eO, delivered: eD },
      courierRef: "57884301",
      draft: demoDraft([["apl-tech-rtx-5080-oc", 1]], "home", "16", "Hydra", "Yacine"),
    },
    {
      number: "APL-DEMO06",
      status: "delivered",
      history: { received: f, confirmed: fC, preparing: fP, shipped: fS, out: fO, delivered: fD },
      courierRef: "57219648",
      draft: demoDraft([["ryzen-9-9950x", 1]], "home", "16", "Hydra", "Yacine"),
    },
  ];
}

export type TrackResult = { ok: true; order: TrackedOrder } | { ok: false; reason: "notFound" };

/** Looking an order up. See the note at the top for what this does today. */
export async function trackOrder(numberInput: string, phoneInput: string): Promise<TrackResult> {
  await new Promise((r) => setTimeout(r, 700));

  const number = normalizeOrderNumber(numberInput);
  const phone = normalizePhone(phoneInput);

  /* The same answer for a wrong number and for a right number with the wrong
     phone. Saying "that order exists, but not with this phone" would confirm
     to anyone guessing numbers that they had found a real one. */
  const order = allOrders(Date.now()).find((o) => o.number === number && o.draft.customer.phone === phone);
  return order ? { ok: true, order } : { ok: false, reason: "notFound" };
}

function allOrders(now: number): TrackedOrder[] {
  const local: TrackedOrder[] = localOrders().map((o) => travelled(o, now));
  return [...local, ...demoOrders(now)];
}

/**
 * ⚠ FRONT-END STAND-IN. How far an order placed in this browser has got, from
 * how long ago it was placed.
 *
 * Orders used to be pinned at "received" for ever, because nothing here can
 * confirm or deliver one. That made two things impossible to see without
 * editing storage by hand: the tracking page past its first step, and any
 * loyalty points at all — FID-02 credits on delivery, so an order that can
 * never be delivered can never earn (`lib/loyalty/card.ts`).
 *
 * Time standing in for the shop is the smallest fiction that fixes both, and
 * the demo orders above already work this way: they are built against `now`
 * on every lookup. The pacing below is theirs. When the backend arrives the
 * real status comes with the order and this goes away with the rest of the
 * stand-in.
 */
const LOCAL_STEPS: [Exclude<OrderStatus, "cancelled">, number][] = [
  ["received", 0],
  ["confirmed", 1 * HOUR],
  ["preparing", 18 * HOUR],
  ["shipped", 26 * HOUR],
  ["out", 2.5 * DAY],
  ["delivered", 3.2 * DAY],
];

function travelled(order: StoredOrder, now: number): TrackedOrder {
  const history: Partial<Record<OrderStatus, number>> = {};
  let status: OrderStatus = "received";

  for (const [step, after] of LOCAL_STEPS) {
    const at = order.placedAt + after;
    if (at > now) break;
    history[step] = at;
    status = step;
  }

  return { number: order.number, status, history, draft: order.draft };
}

/**
 * Every order placed with a phone, newest first — a signed-in customer's
 * order list. Found by phone because orders are placed without an account, so
 * the phone is what an account and its orders have in common.
 *
 * ⚠ The same stand-in as `trackOrder`: this browser's orders and the demo ones.
 */
export function ordersForPhone(phoneInput: string, now = Date.now()): TrackedOrder[] {
  const phone = normalizePhone(phoneInput);
  return allOrders(now)
    .filter((o) => o.draft.customer.phone === phone)
    .sort((a, b) => (b.history.received ?? 0) - (a.history.received ?? 0));
}

/**
 * When the order should arrive, as a [from, to] pair of timestamps — or null
 * once it has arrived or will not.
 *
 * Counted from shipping when it has shipped, and otherwise from a day after it
 * was placed, which is how long confirming and preparing take.
 */
export function estimatedArrival(order: TrackedOrder): [number, number] | null {
  if (order.status === "delivered" || order.status === "cancelled") return null;
  const days = order.draft.shown.delivery?.days;
  if (!days) return null;
  const from = order.history.shipped ?? (order.history.received ?? Date.now()) + DAY;
  return [from + days[0] * DAY, from + days[1] * DAY];
}
