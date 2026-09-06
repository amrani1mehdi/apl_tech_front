"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, CornerDownLeft } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName, withLocale } from "@/lib/i18n";
import { PRODUCTS, formatDA } from "@/lib/products";

const POPULAR = ["RTX 5080", "Ryzen 9", "Helios", "OLED", "Razer"];
/** must outlast the slowest collapse — the full-screen circle in globals.css */
const REVEAL_MS = 620;
/** results hold back until the circle has swept past where they land */
const BODY_DELAY_MS = 300;
const FALLBACK_HEAD = 68;

/** circle geometry that reaches the furthest viewport corner from a centre */
function bloom(x: number, y: number) {
  return {
    x,
    y,
    r: Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
  };
}

export function SearchOverlay({
  open,
  onClose,
  origin,
}: {
  open: boolean;
  onClose: () => void;
  origin?: { x: number; y: number } | null;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  /** kept mounted through the collapse so the circle can animate shut */
  const [render, setRender] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [bodyReady, setBodyReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState({ x: 0, y: 0, r: 0, head: FALLBACK_HEAD });

  /* Two stages share one element tree: a plain bar docked under the header,
     and — from the first keystroke — the full-screen reveal. The stage is
     derived from the query, so emptying the field walks it back to the bar,
     and nothing remounts across the switch: the input keeps its focus and
     caret, every difference between the stages being a transitioned
     property. */
  const full = q.trim().length > 0;

  // ── mount, measure, then collapse again on close ──
  // state changes go through rAF so none of them land synchronously inside
  // the effect body
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        const head =
          document.querySelector("header")?.getBoundingClientRect().height ?? FALLBACK_HEAD;
        // only a fallback: the bar shows no circle, and by the time one is
        // needed it blooms from the field instead (see `onType`)
        const x = origin?.x ?? window.innerWidth - 80;
        const y = origin?.y ?? 40;
        setGeo({ ...bloom(x, y), head });
        setQ("");
        setBodyReady(false);
        setRender(true);
      });
      return () => cancelAnimationFrame(raf);
    }
    const raf = requestAnimationFrame(() => setExpanded(false));
    const done = setTimeout(() => setRender(false), REVEAL_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [open, origin]);

  // drop the bar in on the frame after mount, so it has a start value to
  // transition from. Keyed on `open` too, so reopening re-runs it.
  useEffect(() => {
    if (!render || !open) return;
    const raf = requestAnimationFrame(() => setExpanded(true));
    const focus = setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(focus);
    };
  }, [render, open]);

  // `full` only flips on a stage change, so this arms one timer per switch —
  // later keystrokes re-render the list with no delay of their own. It is
  // cleared back where the query is (on reopen, and in `onType`), never here:
  // setting state straight from an effect body cascades a render.
  useEffect(() => {
    if (!full) return;
    const id = setTimeout(() => setBodyReady(true), BODY_DELAY_MS);
    return () => clearTimeout(id);
  }, [full]);

  // the radius is measured against the viewport it was opened in, and the bar
  // stage means that can now be a long time ago — a phone keyboard alone
  // resizes it. Re-measure, or a grown viewport outruns the circle.
  useEffect(() => {
    if (!render) return;
    const onResize = () => setGeo((g) => ({ ...g, ...bloom(g.x, g.y) }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [render]);

  // ── esc to close, and lock the page behind it ──
  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [render, onClose]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return PRODUCTS.filter((p) => {
      const hay = `${p.name} ${p.brand} ${catName(p.category, locale)} ${p.specs
        .map((s) => s.v)
        .join(" ")}`.toLowerCase();
      return hay.includes(term);
    }).slice(0, 8);
  }, [q, locale]);

  const onType = useCallback(
    (value: string) => {
      // measured before the stage flips and batched with it, so the circle
      // already has its origin on the frame it starts growing. Blooming from
      // the field rather than the header icon is what keeps the text being
      // typed legible: the dark reaches it within the first frames.
      if (value.trim() && !q.trim() && fieldRef.current) {
        const box = fieldRef.current.getBoundingClientRect();
        setGeo((g) => ({ ...g, ...bloom(box.left + box.width / 2, box.top + box.height / 2) }));
      }
      // emptying the field walks back to the bar; the next stage switch has to
      // hold the results back again while the circle re-opens
      if (!value.trim() && q.trim()) setBodyReady(false);
      setQ(value);
    },
    [q],
  );

  const submit = useCallback(() => {
    if (!q.trim()) return;
    router.push(withLocale(`/catalogue?q=${encodeURIComponent(q.trim())}`, locale));
    onClose();
  }, [q, router, onClose]);

  if (!render) return null;

  const { x, y, r, head } = geo;

  return (
    <div
      className="reveal-veil search-veil"
      data-open={expanded || undefined}
      data-mode={full ? "full" : "bar"}
      style={{
        ["--ox" as string]: `${x}px`,
        ["--oy" as string]: `${y}px`,
        ["--r" as string]: `${r}px`,
        ["--head" as string]: `${head}px`,
      }}
      onMouseDown={(e) => {
        // only a click on the veil itself closes; clicks inside the panel don't
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <span className="search-scrim" aria-hidden onMouseDown={onClose} />
      <span className="reveal-circle" aria-hidden />

      <div className="search-panel">
        {/* ── the field: a strip under the header, then the headline ── */}
        <div className="search-sheet">
          <div className="search-dock">
            <div className="search-field" ref={fieldRef}>
              <Search className="search-icon" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={t("search.placeholder")}
                type="text"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className="search-input"
              />
              <button aria-label={t("c.close")} onClick={onClose} className="search-close">
                <X />
              </button>
            </div>
          </div>
        </div>

        {/* ── results, once the reveal has swept past where they land ── */}
        {full && bodyReady && (
          <div className="search-dock search-body">
            {results.length === 0 ? (
              <div className="search-fade">
                <p className="text-center text-white/60">
                  {t("search.none")} «&nbsp;{q}&nbsp;»
                </p>
                <p className="mb-4 mt-10 text-center font-sans text-[11px] font-semibold uppercase text-white/45">
                  {t("search.popular")}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {POPULAR.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQ(term)}
                      className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/85 transition-colors hover:border-white hover:text-white"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <p className="search-fade mb-4 font-sans text-[11px] font-semibold uppercase text-white/45">
                  {results.length} {results.length > 1 ? t("cata.results") : t("cata.result")}
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {results.map((p, i) => (
                    <li key={p.slug} className="search-hit" style={{ ["--i" as string]: i }}>
                      <Link
                        href={`/produit/${p.slug}`}
                        onClick={onClose}
                        className="group block overflow-hidden rounded-xl border border-white/15 bg-white/[0.07] transition-colors hover:border-white/40 hover:bg-white/[0.13]"
                      >
                        <span className="block aspect-[4/3] overflow-hidden bg-black/30">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </span>
                        <span className="block p-3">
                          <span className="block font-sans text-[10px] font-semibold uppercase text-white/45">
                            {catName(p.category, locale)}
                          </span>
                          <span className="mt-1 block truncate text-sm font-medium text-white">
                            {p.name}
                          </span>
                          <span className="mt-1.5 block font-display text-sm font-bold text-white">
                            {formatDA(p.price)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={submit}
                  className="search-fade mt-6 flex w-full items-center justify-between rounded-xl border border-white/20 px-5 py-3.5 text-sm font-medium text-white transition-colors hover:border-white/50"
                >
                  <span className="flex items-center gap-2">
                    {t("search.all")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/45">
                    <CornerDownLeft className="h-3.5 w-3.5" /> Entrée
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
