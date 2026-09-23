"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Clock, Cpu, Minus, Plus, ShoppingBag, Sparkles, TriangleAlert } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Link } from "@/components/i18n/LocaleLink";
import { CountRoll } from "@/components/site/CountRoll";
import { enterBuilder } from "@/components/site/BuilderTransition";
import { withLocale } from "@/lib/i18n";
import { fill } from "@/lib/pcbuilder/engine";
import { pointsOf } from "@/lib/loyalty/program";
import { saleModeOf, stockStateOf, type Product } from "@/lib/products";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** how long the button holds its confirmed state */
const ADDED_MS = 1500;

/**
 * Availability, the reason to hurry, and the buttons — PRD-04 through PRD-09.
 *
 * They live in one component because they are one decision: the sale mode
 * picks the banner, the wording and which buttons exist at all, and splitting
 * that across three files is how a product ends up offering "Commander" under
 * a banner saying it cannot be ordered.
 */
export function BuyBox({ product: p, variant }: { product: Product; variant?: string }) {
  const { addItem } = useCart();
  const { t, locale } = useLocale();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const mode = saleModeOf(p);
  const state = stockStateOf(p);
  const sellable = mode !== "builder" && state !== "out";
  const earns = pointsOf(p);

  const add = () => {
    addItem(
      { slug: p.slug, name: p.name, image: p.image, price: p.price, variant },
      qty,
      document.querySelector<HTMLImageElement>("[data-hero-image]"),
    );
    setAdded(true);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => setAdded(false), ADDED_MS);
  };

  const orderNow = () => {
    add();
    router.push(withLocale("/panier", locale));
  };

  /* PRD-08 — the configurator is told which part it is building around, so
     the customer does not have to find it again on the other side.
     This is a button rather than a link, so the builder's entry transition
     cannot catch the click: it is offered the navigation instead, and we make
     it ourselves if it declines. */
  const toBuilder = () => {
    const href = withLocale(`/configurateur?part=${encodeURIComponent(p.slug)}`, locale);
    if (!enterBuilder(href)) router.push(href);
  };

  return (
    <div>
      {/* ── PRD-04: what state this thing is actually in ── */}
      <Availability product={p} />

      {/* ── PRD-05 / PRD-07 / PRD-08: the banner the mode calls for ── */}
      <AnimatePresence mode="wait" initial={false}>
        {state === "low" && (
          <Banner
            key="low"
            tone="warn"
            icon={<TriangleAlert className="h-4 w-4" />}
            title={t("pd.lowStock").replace("{n}", String(p.stockCount ?? 0))}
            body={t("pd.lowStockNote")}
          />
        )}
        {mode === "preorder" && (
          <Banner
            key="pre"
            tone="calm"
            icon={<Clock className="h-4 w-4" />}
            title={t("pd.preorderTitle")}
            body={p.preorderEta ? `${t("pd.preorderBody")} ${p.preorderEta}` : t("pd.preorderBody")}
          />
        )}
        {mode === "builder" && (
          <Banner
            key="build"
            tone="calm"
            icon={<Cpu className="h-4 w-4" />}
            title={t("pd.builderTitle")}
            body={t("pd.builderBody")}
          />
        )}
      </AnimatePresence>

      {/* ── PRD-09 / PRD-08: the buttons themselves ── */}
      <div className="mt-7">
        {mode === "builder" ? (
          /* Not "disabled Commander" — a different action. The part is
             perfectly available, just not on its own, and a greyed-out button
             would say the opposite. */
          <motion.button
            onClick={toBuilder}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            className="btn-accent group flex w-full items-center justify-center gap-2.5 rounded-full px-7 py-4 text-sm font-semibold"
          >
            <Cpu className="h-[18px] w-[18px]" />
            {t("pd.addToBuilder")}
          </motion.button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-line">
              <button
                aria-label="-"
                disabled={!sellable}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-12 w-12 place-items-center rounded-full text-ink transition-colors hover:text-accent disabled:text-faint"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="grid w-8 place-items-center font-medium tabular-nums">
                <CountRoll value={qty} />
              </span>
              <button
                aria-label="+"
                disabled={!sellable}
                onClick={() => setQty((q) => q + 1)}
                className="grid h-12 w-12 place-items-center rounded-full text-ink transition-colors hover:text-accent disabled:text-faint"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* primary */}
            <motion.button
              disabled={!sellable}
              onClick={orderNow}
              whileTap={reduced || !sellable ? undefined : { scale: 0.98 }}
              className="btn-accent flex min-w-[200px] flex-1 items-center justify-center gap-2.5 rounded-full px-7 py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === "preorder" ? t("pd.preorderCta") : t("pd.orderNow")}
            </motion.button>

            {/* secondary — the label swaps in place so the button keeps its
                width and nothing under the cursor moves */}
            <motion.button
              disabled={!sellable}
              onClick={add}
              whileTap={reduced || !sellable ? undefined : { scale: 0.98 }}
              className="flex items-center justify-center rounded-full border border-line px-7 py-4 text-sm font-semibold text-ink transition-colors hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="grid">
                <span
                  className={`col-start-1 row-start-1 flex items-center gap-2 transition-all duration-200 ease-out ${
                    added ? "-translate-y-[70%] opacity-0" : "translate-y-0 opacity-100"
                  }`}
                >
                  <ShoppingBag className="h-[18px] w-[18px]" />
                  {t("c.addToCart")}
                </span>
                <span
                  aria-hidden={!added}
                  className={`pointer-events-none col-start-1 row-start-1 flex items-center gap-2 text-accent transition-all duration-200 ease-out ${
                    added ? "translate-y-0 opacity-100" : "translate-y-[70%] opacity-0"
                  }`}
                >
                  <Check className="h-[18px] w-[18px]" strokeWidth={3} />
                  {t("c.added")}
                </span>
              </span>
            </motion.button>
          </div>
        )}
      </div>

      {/* ── MODULE 8, FID-01: what it earns, where the price is still in view.
          A link, because most people meet the programme here first and the
          natural next question is what the points are for. Builder-only parts
          say nothing: they are not bought on their own, and the configuration
          they go into earns on its own lines. */}
      {mode !== "builder" && earns > 0 && (
        <Link
          href="/compte"
          className="group mt-5 inline-flex items-center gap-2 text-[12.5px] text-mute transition-colors hover:text-ink"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
          <span>{fill(t("fid.earn"), { n: earns.toLocaleString("fr-FR") })}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-faint transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/** PRD-04 — said plainly, in one line, with the dot carrying the state. */
function Availability({ product: p }: { product: Product }) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const state = stockStateOf(p);

  const look = {
    in: { dot: "bg-accent", text: "text-ink", label: t("pd.inStock") },
    low: { dot: "bg-amber-500", text: "text-ink", label: t("pd.inStock") },
    preorder: { dot: "bg-sky-500", text: "text-ink", label: t("c.preorder") },
    out: { dot: "bg-faint", text: "text-mute", label: t("pd.outOfStock") },
  }[state];

  return (
    <p className={`mt-3 flex items-center gap-2 text-sm font-medium ${look.text}`}>
      <span className="relative grid h-2 w-2 place-items-center">
        <span className={`h-2 w-2 rounded-full ${look.dot}`} />
        {/* Only the one that is running out gets a pulse. A page where every
            state pulses is a page where the pulse means nothing. */}
        {state === "low" && !reduced && (
          <motion.span
            animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            className={`absolute h-2 w-2 rounded-full ${look.dot}`}
          />
        )}
      </span>
      {look.label}
    </p>
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: "warn" | "calm";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const reduced = useReducedMotion();
  const skin =
    tone === "warn"
      ? "border-amber-500/30 bg-amber-500/8 text-amber-700"
      : "border-accent/25 bg-accent/6 text-accent";

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: reduced ? 0.15 : 0.4, ease: EASE_OUT }}
      className={`mt-5 flex gap-3 rounded-xl border px-4 py-3.5 ${skin}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-mute">{body}</span>
      </span>
    </motion.div>
  );
}
