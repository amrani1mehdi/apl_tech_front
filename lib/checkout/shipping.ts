/**
 * Delivery fees — MODULE 5, PAN-04.
 *
 * ⚠ DUMMY FEES. Every number in `ZONE_FEES` is a placeholder chosen to make
 * the design believable, not a price the shop has agreed with a courier. The
 * real grid (home and pickup, per wilaya) replaces this table; nothing else in
 * the checkout reads fees from anywhere but `quoteDelivery`, so that swap
 * touches this file only.
 *
 * Fees are set per *zone* rather than per wilaya for now, because a dummy grid
 * of 116 invented prices would look like data. Five zones read as what they
 * are — distance bands — and the lookup still goes wilaya → fee, which is the
 * shape a real per-wilaya grid will keep.
 *
 * "Point de retrait" is priced and timed here too, but what a pickup point
 * actually is — courier stop desk, the shop's own counter, or both — is still
 * to be decided; the checkout says the address will be confirmed by phone.
 */

import { WILAYAS } from "./geo";

export type DeliveryMethod = "home" | "pickup";

export type Zone = "centre" | "north" | "highlands" | "south" | "deepSouth";

/** Which band each wilaya sits in, by code. Every one of the 58 is listed —
    `auditShipping` fails loudly if a wilaya is ever added without a zone. */
const ZONE_OF: Record<string, Zone> = {
  /* Alger and the wilayas around it */
  "16": "centre", "09": "centre", "35": "centre", "42": "centre",
  /* the north, coast and Tell */
  "02": "north", "06": "north", "10": "north", "13": "north", "15": "north", "18": "north",
  "19": "north", "21": "north", "22": "north", "23": "north", "24": "north", "25": "north",
  "26": "north", "27": "north", "29": "north", "31": "north", "34": "north", "36": "north",
  "41": "north", "43": "north", "44": "north", "46": "north", "48": "north",
  /* the high plateaus */
  "03": "highlands", "04": "highlands", "05": "highlands", "07": "highlands", "12": "highlands",
  "14": "highlands", "17": "highlands", "20": "highlands", "28": "highlands", "32": "highlands",
  "38": "highlands", "40": "highlands", "45": "highlands", "51": "highlands",
  /* the northern Sahara */
  "08": "south", "30": "south", "39": "south", "47": "south", "52": "south", "55": "south",
  "57": "south", "58": "south",
  /* the deep south */
  "01": "deepSouth", "11": "deepSouth", "33": "deepSouth", "37": "deepSouth", "49": "deepSouth",
  "50": "deepSouth", "53": "deepSouth", "54": "deepSouth", "56": "deepSouth",
};

type Rate = { fee: number; days: [number, number] };

/** ⚠ DUMMY — see the note at the top of this file. */
const ZONE_FEES: Record<Zone, Record<DeliveryMethod, Rate>> = {
  centre: { home: { fee: 400, days: [1, 2] }, pickup: { fee: 250, days: [1, 2] } },
  north: { home: { fee: 650, days: [2, 3] }, pickup: { fee: 400, days: [2, 3] } },
  highlands: { home: { fee: 800, days: [2, 4] }, pickup: { fee: 500, days: [2, 4] } },
  south: { home: { fee: 1000, days: [3, 5] }, pickup: { fee: 650, days: [3, 5] } },
  deepSouth: { home: { fee: 1500, days: [4, 8] }, pickup: { fee: 950, days: [4, 8] } },
};

/**
 * Orders at or above this, after any promo discount, ship free.
 *
 * After the discount, not before: a threshold measured on the pre-discount
 * subtotal lets a code push an order under the line and still collect free
 * delivery, which is two promotions stacked where the shop offered one.
 */
export const FREE_DELIVERY_FROM = 100_000;

export type DeliveryQuote = {
  /** what the customer pays for delivery — 0 when free */
  fee: number;
  /** the price before the free-delivery threshold or a code waived it */
  listFee: number;
  free: boolean;
  days: [number, number];
};

/**
 * The delivery line for one wilaya and method.
 *
 * `goodsTotal` is the order after discounts; `waived` is a promo code that
 * makes delivery free on its own. Returns null for an unknown wilaya — the
 * checkout shows "choose your wilaya" rather than a guessed price.
 */
export function quoteDelivery(
  wilayaCode: string,
  method: DeliveryMethod,
  goodsTotal: number,
  waived = false,
): DeliveryQuote | null {
  const zone = ZONE_OF[wilayaCode];
  if (!zone) return null;

  const rate = ZONE_FEES[zone][method];
  const free = waived || goodsTotal >= FREE_DELIVERY_FROM;
  return { fee: free ? 0 : rate.fee, listFee: rate.fee, free, days: rate.days };
}

/** The cheapest delivery anywhere — the "dès 250 DA" the cart shows before a
    wilaya is known. */
export const lowestFee = (): number =>
  Math.min(...Object.values(ZONE_FEES).flatMap((z) => [z.home.fee, z.pickup.fee]));

/** Wilayas without a zone. Empty is correct; anything else is a bug. */
export function auditShipping(): string[] {
  return WILAYAS.filter((w) => !ZONE_OF[w.code]).map((w) => `wilaya ${w.code} ${w.name} has no delivery zone`);
}

/** The zones, nearest first — the order the help page lists them in. */
export const ZONES: Zone[] = ["centre", "north", "highlands", "south", "deepSouth"];

/**
 * Every zone's rates and how many wilayas it covers, for showing the grid
 * rather than quoting one line. ⚠ The same dummy fees as `quoteDelivery`.
 */
export function zoneTable(): { zone: Zone; wilayas: number; home: Rate; pickup: Rate }[] {
  const counts = Object.values(ZONE_OF).reduce<Partial<Record<Zone, number>>>((acc, z) => ({ ...acc, [z]: (acc[z] ?? 0) + 1 }), {});
  return ZONES.map((zone) => ({ zone, wilayas: counts[zone] ?? 0, ...ZONE_FEES[zone] }));
}
