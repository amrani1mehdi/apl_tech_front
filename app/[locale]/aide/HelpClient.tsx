"use client";

import { useEffect, useState, type ComponentType } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Banknote,
  Check,
  ChevronRight,
  Gift,
  HelpCircle,
  House,
  MapPinned,
  PackageX,
  Plus,
  RotateCcw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Reveal } from "@/components/site/Reveal";
import { HELP } from "@/lib/content/help";
import { FREE_DELIVERY_FROM, zoneTable } from "@/lib/checkout/shipping";
import { fill } from "@/lib/pcbuilder/engine";
import { formatDA } from "@/lib/products";
import { typeset } from "@/lib/typography";

const EASE = [0.16, 1, 0.3, 1] as const;

/* French anchors, like the site's paths — the footer links straight to them */
const SECTIONS = [
  { id: "livraison", key: "delivery", icon: Truck },
  { id: "retours", key: "returns", icon: RotateCcw },
  { id: "garantie", key: "warranty", icon: ShieldCheck },
  { id: "faq", key: "faq", icon: HelpCircle },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * Delivery, returns, warranty and the common questions, on one page.
 *
 * They are the four things someone reads before buying and comes back to
 * after, and they refer to each other — a return is about delivery, a faulty
 * part is about the warranty — so they sit together, with a bar that keeps all
 * four a tap away and shows where the reader is.
 */
export function HelpClient() {
  const { locale } = useLocale();
  const c = HELP[locale];
  const reduced = useReducedMotion();
  const [active, setActive] = useState<SectionId>("livraison");

  /* the section in the reading band — below the bars, in the top half */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inView[0]) setActive(inView[0].target.id as SectionId);
      },
      { rootMargin: "-150px 0px -55% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const go = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  const rates = zoneTable();
  const amount = formatDA(FREE_DELIVERY_FROM, locale);

  return (
    <main className="min-h-svh">
      <section className="border-b border-line bg-cloud pb-10 pt-28 lg:pb-14 lg:pt-36">
        <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-faint">
            <Link href="/" className="transition-colors hover:text-ink">
              APL TECH
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-mute">{c.crumb}</span>
          </nav>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
            {c.title}
          </h1>
          <p className="mt-3 max-w-xl text-mute">{c.subtitle}</p>
        </div>
      </section>

      {/* ── the four, always a tap away ── */}
      <nav aria-label={c.crumb} className="sticky top-[68px] z-30 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] gap-1 overflow-x-auto px-5 py-2.5 lg:px-8 [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map(({ id, key, icon: Icon }) => {
            const on = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(id);
                }}
                aria-current={on ? "true" : undefined}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${
                  on ? "text-white" : "text-mute hover:text-ink"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="help-tab"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon className="relative h-4 w-4" strokeWidth={1.9} />
                <span className="relative">{c.nav[key]}</span>
              </a>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto max-w-[1320px] px-5 py-14 lg:px-8 lg:py-20">
        <div className="space-y-24 lg:space-y-32">
          {/* ── delivery ── */}
          <section id="livraison" aria-labelledby="h-livraison" className="scroll-mt-40">
            <SectionHead id="h-livraison" icon={Truck} title={c.nav.delivery} lead={c.delivery.lead} />

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {c.delivery.facts.map((fact, i) => {
                const Icon = [MapPinned, House, Gift, Banknote][i];
                return (
                  <Reveal key={fact.title} delay={i * 0.06}>
                    <div className="h-full rounded-2xl border border-line bg-white p-5">
                      <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} />
                      <p className="mt-4 font-display text-[16px] font-bold leading-snug text-ink">{fill(fact.title, { amount })}</p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">{fact.text}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal className="mt-12">
              <h3 className="font-display text-xl font-bold text-ink">{c.delivery.zonesTitle}</h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-[14px]">
                    <thead className="bg-cloud text-[12.5px] text-mute">
                      <tr>
                        <th className="px-5 py-3 text-start font-medium">{c.delivery.columns.zone}</th>
                        <th className="px-5 py-3 text-end font-medium">{c.delivery.columns.home}</th>
                        <th className="px-5 py-3 text-end font-medium">{c.delivery.columns.pickup}</th>
                        <th className="px-5 py-3 text-end font-medium">{c.delivery.columns.days}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft">
                      {rates.map((r) => (
                        <tr key={r.zone}>
                          <td className="px-5 py-3.5">
                            <span className="block font-medium text-ink">{c.delivery.zoneNames[r.zone]}</span>
                            <span className="text-[12.5px] text-faint">{fill(c.delivery.wilayas, { n: String(r.wilayas) })}</span>
                          </td>
                          <td className="px-5 py-3.5 text-end tabular-nums text-ink">{formatDA(r.home.fee, locale)}</td>
                          <td className="px-5 py-3.5 text-end tabular-nums text-ink">{formatDA(r.pickup.fee, locale)}</td>
                          <td className="px-5 py-3.5 text-end tabular-nums text-mute">
                            {fill(c.delivery.days, { a: String(r.home.days[0]), b: String(r.home.days[1]) })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-faint">{c.delivery.zonesNote}</p>
            </Reveal>

            <Reveal className="mt-12">
              <h3 className="font-display text-xl font-bold text-ink">{c.delivery.stepsTitle}</h3>
              <Steps steps={c.delivery.steps} className="mt-5 lg:grid-cols-5" />
              <Link
                href="/suivi"
                className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-accent transition-colors hover:text-accent-deep"
              >
                {c.delivery.track}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Reveal>
          </section>

          {/* ── returns ── */}
          <section id="retours" aria-labelledby="h-retours" className="scroll-mt-40">
            <SectionHead id="h-retours" icon={RotateCcw} title={c.nav.returns} lead={c.returns.lead} />
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <Reveal>
                <Checklist title={c.returns.acceptedTitle} items={c.returns.accepted} tone="yes" />
              </Reveal>
              <Reveal delay={0.06}>
                <Checklist title={c.returns.excludedTitle} items={c.returns.excluded} tone="no" />
              </Reveal>
            </div>
            <Reveal className="mt-12">
              <h3 className="font-display text-xl font-bold text-ink">{c.returns.stepsTitle}</h3>
              <Steps steps={c.returns.steps} className="mt-5 sm:grid-cols-3" />
            </Reveal>
            <Reveal className="mt-8">
              <p className="flex items-start gap-3 rounded-2xl bg-paper px-5 py-4 text-[14px] leading-relaxed text-ink">
                <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.8} />
                {c.returns.damaged}
              </p>
            </Reveal>
          </section>

          {/* ── warranty ── */}
          <section id="garantie" aria-labelledby="h-garantie" className="scroll-mt-40">
            <SectionHead id="h-garantie" icon={ShieldCheck} title={c.nav.warranty} lead={c.warranty.lead} />
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {c.warranty.plans.map((plan, i) => (
                <Reveal key={plan.title} delay={i * 0.06}>
                  <div className={`h-full rounded-2xl p-6 ${i === 1 ? "bg-ink text-white" : "border border-line bg-white"}`}>
                    <p className={`text-[13.5px] font-medium ${i === 1 ? "text-white/60" : "text-mute"}`}>{plan.title}</p>
                    <p className={`mt-2 font-display text-[clamp(1.6rem,3vw,2.1rem)] font-bold leading-tight ${i === 1 ? "text-accent-lit" : "text-ink"}`}>
                      {plan.duration}
                    </p>
                    <p className={`mt-3 text-[14px] leading-relaxed ${i === 1 ? "text-white/75" : "text-mute"}`}>{plan.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Reveal>
                <Checklist title={c.warranty.coveredTitle} items={c.warranty.covered} tone="yes" />
              </Reveal>
              <Reveal delay={0.06}>
                <Checklist title={c.warranty.notCoveredTitle} items={c.warranty.notCovered} tone="no" />
              </Reveal>
            </div>
            <Reveal className="mt-12">
              <h3 className="font-display text-xl font-bold text-ink">{c.warranty.howTitle}</h3>
              <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-mute">{c.warranty.how}</p>
            </Reveal>
          </section>

          {/* ── questions ── */}
          <section id="faq" aria-labelledby="h-faq" className="scroll-mt-40">
            <SectionHead id="h-faq" icon={HelpCircle} title={c.nav.faq} lead={c.faq.lead} />
            <Reveal className="mt-8">
              <Accordion items={c.faq.items} />
            </Reveal>
          </section>

          {/* ── still stuck ── */}
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink px-7 py-8 sm:flex-row sm:items-center sm:px-10">
              <div>
                <p className="font-display text-2xl font-bold text-white">{c.more.title}</p>
                <p className="mt-1.5 text-[15px] text-white/65">{c.more.text}</p>
              </div>
              <Link
                href="/contact"
                className="btn-accent group inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
              >
                {c.more.cta}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}

function SectionHead({ id, icon: Icon, title, lead }: { id: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string; lead: string }) {
  return (
    <Reveal>
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-white">
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
        </span>
        <div>
          <h2 id={id} className="font-display text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
            {title}
          </h2>
          <p className="mt-2 max-w-[62ch] text-[15.5px] leading-relaxed text-mute">{lead}</p>
        </div>
      </div>
    </Reveal>
  );
}

function Steps({ steps, className = "" }: { steps: { title: string; text: string }[]; className?: string }) {
  return (
    <ol className={`grid gap-3 ${className}`}>
      {steps.map((step, i) => (
        <li key={step.title} className="relative rounded-2xl border border-line bg-white p-5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-paper font-display text-[14px] font-bold tabular-nums text-ink">
            {i + 1}
          </span>
          <p className="mt-3.5 text-[15px] font-semibold text-ink">{step.title}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mute">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}

function Checklist({ title, items, tone }: { title: string; items: string[]; tone: "yes" | "no" }) {
  return (
    <div className="h-full rounded-2xl border border-line bg-white p-6">
      <p className="font-display text-[17px] font-bold text-ink">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-[14.5px] leading-snug text-ink">
            <span
              className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                tone === "yes" ? "bg-accent text-white" : "bg-paper text-mute"
              }`}
            >
              {tone === "yes" ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="border-t border-line">
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <li key={item.q} className="border-b border-line">
            <h3>
              <button
                type="button"
                id={`faq-${i}`}
                aria-expanded={expanded}
                aria-controls={`faq-${i}-panel`}
                onClick={() => setOpen(expanded ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-5 text-start font-display text-[17px] font-bold text-ink transition-colors hover:text-accent"
              >
                {typeset(item.q, locale)}
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-300 ${
                    expanded ? "rotate-45 border-ink bg-ink text-white" : "border-line text-ink"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={`faq-${i}-panel`}
                  role="region"
                  aria-labelledby={`faq-${i}`}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[64ch] pb-6 pe-14 text-[15px] leading-relaxed text-mute">{typeset(item.a, locale)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
