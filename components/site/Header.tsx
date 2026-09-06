"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/components/i18n/LocaleLink";
import { motion } from "motion/react";
import { Search, ShoppingBag, Menu, X, User } from "lucide-react";
import { Logo } from "./Logo";
import { SearchOverlay } from "./SearchOverlay";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { LOCALES, LOCALE_LABEL, splitLocale } from "@/lib/i18n";
import { NAV } from "@/lib/nav";

export function Header() {
  const pathname = usePathname();
  const { count, openCart, bump } = useCart();
  const { t, locale, setLocale } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  /** stays mounted through the collapse so the circle can animate shut */
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [menuOrigin, setMenuOrigin] = useState({ x: 0, y: 0, r: 0 });

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    setMenuOrigin({
      x,
      y,
      r: Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
    });
    setMenuMounted(true);
    setOpen(true);
  };

  /** collapse starts on the same tick as the click — no frame of delay */
  const closeMenu = useCallback(() => {
    setMenuExpanded(false);
    setOpen(false);
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  // where the circular reveal should grow from — the icon the user clicked
  const [searchOrigin, setSearchOrigin] = useState<{ x: number; y: number } | null>(null);

  // the path carries a locale segment now, so compare what sits under it
  const { path } = splitLocale(pathname);
  const overlay = path === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setMenuExpanded(true));
      return () => cancelAnimationFrame(raf);
    }
    const done = setTimeout(() => setMenuMounted(false), 600);
    return () => clearTimeout(done);
  }, [open]);

  // the search bar docks flush under the nav, so the nav has to be solid for
  // the two to read as one surface — even at the top of the home hero
  const over = overlay && !scrolled && !searchOpen;
  const solid = !over;
  const iconBtn = over
    ? "border-white/30 text-white/90 hover:border-white hover:text-white"
    : "border-line text-mute hover:border-ink/30 hover:text-ink";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* ── Main nav ── */}
      {/* the reveals below are children of this header, so they share its
          stacking context: the nav needs a z of its own to stay above the
          search bar (45) while the full-screen stage (90) still covers it */}
      <nav
        className={`relative z-50 transition-all duration-500 ${
          solid
            ? "border-b border-line bg-cloud/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <Link href="/" aria-label="APL TECH">
            <Logo light={over} />
          </Link>

          {/* links */}
          <ul className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => {
              const active = item.href === path;
              return (
                <li key={item.k}>
                  <Link
                    href={item.href}
                    className={`group relative py-1 text-sm font-medium transition-colors ${
                      over
                        ? "text-white/80 hover:text-white"
                        : active
                          ? "text-ink"
                          : "text-mute hover:text-ink"
                    }`}
                  >
                    {t(`nav.${item.k}`)}
                    <span
                      className={`absolute -bottom-0.5 left-0 h-px w-full origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 ${
                        active ? "scale-x-100" : "scale-x-0"
                      } ${over ? "bg-white" : "bg-ink"}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              aria-label={t("c.search")}
              // the bar leaves the nav clickable, so the icon toggles it
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setSearchOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                setSearchOpen((v) => !v);
              }}
              className={`grid h-9 w-9 place-items-center rounded-full border transition-colors ${iconBtn}`}
            >
              <Search className="h-[17px] w-[17px]" />
            </button>

            <Link
              href="/compte"
              aria-label={t("c.account")}
              className={`hidden h-9 w-9 place-items-center rounded-full border transition-colors sm:grid ${iconBtn}`}
            >
              <User className="h-[17px] w-[17px]" />
            </Link>

            {/* language */}
            <div
              className={`hidden items-center gap-1 rounded-full border p-1 sm:flex ${
                over ? "border-white/30" : "border-line"
              }`}
            >
              {LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  aria-label={l}
                  className={`relative grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-medium transition-colors ${
                    locale === l
                      ? "text-white"
                      : over
                        ? "text-white/60 hover:text-white"
                        : "text-faint hover:text-ink"
                  }`}
                >
                  {locale === l && (
                    <motion.span
                      layoutId="lang-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{LOCALE_LABEL[l]}</span>
                </button>
              ))}
            </div>

            <button
              onClick={openCart}
              aria-label={t("c.cart")}
              data-cart-target
              className="btn-accent group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            >
              {/* remounting on `bump` replays the CSS animation without
                  touching the button itself, so focus is never lost */}
              <span key={bump} className={bump ? "cart-bump flex items-center gap-2" : "flex items-center gap-2"}>
                <ShoppingBag className="h-[17px] w-[17px]" />
                <span className="hidden md:inline">{t("c.cart")}</span>
                {count > 0 && (
                  <span className="cart-badge-pop grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                    {count}
                  </span>
                )}
              </span>
            </button>

            <button
              aria-label={t("c.menu")}
              onClick={openMenu}
              className={`grid h-9 w-9 place-items-center rounded-full border lg:hidden ${
                over ? "border-white/30 text-white" : "border-line text-ink"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu, revealed by a circle from the burger ── */}
      {menuMounted && (
        <div
          className="reveal-veil menu-veil lg:hidden"
          data-open={menuExpanded || undefined}
          style={{
            ["--ox" as string]: `${menuOrigin.x}px`,
            ["--oy" as string]: `${menuOrigin.y}px`,
            ["--r" as string]: `${menuOrigin.r}px`,
          }}
        >
          <span className="reveal-circle" aria-hidden />

          <button
            aria-label={t("c.close")}
            onClick={closeMenu}
            className="fixed end-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/40 text-white/90 transition-colors hover:border-white hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="reveal-panel">
            <nav className="flex flex-col">
              {NAV.map((item, i) => (
                <Link
                  key={item.k}
                  href={item.href}
                  onClick={closeMenu}
                  style={{ ["--i" as string]: i }}
                  className="reveal-item border-b border-white/15 py-4 font-display text-[clamp(1.9rem,9vw,2.6rem)] font-bold text-white transition-colors hover:text-white/60"
                >
                  {t(`nav.${item.k}`)}
                </Link>
              ))}
            </nav>

            <Link
              href="/compte"
              onClick={closeMenu}
              style={{ ["--i" as string]: NAV.length }}
              className="reveal-item flex items-center gap-3 border-b border-white/15 py-4 font-display text-[clamp(1.9rem,9vw,2.6rem)] font-bold text-white transition-colors hover:text-white/60"
            >
              <User className="h-6 w-6 opacity-60" />
              {t("c.account")}
            </Link>

            <div
              className="reveal-item mt-8 flex items-center gap-2"
              style={{ ["--i" as string]: NAV.length + 1 }}
            >
              {LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    locale === l
                      ? "border-accent bg-accent text-white"
                      : "border-white/25 text-white/70 hover:border-white hover:text-white"
                  }`}
                >
                  {LOCALE_LABEL[l]}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                closeMenu();
                openCart();
              }}
              style={{ ["--i" as string]: NAV.length + 2 }}
              className="btn-accent reveal-item mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 font-semibold"
            >
              <ShoppingBag className="h-5 w-5" /> {t("cart.viewCart")} ({count})
            </button>
          </div>
        </div>
      )}

      <SearchOverlay open={searchOpen} origin={searchOrigin} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
