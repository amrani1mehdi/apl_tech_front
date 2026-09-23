/**
 * The shop's contact details, its hours, and the contact form's rules.
 *
 * ⚠ The phone, e-mail and address below are the placeholders the site has
 * shown so far (the footer carries the same ones) — replace them here with the
 * real ones.
 */

import { isValidPhone, normalizePhone } from "@/lib/checkout/validate";
import { isOrderNumber, normalizeOrderNumber } from "@/lib/checkout/tracking";

export const SHOP = {
  /** as dialled */
  phone: "+213770000000",
  /** as read */
  phoneDisplay: "0770 00 00 00",
  /** wa.me wants the number without + or leading zero */
  whatsapp: "213770000000",
  email: "contact@apltech.dz",
  address: "Alger Centre, Algérie",
} as const;

/* ── hours ── */

export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 18;
/** 0 is Sunday. Friday is the day off. */
export const CLOSED_DAYS: readonly number[] = [5];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The day and time in Algiers, whatever the visitor's own clock says — the
 * shop opens at nine where the shop is.
 */
export function algiersClock(date: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Algiers",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return { day: WEEKDAYS.indexOf(part("weekday")), minutes: Number(part("hour")) * 60 + Number(part("minute")) };
}

export type ShopStatus =
  | { open: true; closesAt: number }
  /** `inDays` 0 is later today, 1 tomorrow */
  | { open: false; inDays: number; day: number; opensAt: number };

export function shopStatus(date: Date): ShopStatus {
  const { day, minutes } = algiersClock(date);
  const workday = (d: number) => !CLOSED_DAYS.includes(d);

  if (workday(day) && minutes >= OPEN_HOUR * 60 && minutes < CLOSE_HOUR * 60) return { open: true, closesAt: CLOSE_HOUR };
  if (workday(day) && minutes < OPEN_HOUR * 60) return { open: false, inDays: 0, day, opensAt: OPEN_HOUR };
  for (let i = 1; i <= 7; i++) {
    const next = (day + i) % 7;
    if (workday(next)) return { open: false, inDays: i, day: next, opensAt: OPEN_HOUR };
  }
  return { open: false, inDays: 1, day: (day + 1) % 7, opensAt: OPEN_HOUR };
}

/* ── the form ── */

export type ContactTopic = "order" | "build" | "warranty" | "other";
export const TOPICS: ContactTopic[] = ["order", "build", "warranty", "other"];

export type ContactForm = {
  topic: ContactTopic | null;
  name: string;
  phone: string;
  orderNumber: string;
  message: string;
};

export type ContactField = "name" | "phone" | "orderNumber" | "message";
export type ContactError = "required" | "phone" | "orderNumber" | "short";

/** In the order the fields appear, so the first error is the highest one. */
export const CONTACT_ORDER: ContactField[] = ["name", "phone", "orderNumber", "message"];

/* A message has to say something — "bonjour" alone means a call back to ask
   what it was about. */
export const MESSAGE_MIN = 10;

export function validateContact(form: ContactForm): Partial<Record<ContactField, ContactError>> {
  const errors: Partial<Record<ContactField, ContactError>> = {};

  if (!form.name.trim()) errors.name = "required";

  if (!form.phone.trim()) errors.phone = "required";
  else if (!isValidPhone(form.phone)) errors.phone = "phone";

  /* optional, and only asked for about an order — but a mistyped one sends
     the shop looking for the wrong order */
  if (form.topic === "order" && form.orderNumber.trim() && !isOrderNumber(form.orderNumber)) errors.orderNumber = "orderNumber";

  if (!form.message.trim()) errors.message = "required";
  else if (form.message.trim().length < MESSAGE_MIN) errors.message = "short";

  return errors;
}

/**
 * ⚠ FRONT-END STAND-IN. Nothing is sent: the message is kept in this browser
 * so the flow can be used end to end. The backend version delivers it to the
 * shop (e-mail, a dashboard, a WhatsApp notification — to be decided) and
 * answers in the same shape.
 */
export async function sendMessage(form: ContactForm): Promise<{ ok: true; sentAt: number }> {
  await new Promise((r) => setTimeout(r, 900));
  const sentAt = Date.now();
  const message = {
    topic: form.topic,
    name: form.name.trim(),
    phone: normalizePhone(form.phone),
    orderNumber: form.topic === "order" && form.orderNumber.trim() ? normalizeOrderNumber(form.orderNumber) : undefined,
    message: form.message.trim(),
    sentAt,
  };
  try {
    const stored: unknown = JSON.parse(localStorage.getItem("apltech-messages") ?? "[]");
    localStorage.setItem("apltech-messages", JSON.stringify([message, ...(Array.isArray(stored) ? stored : [])]));
  } catch {
    /* storage unavailable — the flow carries on regardless */
  }
  return { ok: true, sentAt };
}
