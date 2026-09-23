"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Loader2, Tag, Ticket } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useOwnedCoupons } from "@/components/loyalty/useLoyalty";
import { promoOf, stateOf } from "@/lib/loyalty/wallet";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { fill } from "@/lib/pcbuilder/engine";
import { checkPromo, validatePromoCode, type Promo, type PromoCheck } from "@/lib/checkout/promo";

type T = (key: string) => string;

/**
 * Keeps a signed amount together as one left-to-right run.
 *
 * `formatDA` already isolates its digits, but a "−" written in front sits
 * *outside* that isolate — and from the outside an isolate counts as a
 * neutral character, so in Arabic the minus takes the paragraph's direction
 * and lands after the amount: "1 000− دج". Wrapping sign and number in an
 * isolate of their own settles the order inside it, and leaves the Arabic
 * around it to run right-to-left as it should.
 */
const isolate = (text: string) => `⁦${text}⁩`;

/** What a code does, in a few words — "−10 %, jusqu'à 15 000 DA". Takes the
    effect without the code, so the loyalty shop can describe a coupon it has
    not minted yet (MODULE 8) with the same words the cart will use. */
export function promoEffect(promo: Omit<Promo, "code">, t: T, locale: Parameters<typeof formatDA>[1]): string {
  if (promo.kind === "shipping") return t("promo.shipping");
  if (promo.kind === "fixed") return isolate(`−${formatDA(promo.value, locale)}`);

  /* The percentage carries its own sign and sign-spacing per language, so it
     comes from the phrasebook and is isolated whole. */
  const percent = isolate(fill(t("promo.percent"), { value: promo.value }));
  return promo.maxDiscount
    ? fill(t("promo.percentCap"), { value: percent, cap: formatDA(promo.maxDiscount, locale) })
    : percent;
}

function refusal(check: Exclude<PromoCheck, { ok: true }>, t: T, locale: Parameters<typeof formatDA>[1]): string {
  if (check.reason === "min") return fill(t("promo.err.min"), { min: formatDA(check.min, locale) });
  return t(`promo.err.${check.reason}`);
}

/**
 * The promo code — PAN-02.
 *
 * Shut until asked for. An open, empty code field on every order is an
 * invitation to leave the page and go looking for a code, and most customers
 * do not have one; a line saying one can be added costs nothing for those who
 * do.
 *
 * "Validation immédiate" is taken literally: the answer comes back where the
 * code was typed, the moment Appliquer or Enter is pressed, and it says what
 * is wrong in words — unknown, expired, or how much more the order needs —
 * rather than a red border.
 *
 * Once applied, the code is shown against the order as it is *now*, not as it
 * was when it was entered. Remove the item that carried the order past a
 * code's minimum and this says so, in amber, with the gap; the totals stop
 * applying the discount at the same moment, because both read `checkPromo`.
 */
