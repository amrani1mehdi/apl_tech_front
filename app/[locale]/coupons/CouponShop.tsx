"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Banknote, Check, Loader2, Lock, Percent, Truck } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { promoEffect } from "@/components/checkout/PromoField";
import { formatPoints } from "@/components/loyalty/format";
import { buyCoupon, type Card } from "@/lib/loyalty/card";
import { COUPONS, TIERS, tierReaches, type Coupon, type Tier } from "@/lib/loyalty/program";
import type { PromoKind } from "@/lib/checkout/promo";
import { fill } from "@/lib/pcbuilder/engine";
import { formatDA } from "@/lib/products";
import type { Account } from "@/lib/auth/accounts";

/**
 * The coupon shop — FID-05.
 *
 * Laid out as the programme actually works: one shelf per tier, climbing.
 * The tier is said once, on the shelf, instead of on every coupon — six
 * chips repeating "Bronze, Bronze, Argent…" label the furniture rather than
 * the goods, and never show that the tiers are a ladder at all.
 *
 * Coupons above the customer's tier stay on the page. "Réservé au niveau Or"
 * is the programme working — it is the reason to keep buying — and a shelf
 * that silently shortens as you look at it teaches nobody anything. What it
 * never does is let the button be pressed.
 */
export function CouponShop({ account, card }: { account: Account; card: Card }) {
  const { t } = useLocale();

  /* One coupon at a time: the id being bought, the id just bought, and any
     refusal — all keyed by id so a message can only ever appear on the
     ticket it belongs to. */
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const buy = async (coupon: Coupon) => {
    setBusy(coupon.id);
    setError(null);
    const result = await buyCoupon(account, coupon.id);
    setBusy(null);

    if (!result.ok) {
      setError({ id: coupon.id, message: t(`fid.shop.err.${result.reason}`) });
      return;
    }
    setDone(coupon.id);
    window.setTimeout(() => setDone((id) => (id === coupon.id ? null : id)), 2600);
  };

  const shelves = TIERS.map((tier) => ({
    tier,
    coupons: COUPONS.filter((c) => c.tier === tier.key),
  })).filter((s) => s.coupons.length > 0);

  /* No heading of its own: the page's own title says what this is, and a
     second "Boutique de coupons" under it would be the same words twice. */
  return (
    <section aria-label={t("fid.shop")} className="max-w-[1160px]">
      <p className="max-w-xl text-[15px] leading-relaxed text-mute">{t("fid.shop.subtitle")}</p>

      <div className="mt-9 flex flex-col gap-10">
        {shelves.map(({ tier, coupons }) => (
          <Shelf key={tier.key} tier={tier} card={card}>
            {coupons.map((coupon) => (
              <Ticket
                key={coupon.id}
                coupon={coupon}
                card={card}
                busy={busy === coupon.id}
                done={done === coupon.id}
                error={error?.id === coupon.id ? error.message : null}
                onBuy={() => void buy(coupon)}
              />
            ))}
          </Shelf>
        ))}
      </div>
    </section>
  );
}

/** Which of the three kinds a coupon is, at a glance. */
function Kind({ kind, className }: { kind: PromoKind; className?: string }) {
  const Icon = kind === "shipping" ? Truck : kind === "percent" ? Percent : Banknote;
  return <Icon className={className} strokeWidth={2} aria-hidden />;
}

/** A tier's row, with the one line that says where the customer stands
    against it — their own shelf, or how far off it is. */
