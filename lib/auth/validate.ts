/**
 * The account forms' rules.
 *
 * Checked in the browser so a mistake is pointed at while the customer is
 * still looking at the field. The server checks the same things again when
 * there is one — a rule enforced only in a page is a suggestion.
 */

import { isValidPhone, normalizePhone } from "@/lib/checkout/validate";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (input: string): boolean => EMAIL.test(input.trim());

export const normalizeEmail = (input: string): string => input.trim().toLowerCase();

/**
 * What someone typed into "phone or e-mail".
 *
 * An @ decides it: nobody's phone number has one, and "0770…" with a typo in
 * it is still a phone number that needs fixing, not an e-mail address.
 */
export function identifierKind(input: string): "phone" | "email" | null {
  const v = input.trim();
  if (!v) return null;
  if (v.includes("@")) return isValidEmail(v) ? "email" : null;
  return isValidPhone(v) ? "phone" : null;
}

/** The identifier as accounts are looked up by. */
export function normalizeIdentifier(input: string): string {
  return input.includes("@") ? normalizeEmail(input) : normalizePhone(input);
}

export type Strength = 0 | 1 | 2 | 3 | 4;

/* The passwords people actually pick first. Short on purpose: a long list in
   a page is a download, and the server is where a real one belongs. */
const COMMON = new Set([
  "password",
  "motdepasse",
  "azerty123",
  "azertyuiop",
  "qwerty123",
  "12345678",
  "123456789",
  "1234567890",
  "00000000",
  "11111111",
  "apltech",
  "apltech123",
  "algerie",
  "algerie213",
  "dzair213",
]);

/**
 * How hard a password is to guess, from 0 (nothing typed) to 4.
 *
 *   1  too short, or one everybody uses — not accepted
 *   2  eight or more, letters and digits — the minimum
 *   3  that, plus mixed case or a symbol
 *   4  that, at twelve or more
 *
 * A score and not a checklist of rules, because the rules are there to push
 * towards a better password, not to be met one at a time and forgotten.
 */
export function passwordStrength(password: string): Strength {
  if (!password) return 0;
  if (password.length < 8 || COMMON.has(password.toLowerCase())) return 1;
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 1;

  const varied = (/\p{Lu}/u.test(password) && /\p{Ll}/u.test(password)) || /[^\p{L}\d]/u.test(password);
  if (!varied) return 2;
  return password.length >= 12 ? 4 : 3;
}

export const isAcceptablePassword = (password: string): boolean => passwordStrength(password) >= 2;

export type SignUpForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

export const emptySignUp = (): SignUpForm => ({ firstName: "", lastName: "", phone: "", email: "", password: "" });

export type SignUpError = "required" | "phone" | "email" | "weak";
export type SignUpErrors = Partial<Record<keyof SignUpForm, SignUpError>>;

/** In the order the fields appear, so the first error is the highest one. */
export const SIGN_UP_ORDER: (keyof SignUpForm)[] = ["firstName", "lastName", "phone", "email", "password"];

export function validateSignUp(form: SignUpForm): SignUpErrors {
  const errors: SignUpErrors = {};
  const blank = (v: string) => v.trim() === "";

  if (blank(form.firstName)) errors.firstName = "required";
  if (blank(form.lastName)) errors.lastName = "required";

  if (blank(form.phone)) errors.phone = "required";
  else if (!isValidPhone(form.phone)) errors.phone = "phone";

  /* optional — but a typo in one that was given is worth catching */
  if (!blank(form.email) && !isValidEmail(form.email)) errors.email = "email";

  if (!form.password) errors.password = "required";
  else if (!isAcceptablePassword(form.password)) errors.password = "weak";

  return errors;
}
