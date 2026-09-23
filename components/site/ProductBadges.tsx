"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  badgeKinds,
  discountPct,
  type BadgeKind,
  type BadgeTone,
  type Product,
} from "@/lib/products";

const LABEL: Record<BadgeKind, string> = {
  promo: "badge.promo",
  new: "badge.new",
  preorder: "badge.preorder",
  out: "badge.out",
};

/** Hand-written badge colours; the gradients live in globals.css. */
export const BADGE_TONE: Record<BadgeTone, string> = {
  sale: "badge-sale",
  new: "badge-new",
  gold: "badge-gold",
  brand: "badge-brand",
  electric: "badge-electric",
  ink: "badge-ink",
};

/* Each derived state has its own colour. Promo and new are the loud ones
   because they are selling something; out-of-stock stays quiet, because a
   loud badge saying you cannot have the thing is just noise on every card
   that carries it. */
const TONE: Record<BadgeKind, string> = {
  promo: BADGE_TONE.sale,
  new: BADGE_TONE.new,
  preorder: "badge-preorder",
  out: "bg-paper/90 text-mute backdrop-blur",
};

/**
 * The badge stack. Promo and Nouveau describe the offer and sit together at
 * the start edge; Précommande and Rupture describe availability and are
 * mutually exclusive by construction, so the caller can place them apart.
 */
export function ProductBadges({
  product: p,
  only,
  className = "",
}: {
  product: Product;
  /** limit to badges about the offer, or about availability */
  only?: "offer" | "availability";
  className?: string;
}) {
  const { t } = useLocale();

  /* Some products carry a hand-written badge ("Top vente"). On a promo that
     label IS the discount, so it fills the promo slot; on anything else it is
     an editorial line the derivation knows nothing about, and dropping it
     would quietly lose it — so it gets a slot of its own, and suppresses the
     generic "Nouveau" that would otherwise sit beside a label saying much the
     same thing. */
  const authored = p.oldPrice === undefined ? p.badge : undefined;

  const badges: { key: string; label: string; tone: string }[] = [];
  for (const kind of badgeKinds(p)) {
    if (only === "offer" && kind !== "promo" && kind !== "new") continue;
    if (only === "availability" && kind !== "preorder" && kind !== "out") continue;
    if (kind === "new" && authored) continue;
    const label =
      kind === "promo" ? (p.badge?.label ?? `-${discountPct(p)}%`) : t(LABEL[kind]);
    badges.push({ key: kind, label, tone: TONE[kind] });
  }

  if (authored && only !== "availability") {
    badges.unshift({
      key: "authored",
      label: authored.label,
      tone: BADGE_TONE[authored.tone],
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className={`pointer-events-none flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((b) => (
        <span
          key={b.key}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${b.tone}`}
        >
          {/* <bdi> because a badge is as often a technical run as a word.
              "-12%" holds no strong character at all, so an RTL page resolved
              its sign and its percent to the paragraph direction and rendered
              the whole thing as "12%-". Isolating it lets the algorithm treat
              it as one unit and fall back to LTR inside — which is how a
              discount is written in every language this shop speaks. */}
          <bdi className="[unicode-bidi:plaintext]">{b.label}</bdi>
        </span>
      ))}
    </div>
  );
}

/** One line of plain availability, for layouts with room to say it in words. */
export function StockLine({ product: p, className = "" }: { product: Product; className?: string }) {
  const { t } = useLocale();
  const state = p.preorder ? "pre" : p.stock ? "in" : "out";
  const label = state === "pre" ? t("c.preorder") : state === "in" ? t("c.inStock") : t("c.outOfStock");

  return (
    <p className={`flex items-center gap-1.5 text-xs ${className}`}>
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          state === "out" ? "bg-faint" : state === "pre" ? "bg-accent/50" : "bg-accent"
        }`}
      />
      <span className={state === "out" ? "text-faint" : "text-mute"}>{label}</span>
    </p>
  );
}