function Shelf({ tier, card, children }: { tier: Tier; card: Card; children: React.ReactNode }) {
  const { t } = useLocale();

  const reached = tierReaches(card.tier.key, tier.key);
  const here = card.tier.key === tier.key;
  const away = tier.from - card.lifetime;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold tracking-[0.02em] ${
            reached ? `tier-${tier.key}` : "bg-ink/[0.05] text-faint"
          }`}
        >
          {t(`fid.tier.${tier.key}`)}
        </span>
        <span className="h-px flex-1 bg-line-soft" aria-hidden />
        {here ? (
          <span className="shrink-0 text-[12.5px] font-medium text-accent">{t("fid.shop.yourTier")}</span>
        ) : !reached ? (
          <span className="shrink-0 text-[12.5px] text-mute">
            {fill(t("fid.shop.away"), { n: formatPoints(away, t) })}
          </span>
        ) : null}
      </div>

      {/* The shelf has the page's full width now, so it can hold two tickets
          from lg — and exactly two, which is what a tier holds. A third
          column would leave a hole on every shelf. The section is capped
          above so the pair never stretches thin on a wide screen. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
    </div>
  );
}

function Ticket({
  coupon,
  card,
  busy,
  done,
  error,
  onBuy,
}: {
  coupon: Coupon;
  card: Card;
  busy: boolean;
  done: boolean;
  error: string | null;
  onBuy: () => void;
}) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();

  const locked = !tierReaches(card.tier.key, coupon.tier);
  const short = Math.max(0, coupon.cost - card.balance);
  const live = !locked && short === 0;
  const min = coupon.grant.minSubtotal;

  /* The line under the value carries one thing at a time: what went wrong,
     what just happened, or the coupon's own terms. */
  const terms = min
    ? fill(t("fid.shop.meta"), { min: formatDA(min, locale), n: coupon.validDays })
    : fill(t("fid.shop.valid"), { n: coupon.validDays });
  const note = error ?? (done ? t("fid.shop.done") : terms);
  const noteTone = error ? "text-alert" : done ? "text-accent" : "text-mute";

  /* No entrance of its own. The card above already carries the page's one
     arriving moment, and six tickets fading up in sequence would turn a shelf
     you are meant to read at a glance into a queue. Motion here answers a
     press instead — see the button. */
  return (
    <article className={`ticket ${locked ? "ticket-locked" : ""} ${live ? "ticket-live" : ""}`}>
      <span className="ticket-notch ticket-notch-top" aria-hidden />
      <span className="ticket-notch ticket-notch-bottom" aria-hidden />
      <span className="ticket-perf" aria-hidden />

      {/* ── the body: what it takes off ──
          Centred rather than stacked from the top. The ticket's height is set
          by the tallest on its row, and content pinned to the top left a hole
          under every short one. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center p-5 pe-7">
        <p
          className={`font-display text-[clamp(1.3rem,3.2vw,1.6rem)] font-bold leading-[1.1] tracking-[-0.01em] ${
            locked ? "text-mute" : "text-ink"
          }`}
        >
          {promoEffect(coupon.grant, t, locale)}
        </p>

        {/* One line, one sentence: what the coupon asks for and how long it
            lasts, read together rather than stacked as two labels. The icon
            says which of the three kinds it is — delivery, a sum off, or a
            percentage — which is the difference a shelf of twelve needs. */}
        <p aria-live="polite" className={`mt-2 flex items-start gap-1.5 text-[12.5px] leading-snug ${noteTone}`}>
          <Kind kind={coupon.grant.kind} className="mt-[3px] h-3.5 w-3.5 shrink-0" />
          <span>{locked ? fill(t("fid.shop.locked"), { tier: t(`fid.tier.${coupon.tier}`) }) : note}</span>
        </p>
      </div>

      {/* ── the stub: what it costs ── */}
      <div
        className="flex shrink-0 flex-col justify-center gap-2 p-4 ps-6"
        style={{ width: "var(--stub)" }}
      >
        <div>
          <p className={`text-center text-[15px] font-semibold tabular-nums ${locked ? "text-mute" : "text-ink"}`}>
            {formatPoints(coupon.cost, t)}
          </p>

          {/* How close the balance is to this one — the sentence says the
              number, the bar says the distance at a glance. */}
          {!locked && short > 0 && (
            <>
              <span
                className="mt-2 block h-1 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={coupon.cost}
                aria-valuenow={card.balance}
              >
                <span
                  style={{ transform: `scaleX(${Math.min(1, card.balance / coupon.cost)})` }}
                  className="bg-accent-gradient-x block h-full w-full origin-left rounded-full transition-transform duration-700 rtl:origin-right"
                />
              </span>
              <p className="mt-1.5 text-center text-[11.5px] leading-snug text-warn">
                {fill(t("fid.shop.short"), { n: formatPoints(short, t) })}
              </p>
            </>
          )}
        </div>

        {locked ? (
          <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-faint">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
            {t(`fid.tier.${coupon.tier}`)}
          </p>
        ) : (
          <motion.button
            type="button"
            onClick={onBuy}
            disabled={busy || done}
            whileTap={reduced || busy || done ? undefined : { scale: 0.97 }}
            aria-label={`${t("fid.shop.buy")} — ${promoEffect(coupon.grant, t, locale)}`}
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-semibold transition-opacity ${
              done ? "bg-ink text-paper" : live ? "btn-accent" : "border border-line text-mute"
            } disabled:cursor-not-allowed`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {done && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
            {busy ? t("fid.shop.busy") : done ? t("c.added") : t("fid.shop.buy")}
          </motion.button>
        )}
      </div>
    </article>
  );
}
