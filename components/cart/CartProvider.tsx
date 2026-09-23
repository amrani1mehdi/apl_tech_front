"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { formatDA, getProduct } from "@/lib/products";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type CartItem = {
  slug: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  /** PRD-02 — the finish, already written out ("Noir", "Noir · 8 Go") */
  variant?: string;
  /**
   * Where this line goes when it is clicked, for anything that is not a
   * catalogue product.
   *
   * The cart used to send every row to `/produit/<slug>`, which is right for
   * the thirty-odd things the shop stocks and wrong for the one thing it
   * assembles. A configuration's slug is a synthetic id minted per build —
   * `build-mu2kjp0f-1` — so clicking one asked for a product page that has
   * never existed and never will, and the customer got a 404 for the most
   * expensive line in their basket. (Next also prefetched it on hover, so the
   * failure was already in the console before anyone clicked.)
   *
   * Locale-less on purpose: it is handed to `LocaleLink`, which prefixes the
   * language in force when the link is *rendered*. Baking `/ar/` in at the
   * moment of adding would strand a customer who switched language afterwards.
   */
  href?: string;
};

/**
 * What counts as one line of the order.
 *
 * The slug alone used to, which was true right up until a product could be
 * bought in two colours: adding the black one and then the white one would
 * find the first line, add to its quantity, and quietly ship two black ones.
 * Everything that addresses a line — removing it, changing its quantity, the
 * row's React key — goes through this.
 */
export function lineOf(i: Pick<CartItem, "slug" | "variant">): string {
  return i.variant ? `${i.slug}::${i.variant}` : i.slug;
}

/**
 * Where a line goes when it is clicked — or null when it has nowhere to go.
 *
 * Its own `href` first. Then a product page, but only for a slug the catalogue
 * actually has. Every line used to fall back to `/produit/<slug>` blindly, and
 * that fallback is a 404 for anything that is not a product: a configuration
 * put in a cart before lines carried an `href` still sits in that browser's
 * saved cart with a slug like `build-mu2kjp0f-1`, and clicking it opened
 * "This page could not be found". Such a line cannot be sent back to its
 * machine — it never recorded the parts — so it is simply not a link.
 */
export function lineHref(i: Pick<CartItem, "slug" | "href">): string | null {
  if (i.href) return i.href;
  return getProduct(i.slug) ? `/produit/${i.slug}` : null;
}

