"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { splitLocale } from "@/lib/locales";
import { fill } from "@/lib/pcbuilder/engine";
import { Rig } from "./Rig";
import { useRig, type RigState } from "./machine";

const TABS = [
  { href: "/connexion", key: "auth.tab.signIn" },
  { href: "/inscription", key: "auth.tab.signUp" },
] as const;

/* the drawing-board dots, in the dark */
const DOTS = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
} as const;

function captionOf(s: RigState, t: (key: string) => string): string {
  if (s.label) return fill(t(s.label), { name: s.name ?? "" });
  if (s.mode === "success" && s.name) return fill(t("auth.rig.welcome"), { name: s.name });
  return t(`auth.rig.${s.mode}`);
}

/**
 * The frame the account pages share: the page split down the middle, the form
 * on one half, the machine on the other.
 *
 * Edge to edge rather than a card on the page. The dark half runs up under the
 * header, which is the same ink, so the two read as one surface and the
 * machine gets the whole height of the screen. On a long form (signing up) it
 * stays pinned while the form scrolls past it.
 *
 * A layout rather than a component each page renders, so moving between
 * "sign in" and "create an account" swaps the form and leaves the machine
 * running — the tab pill slides, the new form rises in, and the lights carry
 * on from where they were.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const { path } = splitLocale(usePathname());
  const state = useRig();
  const onTabs = TABS.some((tab) => tab.href === path);
  const caption = captionOf(state, t);

  return (
    <main className="grid min-h-svh bg-white lg:grid-cols-2">
      {/* ── the form ── */}
      <section className="order-2 px-5 pb-14 pt-6 sm:px-10 sm:pt-12 lg:order-1 lg:px-16 lg:pb-16 lg:pt-32 xl:px-24">
        <div className="mx-auto flex h-full w-full max-w-[440px] flex-col">
          {onTabs ? (
            <Suspense fallback={<Tabs path={path} query="" />}>
              <TabsWithReturn path={path} />
            </Suspense>
          ) : (
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 self-start text-[13.5px] font-medium text-mute transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("auth.backToSignIn")}
            </Link>
          )}

          <motion.div
            key={path}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-1 flex-col justify-center pt-7 sm:pt-8 lg:pt-10"
          >
            {children}
          </motion.div>

          {onTabs && (
            <p className="mt-9 border-t border-line-soft pt-5 text-[13px] leading-relaxed text-mute">
              {t("auth.guest")}{" "}
              <Link href="/suivi" className="font-semibold text-accent transition-colors hover:text-accent-deep">
                {t("auth.guestTrack")}
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* ── the machine ──
          Hidden from assistive technology: everything it shows, the form says
          in words. The top padding clears the fixed header it runs under. */}
      <aside
        aria-hidden
        className="relative order-1 flex flex-col items-center justify-center gap-3 overflow-hidden bg-ink px-6 pb-6 pt-[88px] sm:pb-8 sm:pt-28 lg:sticky lg:top-0 lg:order-2 lg:h-svh lg:gap-7 lg:self-start lg:pb-12 lg:pt-24"
        style={DOTS}
      >
        {/* on a phone the machine stands centred over its caption, big
            enough to see the lights react to typing; on a wide screen it is
            sized by the height it has, so a short window never crops it */}
        <div className="w-[min(160px,42vw)] shrink-0 sm:w-full sm:max-w-[200px] lg:w-[min(460px,calc((100svh-230px)*0.815))] lg:max-w-none">
          <Rig state={state} />
        </div>
        <p className="flex h-6 items-center gap-2.5 text-[14px] font-medium text-white/75">
          <span
            className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-300 ${
              state.mode === "error" ? "bg-alert" : state.mode === "idle" ? "bg-white/30" : "bg-accent-lit"
            }`}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={caption}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {caption}
            </motion.span>
          </AnimatePresence>
        </p>
      </aside>
    </main>
  );
}

/* Moving between the two tabs keeps "where to go afterwards" — someone sent
   here from checkout who picks "create an account" still ends up back at
   checkout. */
function TabsWithReturn({ path }: { path: string }) {
  const back = useSearchParams().get("retour");
  return <Tabs path={path} query={back ? `?retour=${encodeURIComponent(back)}` : ""} />;
}

function Tabs({ path, query }: { path: string; query: string }) {
  const { t } = useLocale();

  return (
    <nav aria-label={t("auth.tabs")} className="grid grid-cols-2 rounded-full bg-paper p-1">
      {TABS.map((tab) => {
        const active = tab.href === path;
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${query}`}
            replace
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-full py-2.5 text-center text-[13.5px] font-semibold transition-colors duration-200 ${
              active ? "text-white" : "text-mute hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="auth-tab"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">{t(tab.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
