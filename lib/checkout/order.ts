/**
 * The order — MODULE 5, PAN-05 and PAN-06.
 *
 * Front-end only for now. `placeOrder` is the one seam the backend plugs into:
 * today it waits a moment and returns a made-up number, so the page can be
 * designed around a real round trip — the button's sending state, the
 * confirmation — without an order going anywhere. Replacing its body with a
 * request to the server is the whole of that change.
 *
 * What travels to the server is deliberately *not* trusted by it. The draft
 * carries slugs, quantities, the customer and the chosen code; prices,
 * discount and delivery are recomputed there from the catalogue and the fee
 * grid. The totals in the draft are what the customer was shown, sent along so
 * the server can refuse an order whose price moved underneath them.
 */

import type { CartItem } from "@/components/cart/CartProvider";
import { discountOf, checkPromo, type Promo } from "./promo";
import { quoteDelivery, type DeliveryMethod, type DeliveryQuote } from "./shipping";
import { normalizePhone, type CheckoutForm } from "./validate";

/* ── payment — PAN-05 ──
   Cash on delivery is the only method, and the list exists anyway: online
   payment is out of scope for this module but not for the shop, and a checkout
   that hard-codes "cash" in its markup is a checkout that has to be rewritten
   to add a card. Turning one on is flipping `available`. */

export type PaymentMethodId = "cod" | "online";

export const PAYMENT_METHODS: { id: PaymentMethodId; available: boolean }[] = [
  { id: "cod", available: true },
  { id: "online", available: false },
];

/* ── totals ── */

export type Totals = {
  subtotal: number;
  discount: number;
  /** null until a wilaya is chosen — the price is not known yet, and 0 would
      read as "free" */
  delivery: DeliveryQuote | null;
  /** goods after discount, plus delivery once it is known */
  total: number;
};

/**
 * Everything the summary shows, from the cart, the code and the delivery
 * choice.
 *
 * The code is re-checked here on every call rather than trusted from when it
 * was applied: remove an item after entering BIENVENUE and the order can drop
 * under the code's minimum, and a discount that silently survived that would
 * be a discount the shop never offered.
 */
export function totalsOf(
  subtotal: number,
  code: string | null,
  wilaya: string,
  method: DeliveryMethod,
): Totals & { promo: Promo | null } {
  const check = code ? checkPromo(code, subtotal) : null;
  const promo = check?.ok ? check.promo : null;
  const discount = promo ? discountOf(promo, subtotal) : 0;
  const goods = subtotal - discount;
  const delivery = wilaya ? quoteDelivery(wilaya, method, goods, promo?.kind === "shipping") : null;

  return { subtotal, discount, delivery, total: goods + (delivery?.fee ?? 0), promo };
}

/* ── the order ── */

export type OrderDraft = {
  lines: { slug: string; name: string; variant?: string; qty: number; unitPrice: number }[];
  customer: { firstName: string; lastName: string; phone: string; email?: string };
  delivery: { method: DeliveryMethod; wilaya: string; commune: string; address?: string };
  payment: PaymentMethodId;
  promoCode: string | null;
  shown: Totals;
};

export function draftOf(
  items: CartItem[],
  form: CheckoutForm,
  method: DeliveryMethod,
  payment: PaymentMethodId,
  promoCode: string | null,
  shown: Totals,
): OrderDraft {
  return {
    lines: items.map((i) => ({ slug: i.slug, name: i.name, variant: i.variant, qty: i.qty, unitPrice: i.price })),
    customer: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(form.phone),
      email: form.email.trim() || undefined,
    },
    delivery: {
      method,
      wilaya: form.wilaya,
      commune: form.commune,
      address: method === "home" ? form.address.trim() : undefined,
    },
    payment,
    promoCode,
    shown,
  };
}

export type PlacedOrder = { number: string; draft: OrderDraft };

/** An order as the stand-in keeps it — see `placeOrder`. */
export type StoredOrder = PlacedOrder & { placedAt: number };

const ORDERS_KEY = "apltech-orders";

/**
 * ⚠ FRONT-END STAND-IN. Orders placed in this browser, newest first.
 *
 * Kept only so order tracking has something real to find while there is no
 * server: place an order, then look it up on /suivi. Nothing here is visible
 * to the shop, and it disappears with the browser's storage. The backend
 * replaces this with the order table and it goes away.
 */
export function localOrders(): StoredOrder[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

/**
 * ⚠ FRONT-END STAND-IN. No order leaves the browser.
 *
 * Waits about as long as a real request would, so the sending state is seen
 * rather than flashed, and returns a number in the shop's format. The backend
 * version posts `draft` and returns the number the server assigned.
 */
export async function placeOrder(draft: OrderDraft): Promise<PlacedOrder> {
  await new Promise((r) => setTimeout(r, 900));
  const number = `APL-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;

  try {
    const next = [{ number, draft, placedAt: Date.now() }, ...localOrders()].slice(0, 20);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the confirmation still shows; tracking just won't find it */
  }

  return { number, draft };
}