type CartCtx = {
  /** false until the saved cart has been read back from this browser — a page
      that renders "your cart is empty" before then flashes it at every visitor
      who has something in their cart */
  ready: boolean;
  items: CartItem[];
  count: number;
  subtotal: number;
  /** `origin` is the element the item flies from — usually the product image */
  addItem: (item: Omit<CartItem, "qty">, qty?: number, origin?: HTMLElement | null) => void;
  /** increments each time an item lands in the cart, so the header can react */
  bump: number;
  /** both take a line key from lineOf(), not a slug */
  removeItem: (line: string) => void;
  setQty: (line: string, qty: number) => void;
  /**
   * The promo code the customer applied — PAN-02. Only the code is held, never
   * the discount: the discount depends on what is in the cart at the moment it
   * is read, and `totalsOf` works it out fresh every time. Kept beside the
   * items and persisted with them, so a code entered on the cart page is still
   * applied at checkout and after a reload.
   */
  promoCode: string | null;
  setPromoCode: (code: string | null) => void;
  /** empties the cart and forgets the code — after an order is placed */
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

const KEY = "apltech-cart";
const PROMO_KEY = "apltech-promo";
/** must match the reveal transition in globals.css */
const COLLAPSE_MS = 600;
/** must match .cart-row-out in globals.css */
const ROW_EXIT_MS = 320;

export function CartProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useLocale();
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const [reveal, setReveal] = useState({ x: 0, y: 0, r: 0 });
  const [expanded, setExpanded] = useState(false);
  /** stays true through the collapse so the circle can animate shut */
  const [mounted, setMounted] = useState(false);
  /** rows mid-exit — held in the list long enough to play their animation */
  const [removing, setRemoving] = useState<string[]>([]);

  const [flight, setFlight] = useState<{
    id: number;
    image: string;
    x: number;
    y: number;
    w: number;
    h: number;
    dx: number;
    dy: number;
  } | null>(null);
  const [open, setOpen] = useState(false);

  /** collapse starts on the same tick as the click — no frame of delay */
  const close = useCallback(() => {
    setExpanded(false);
    setOpen(false);
  }, []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
      setPromoCode(localStorage.getItem(PROMO_KEY));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (promoCode) localStorage.setItem(PROMO_KEY, promoCode);
      else localStorage.removeItem(PROMO_KEY);
    } catch {
      /* storage blocked — the code still applies for this visit */
    }
  }, [promoCode, hydrated]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const addItem: CartCtx["addItem"] = (item, qty = 1, origin) => {
    setItems((prev) => {
      const line = lineOf(item);
      const found = prev.find((p) => lineOf(p) === line);
      if (found) return prev.map((p) => (lineOf(p) === line ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { ...item, qty }];
    });

    // Measure the trip now, while the origin is still on screen, then let CSS
    // fly a copy of the image into the cart button. The drawer waits until it
    // lands, so the two don't fight each other.
    const target = document.querySelector("[data-cart-target]");
    const from = origin?.getBoundingClientRect();

    if (!from || !target || from.width === 0) {
      setBump((b) => b + 1);
      return;
    }

    const to = target.getBoundingClientRect();
    setFlight({
      id: Date.now(),
      image: item.image,
      x: from.left,
      y: from.top,
      w: from.width,
      h: from.height,
      dx: to.left + to.width / 2 - (from.left + from.width / 2),
      dy: to.top + to.height / 2 - (from.top + from.height / 2),
    });
  };

  const onFlightEnd = () => {
    setFlight(null);
    setBump((b) => b + 1);
  };

  // Safety net: `animationend` is the precise landing, but if it is ever
  // missed (backgrounded tab, dropped frames) the flying image would sit on
  // screen forever and the drawer would never open.
  useEffect(() => {
    if (!flight) return;
    const bail = setTimeout(onFlightEnd, 1100);
    return () => clearTimeout(bail);
  }, [flight]);

  // Geometry is captured synchronously in openCart, so the veil mounts with the
  // right circle already set; this only flips it open on the next frame, and on
  // close runs the collapse before unmounting.
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setExpanded(true));
      return () => cancelAnimationFrame(raf);
    }
    const done = setTimeout(() => setMounted(false), COLLAPSE_MS);
    return () => clearTimeout(done);
  }, [open]);

  // lock the page behind the overlay
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const removeItem: CartCtx["removeItem"] = (line) =>
    setItems((prev) => prev.filter((p) => lineOf(p) !== line));

  /**
   * Drawer-only exit: keeps the row in the list for the length of its
   * animation, then drops it. The shared removeItem stays immediate so the
   * cart page's own exit animation isn't delayed on top of this one.
   */
  const removeWithExit = (line: string) => {
    setRemoving((r) => (r.includes(line) ? r : [...r, line]));
    setTimeout(() => {
      removeItem(line);
      setRemoving((r) => r.filter((x) => x !== line));
    }, ROW_EXIT_MS);
  };

  const setQty: CartCtx["setQty"] = (line, qty) =>
    setItems((prev) =>
      prev.flatMap((p) => (lineOf(p) === line ? (qty <= 0 ? [] : [{ ...p, qty }]) : [p])),
    );

  const clear = () => {
    setItems([]);
    setPromoCode(null);
  };

  const subtotal = useMemo(
    () => items.reduce((s, p) => s + p.price * p.qty, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((s, p) => s + p.qty, 0), [items]);

  return (
    <Ctx.Provider
      value={{
        ready: hydrated,
        items,
        count,
        subtotal,
        addItem,
        bump,
        removeItem,
        setQty,
        promoCode,
        setPromoCode,
        clear,
        openCart: () => {
          const rect = document.querySelector("[data-cart-target]")?.getBoundingClientRect();
          const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 80;
          const y = rect ? rect.top + rect.height / 2 : 40;
          setReveal({
            x,
            y,
            r: Math.hypot(
              Math.max(x, window.innerWidth - x),
              Math.max(y, window.innerHeight - y),
            ),
          });
          setMounted(true);
          setOpen(true);
        },
        closeCart: close,
      }}
    >
      {children}

      {/* ── item flying into the cart ── */}
      {flight && (
        <div
          key={flight.id}
          className="fly"
          aria-hidden
          onAnimationEnd={onFlightEnd}
          style={{
            left: flight.x,
            top: flight.y,
            width: flight.w,
            height: flight.h,
            ["--dx" as string]: `${flight.dx}px`,
            ["--dy" as string]: `${flight.dy}px`,
          }}
        >
          <span className="fly-arc">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flight.image} alt="" className="fly-img" />
          </span>
        </div>
      )}

      {/* ── Cart, revealed by a circle from the cart button ── */}
      {mounted && (
        <div
          className="reveal-veil cart-veil"
          data-open={expanded || undefined}
          style={{
            ["--ox" as string]: `${reveal.x}px`,
            ["--oy" as string]: `${reveal.y}px`,
            ["--r" as string]: `${reveal.r}px`,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <span className="reveal-circle" aria-hidden />

          {/* neon tubing breathing round all four edges of the screen */}
          <span className="neon-frame" aria-hidden>
            <span className="neon-t" />
            <span className="neon-r" />
            <span className="neon-b" />
            <span className="neon-l" />
          </span>

          <button
            aria-label={t("c.close")}
            onClick={close}
            className="fixed end-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/40 text-white/90 transition-colors hover:border-white hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="reveal-panel">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="flex items-center gap-3 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-white">
                <ShoppingBag className="h-7 w-7 text-white/70" />
                {t("cart.title")}
                <span className="text-white/40">({count})</span>
              </h2>
              {items.length > 0 && (
                <span className="font-display text-xl font-bold text-white">
                  {formatDA(subtotal, locale)}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-5 py-20 text-center">
                <ShoppingBag className="h-12 w-12 text-white/25" />
                <p className="text-white/60">{t("cart.empty")}</p>
                <button
                  onClick={close}
                  className="rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white transition-colors hover:border-white"
                >
                  {t("c.continueShopping")}
                </button>
              </div>
            ) : (
              <>
                <ul className="mt-7 space-y-3">
                  {items.map((it, i) => {
                    const href = lineHref(it);
                    const thumbCls = "h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-black/30";
                    /* eslint-disable-next-line @next/next/no-img-element */
                    const thumb = <img src={it.image} alt={it.name} className="h-full w-full object-cover" />;
                    return (
                    <li
                      key={lineOf(it)}
                      data-removing={removing.includes(lineOf(it)) || undefined}
                      className="cart-row reveal-item flex gap-4 rounded-xl border border-white/12 bg-white/[0.06] p-3 transition-colors hover:border-white/30"
                      style={{ ["--i" as string]: i }}
                    >
                      {href ? (
                        <Link href={href} onClick={close} className={thumbCls}>
                          {thumb}
                        </Link>
                      ) : (
                        <span className={thumbCls}>{thumb}</span>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex justify-between gap-3">
                          {href ? (
                            <Link
                              href={href}
                              onClick={close}
                              className="truncate text-sm font-medium text-white transition-colors hover:text-white/70"
                            >
                              {it.name}
                            </Link>
                          ) : (
                            <span className="truncate text-sm font-medium text-white">{it.name}</span>
                          )}
                          <button
                            aria-label="Retirer"
                            onClick={() => removeWithExit(lineOf(it))}
                            className="shrink-0 text-white/35 transition-colors hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* the finish sits between the name and the price, the
                            way it is asked for on the product page */}
                        {it.variant && (
                          <p className="mt-0.5 truncate text-xs text-white/55">{it.variant}</p>
                        )}

                        <p className="mt-0.5 text-sm font-semibold text-white/85">
                          {formatDA(it.price, locale)}
                        </p>

                        <div className="mt-auto flex items-center gap-1 self-start rounded-full border border-white/25">
                          <button
                            aria-label="Moins"
                            onClick={() =>
                              it.qty <= 1
                                ? removeWithExit(lineOf(it))
                                : setQty(lineOf(it), it.qty - 1)
                            }
                            className="grid h-7 w-7 place-items-center text-white/70 hover:text-white"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-white">
                            {it.qty}
                          </span>
                          <button
                            aria-label="Plus"
                            onClick={() => setQty(lineOf(it), it.qty + 1)}
                            className="grid h-7 w-7 place-items-center text-white/70 hover:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <p className="flex items-center gap-2 text-xs text-white/55">
                    <Truck className="h-4 w-4 text-white/40" />
                    {t("cart.codNote")}
                  </p>
                  <Link
                    href="/panier"
                    onClick={close}
                    className="btn-accent group flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold"
                  >
                    {t("cart.viewCart")}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </Ctx.Provider>
  );
}
