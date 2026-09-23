/**
 * Customer accounts — signing up, signing in, getting back in.
 *
 * ⚠ FRONT-END STAND-IN. There is no server yet, so accounts live in this
 * browser's storage and a password is checked against a hash kept next to
 * it. That is enough to design and use every screen, and it is not security:
 * anything in a page can be read and rewritten from the dev tools. The backend
 * replaces the body of each function below — they are already async and
 * already answer in the shapes the pages expect, so nothing that calls them
 * changes.
 *
 * One account always exists, so every screen can be tried without signing up
 * first: 0661 22 33 44 (or yacine.benali@exemple.dz) with the password
 * `Apltech2024`. It shares its phone with the demo orders in
 * `lib/checkout/tracking.ts`, so its order list is not empty.
 *
 * Password reset accepts any six-digit code, because no SMS is ever sent.
 */

import { formatPhone, normalizePhone } from "@/lib/checkout/validate";
import { normalizeEmail, normalizeIdentifier } from "./validate";

/** An account as a page sees it — never with its password. */
export type Account = {
  id: string;
  firstName: string;
  lastName: string;
  /** national format, digits only — the same form orders store */
  phone: string;
  email?: string;
  createdAt: number;
};

type StoredAccount = Account & { passwordHash: string };

const ACCOUNTS_KEY = "apltech-accounts";
const SESSION_KEY = "apltech-session";
const EVENT = "apltech-session";
const LATENCY = 900;

export const DEMO_ACCOUNT: Account = {
  id: "demo",
  firstName: "Yacine",
  lastName: "Benali",
  phone: "0661223344",
  email: "yacine.benali@exemple.dz",
  createdAt: Date.UTC(2025, 2, 14),
};
export const DEMO_PASSWORD = "Apltech2024";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── the hash ── */

/**
 * SHA-256 where the browser offers it. It does not over plain HTTP on a
 * network address — a phone opening the dev server by IP — so there is a
 * fallback that only has to be consistent, since none of this is protection.
 */
