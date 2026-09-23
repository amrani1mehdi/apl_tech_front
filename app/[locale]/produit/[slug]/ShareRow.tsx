"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Link2, Share2 } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

/** how long the copied state holds before the label goes back */
const COPIED_MS = 1800;

/**
 * Share — PRD-14.
 *
 * The URL is read on click rather than during render: it is the browser's,
 * the server has no idea what it is, and reading it while rendering would
 * either mismatch on hydration or force this whole subtree to be client-only
 * for the sake of a string nothing needs until someone presses a button.
 */
export function ShareRow({ name }: { name: string }) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const whatsapp = () => {
    const text = `${t("pd.shareMsg")} ${name} — ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard refused (insecure origin, or permission denied) — say
         nothing rather than throw; the link is still in the address bar */
      return;
    }
    setCopied(true);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-line pt-6">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
        <Share2 className="h-3.5 w-3.5" />
        {t("pd.share")}
      </span>

      <motion.button
        onClick={whatsapp}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        className="group flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-[#25D366]/50 hover:text-[#128C4A]"
      >
        {/* WhatsApp is not in the icon set this site uses, and its glyph is
            the one thing that makes the button recognisable at a glance */}
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.9 11.9 0 0 0 5.71 1.454h.006c6.585 0 11.946-5.36 11.949-11.945a11.9 11.9 0 0 0-3.48-8.408" />
        </svg>
        {t("pd.shareWhatsapp")}
      </motion.button>

      <motion.button
        onClick={copy}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        aria-live="polite"
        className="relative flex items-center gap-2 overflow-hidden rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/30"
      >
        {/* Both labels ride the same grid cell, so the button never changes
            width as the word does — nothing under the cursor moves. */}
        <span className="grid">
          <AnimatePresence mode="popLayout" initial={false}>
            {copied ? (
              <motion.span
                key="done"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="col-start-1 row-start-1 flex items-center gap-2 text-accent"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                {t("pd.copied")}
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="col-start-1 row-start-1 flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" />
                {t("pd.copyLink")}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </div>
  );
}