export function PromoField({ subtotal }: { subtotal: number }) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const { promoCode, setPromoCode } = useCart();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const apply = async () => {
    setChecking(true);
    const check = await validatePromoCode(value, subtotal);
    setChecking(false);

    if (check.ok) {
      setPromoCode(check.promo.code);
      setValue("");
      setError(null);
      setOpen(false);
    } else {
      setError(refusal(check, t, locale));
      inputRef.current?.focus();
    }
  };

  /* Focus follows the field the moment it exists. It used to be asked for on
     the next frame after the click, while the link was still animating out —
     the input was not mounted yet, so focus went nowhere and the customer had
     to tap a second time to type. */
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /* ── a code is applied ── */
  if (promoCode) {
    const now = checkPromo(promoCode, subtotal);
    const tone = now.ok ? "text-mute" : now.reason === "min" ? "text-warn" : "text-alert";
    const note = now.ok
      ? promoEffect(now.promo, t, locale)
      : now.reason === "min"
        ? fill(t("promo.paused"), { gap: formatDA(now.min - subtotal, locale) })
        : t("promo.invalid");

    return (
      <div className="flex items-start gap-3 rounded-xl border border-line bg-cloud px-3.5 py-3">
        <Tag className={`mt-0.5 h-4 w-4 shrink-0 ${now.ok ? "text-accent" : tone}`} strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p
            dir="ltr"
            className={`text-[13px] font-semibold tracking-[0.02em] text-ink rtl:text-end ${now.ok ? "" : "line-through decoration-faint"}`}
          >
            {promoCode}
          </p>
          <p className={`mt-0.5 text-[12px] leading-snug ${tone}`} aria-live="polite">
            {note}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPromoCode(null)}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-mute underline-offset-2 transition-colors hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t("promo.remove")}
        </button>
      </div>
    );
  }

  /* ── no code yet ── */
  return (
    <div>
      <OwnedCoupons subtotal={subtotal} onPick={setPromoCode} />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md py-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Tag className="h-4 w-4" strokeWidth={2} />
          {t("promo.add")}
        </button>
      ) : (
        /* A div, not a form: on the checkout this field sits inside the
           order form, and a form inside a form is not valid HTML — the inner
           one is dropped by the parser and Enter would place the order. Enter
           is handled on the input instead.

           Arrives at once and only fades — no waiting on the link to leave
           first, and no height animation holding the input at zero while
           someone is already trying to type into it. */
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <label className="block text-[12px] font-medium text-mute" htmlFor={`${errorId}-input`}>
            {t("promo.label")}
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              ref={inputRef}
              id={`${errorId}-input`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (value.trim()) void apply();
                }
                if (e.key === "Escape" && !value) setOpen(false);
              }}
              placeholder={t("promo.placeholder")}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="done"
              dir="ltr"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`min-w-0 flex-1 rounded-xl border bg-white px-3.5 py-2.5 text-[14px] font-medium uppercase tracking-[0.04em] text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-faint focus:outline-none focus:ring-2 rtl:text-end ${
                error ? "border-alert focus:ring-alert/20" : "border-line focus:border-accent focus:ring-accent/15"
              }`}
            />
            <button
              type="button"
              onClick={() => void apply()}
              disabled={checking || value.trim() === ""}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-ink px-4 text-[13px] font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {checking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("promo.apply")}
            </button>
          </div>
          <p id={errorId} aria-live="polite" className="mt-1.5 min-h-[1.1rem] text-[12px] leading-snug text-alert">
            {error}
          </p>
        </motion.div>
      )}
    </div>
  );
}

/**
 * The coupons the customer already owns, offered where they are spent —
 * MODULE 8, FID-06.
 *
 * Someone who bought a coupon with their points should not have to go and
 * fetch the code: they bought it, the shop knows which ones are theirs, and
 * the cart is where it becomes money off. The code field stays for campaign
 * codes, which are the only ones that genuinely arrive from outside.
 *
 * A coupon whose minimum the order has not reached is listed anyway, with
 * the gap named. Hiding it would leave a customer wondering where the coupon
 * they just bought went; saying "1 500 DA more" turns it into a reason to
 * keep shopping.
 */
function OwnedCoupons({
  subtotal,
  onPick,
}: {
  subtotal: number;
  onPick: (code: string) => void;
}) {
  const { t, locale } = useLocale();
  const owned = useOwnedCoupons();

  const usable = owned.filter((c) => stateOf(c) === "active");
  if (usable.length === 0) return null;

  return (
    <div className="mb-3.5">
      <p className="mb-2 text-[12px] font-semibold text-mute">{t("fid.mine")}</p>

      <ul className="space-y-1.5">
        {usable.map((coupon) => {
          const promo = promoOf(coupon);
          if (!promo) return null;

          const gap = promo.minSubtotal ? Math.max(0, promo.minSubtotal - subtotal) : 0;

          return (
            <li key={coupon.code}>
              <button
                type="button"
                disabled={gap > 0}
                onClick={() => onPick(coupon.code)}
                className="group flex w-full items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 text-start transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:border-line-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Ticket
                  className={`h-4 w-4 shrink-0 ${gap > 0 ? "text-faint" : "text-accent"}`}
                  strokeWidth={2}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13px] font-semibold ${gap > 0 ? "text-mute" : "text-ink"}`}>
                    {promoEffect(promo, t, locale)}
                  </span>
                  {gap > 0 && (
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-warn">
                      {fill(t("promo.paused"), { gap: formatDA(gap, locale) })}
                    </span>
                  )}
                </span>
                {gap === 0 && (
                  <span className="shrink-0 text-[12px] font-semibold text-accent">{t("promo.apply")}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