async function hash(password: string, salt: string): Promise<string> {
  const input = `apltech:${salt}:${password}`;
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv-${(h >>> 0).toString(16)}`;
}

/* ── storage ── */

function read<T>(storage: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const local = () => (typeof localStorage === "undefined" ? undefined : localStorage);
const session = () => (typeof sessionStorage === "undefined" ? undefined : sessionStorage);

/** Everyone who can sign in: the accounts made in this browser, and the demo
    one unless its password has been reset (which stores it like the rest). */
async function allAccounts(): Promise<StoredAccount[]> {
  const stored = read<StoredAccount[]>(local(), ACCOUNTS_KEY, []);
  if (stored.some((a) => a.id === DEMO_ACCOUNT.id)) return stored;
  return [...stored, { ...DEMO_ACCOUNT, passwordHash: await hash(DEMO_PASSWORD, DEMO_ACCOUNT.id) }];
}

function saveAccount(account: StoredAccount) {
  const stored = read<StoredAccount[]>(local(), ACCOUNTS_KEY, []).filter((a) => a.id !== account.id);
  local()?.setItem(ACCOUNTS_KEY, JSON.stringify([...stored, account]));
}

function findAccount(accounts: StoredAccount[], identifier: string): StoredAccount | undefined {
  const id = normalizeIdentifier(identifier);
  return accounts.find((a) => (identifier.includes("@") ? a.email === id : a.phone === id));
}

function publicOf(stored: StoredAccount): Account {
  const { passwordHash, ...account } = stored;
  void passwordHash;
  return account;
}

/* ── the session ── */

/**
 * Who is signed in, as a snapshot React can subscribe to.
 *
 * "Stay signed in" decides the storage: kept in localStorage it outlives the
 * browser closing, in sessionStorage it does not. The snapshot is cached by
 * its raw string so the same session is the same object — `useSyncExternalStore`
 * re-renders on every new object it is handed.
 */
let cachedRaw: string | null | undefined;
let cached: Account | null = null;

export function currentAccount(): Account | null {
  let raw: string | null = null;
  try {
    raw = local()?.getItem(SESSION_KEY) ?? session()?.getItem(SESSION_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function subscribeAccount(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  /* another tab signing in or out */
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function startSession(account: Account, remember: boolean) {
  local()?.removeItem(SESSION_KEY);
  session()?.removeItem(SESSION_KEY);
  (remember ? local() : session())?.setItem(SESSION_KEY, JSON.stringify(account));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function signOut() {
  local()?.removeItem(SESSION_KEY);
  session()?.removeItem(SESSION_KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/* ── signing in and up ── */

export type SignInResult = { ok: true; account: Account } | { ok: false; reason: "invalid" };

/**
 * One answer for an unknown phone and for a wrong password. Telling them apart
 * would confirm to anyone trying numbers which ones have accounts.
 */
export async function signIn(identifier: string, password: string, remember: boolean): Promise<SignInResult> {
  await wait(LATENCY);
  const account = findAccount(await allAccounts(), identifier);
  if (!account || account.passwordHash !== (await hash(password, account.id))) return { ok: false, reason: "invalid" };
  const signedIn = publicOf(account);
  startSession(signedIn, remember);
  return { ok: true, account: signedIn };
}

export type SignUpInput = { firstName: string; lastName: string; phone: string; email: string; password: string };
export type SignUpResult = { ok: true; account: Account } | { ok: false; reason: "phoneTaken" | "emailTaken" };

/**
 * A phone already on an account is said so — unlike signing in, where it is
 * not. The form cannot work without saying it (there is nothing else the
 * customer could fix), and it points them at signing in instead.
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  await wait(LATENCY);
  const accounts = await allAccounts();
  const phone = normalizePhone(input.phone);
  const email = input.email.trim() ? normalizeEmail(input.email) : undefined;

  if (accounts.some((a) => a.phone === phone)) return { ok: false, reason: "phoneTaken" };
  if (email && accounts.some((a) => a.email === email)) return { ok: false, reason: "emailTaken" };

  const id = `acc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const account: Account = {
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone,
    email,
    createdAt: Date.now(),
  };
  saveAccount({ ...account, passwordHash: await hash(input.password, id) });
  startSession(account, true);
  return { ok: true, account };
}

/* ── getting back in ── */

/** Where the code went, shown partly hidden: "06 •• •• •• 44". */
function maskedDestination(identifier: string): string {
  if (identifier.includes("@")) {
    const [user, domain] = normalizeEmail(identifier).split("@");
    return `${user.slice(0, 1)}•••@${domain}`;
  }
  const phone = formatPhone(identifier);
  return phone.replace(/\d(?=.*\d{2}$)/g, (d, i: number) => (i < 2 ? d : "•"));
}

export type ResetRequest = { channel: "sms" | "email"; to: string };

/**
 * Always "sent", whether an account exists or not — the same reason signing
 * in gives one answer. Someone with no account simply never gets a code.
 */
export async function requestReset(identifier: string): Promise<ResetRequest> {
  await wait(LATENCY);
  return { channel: identifier.includes("@") ? "email" : "sms", to: maskedDestination(identifier) };
}

export type ResetCheck = { ok: true } | { ok: false; reason: "invalidCode" };

export async function verifyResetCode(identifier: string, code: string): Promise<ResetCheck> {
  await wait(LATENCY);
  const account = findAccount(await allAccounts(), identifier);
  return account && /^\d{6}$/.test(code) ? { ok: true } : { ok: false, reason: "invalidCode" };
}

export type ResetResult = { ok: true; account: Account } | { ok: false; reason: "invalidCode" };

export async function resetPassword(identifier: string, code: string, password: string): Promise<ResetResult> {
  await wait(LATENCY);
  const account = findAccount(await allAccounts(), identifier);
  if (!account || !/^\d{6}$/.test(code)) return { ok: false, reason: "invalidCode" };
  saveAccount({ ...account, passwordHash: await hash(password, account.id) });
  const signedIn = publicOf(account);
  startSession(signedIn, true);
  return { ok: true, account: signedIn };
}
