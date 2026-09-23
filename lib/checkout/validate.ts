/**
 * The order form's rules — MODULE 5, PAN-03.
 *
 * Checked in the browser for the customer's sake, so a mistake is pointed at
 * before the button is pressed. The server will check the same things again;
 * a rule enforced only in a page is a rule anyone with the dev tools open can
 * skip.
 */

import type { DeliveryMethod } from "./shipping";

/**
 * A phone number as it will be stored: digits only, national format.
 *
 * People write Algerian numbers every way there is — "0770 12 34 56",
 * "+213 770 12 34 56", "00213770123456", "0770-12-34-56". All of those are
 * one number, and the courier dials one format.
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+213")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("00213")) digits = "0" + digits.slice(5);
  else if (digits.startsWith("213") && digits.length === 12) digits = "0" + digits.slice(3);
  return digits.replace(/\+/g, "");
}

/** Mobile — 05, 06 or 07 then eight digits — or a landline, 02 to 04 then
    seven. A courier can reach either; the form asks for a mobile first. */
export function isValidPhone(input: string): boolean {
  const n = normalizePhone(input);
  return /^0[567]\d{8}$/.test(n) || /^0[234]\d{7}$/.test(n);
}

/** "0770123456" → "0770 12 34 56", the way it is read out. */
export function formatPhone(input: string): string {
  const n = normalizePhone(input);
  if (/^0[567]\d{8}$/.test(n)) return `${n.slice(0, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
  if (/^0[234]\d{7}$/.test(n)) return `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`;
  return input.trim();
}

export type CheckoutForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  wilaya: string;
  commune: string;
  address: string;
};

export const emptyForm = (): CheckoutForm => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  wilaya: "",
  commune: "",
  address: "",
});

export type FieldError = "required" | "phone" | "email";
export type FormErrors = Partial<Record<keyof CheckoutForm, FieldError>>;

/** In the order the fields appear, so "the first error" is the one highest on
    the page — the one the form scrolls to. */
export const FIELD_ORDER: (keyof CheckoutForm)[] = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "wilaya",
  "commune",
  "address",
];

export function validateForm(form: CheckoutForm, method: DeliveryMethod): FormErrors {
  const errors: FormErrors = {};
  const blank = (v: string) => v.trim() === "";

  if (blank(form.firstName)) errors.firstName = "required";
  if (blank(form.lastName)) errors.lastName = "required";

  if (blank(form.phone)) errors.phone = "required";
  else if (!isValidPhone(form.phone)) errors.phone = "phone";

  /* Optional, but a typo in one that was given is worth catching — it is the
     only address the confirmation can be sent to. */
  if (!blank(form.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errors.email = "email";

  if (blank(form.wilaya)) errors.wilaya = "required";
  if (blank(form.commune)) errors.commune = "required";

  /* A pickup has no door to knock on. */
  if (method === "home" && blank(form.address)) errors.address = "required";

  return errors;
}
