"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BadgeCheck, Banknote, ChevronRight, Cpu, PackageSearch, Store, Truck, Wrench } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Reveal } from "@/components/site/Reveal";
import { ABOUT } from "@/lib/content/about";
import { typeset } from "@/lib/typography";

const EASE = [0.16, 1, 0.3, 1] as const;
const PROMISE_ICONS = [BadgeCheck, Wrench, Truck, Banknote];
const OFFER_ICONS = [Store, Cpu, PackageSearch];

/**
 * About.
 *
 * What the shop is, why it exists, what it promises, and where to go next —
 * four short sections, the last of them links, because someone reading an
 * about page is deciding whether to buy.
 */
export function AboutClient() {
  const { locale } = useLocale();
  const c = ABOUT[locale];
  const reduced = useReducedMotion();

  return (
    <main className="min-h-svh">
      {/* ── who ── */}
      <section className="bg-cloud pb-12 pt-28 lg:pb-16 lg:pt-36">
        <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-faint">
            <Link href="/" className="transition-colors hover:text-ink">
              APL TECH
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-mute">{c.crumb}</span>
          </nav>
          <motion.h1
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-5 max-w-[18ch] font-display text-[clamp(2.4rem,6vw,4.8rem)] font-bold leading-[0.98] tracking-[-0.03em] text-ink"
          >
            {typeset(c.title, locale)}
          </motion.h1>
          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-mute"
          >
            {c.subtitle}
          </motion.p>

          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
            className="mt-10 overflow-hidden rounded-3xl bg-ink lg:mt-14"
          >
            <img
              src="/products/apl-promo.jpg"
              alt={c.imageAlt}
              width={1671}
              height={941}
              className="aspect-[16/10] w-full object-cover object-[72%_center] sm:aspect-video lg:aspect-[16/7] lg:object-[70%_100%]"
            />
          </motion.div>
        </div>
      </section>

      {/* ── why ── */}
      <section className="mx-auto grid max-w-[1320px] gap-8 px-5 py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-28">
        <Reveal>
          <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink lg:sticky lg:top-32">
            {c.storyTitle}
          </h2>
        </Reveal>
        <div className="space-y-6">
          {c.story.map((paragraph, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className={`leading-relaxed ${i === 0 ? "text-[20px] text-ink" : "text-[17px] text-mute"}`}>{paragraph}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── what we promise ── */}
      <section className="bg-ink py-20 lg:py-24">
        <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.02em] text-white">
              {c.promisesTitle}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.promises.map((promise, i) => {
              const Icon = PROMISE_ICONS[i];
              return (
                <Reveal key={promise.title} delay={i * 0.07}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-accent/20 text-accent-lit">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <p className="mt-6 font-display text-[18px] font-bold leading-snug text-white">{promise.title}</p>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-white/60">{promise.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── what we do ── */}
      <section className="mx-auto max-w-[1320px] px-5 py-20 lg:px-8 lg:py-28">
        <Reveal>
          <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">{c.offerTitle}</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {c.offer.map((item, i) => {
            const Icon = OFFER_ICONS[i];
            return (
              <Reveal key={item.href} delay={i * 0.07}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col rounded-3xl border border-line bg-white p-7 transition-colors hover:border-accent/40"
                >
                  <Icon className="h-6 w-6 text-accent" strokeWidth={1.8} />
                  <p className="mt-6 font-display text-[20px] font-bold text-ink">{item.title}</p>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-mute">{item.text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-accent">
                    {item.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-16">
          <div className="flex flex-col items-start justify-between gap-6 border-t border-line pt-10 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-2xl font-bold text-ink">{c.cta.title}</p>
              <p className="mt-1.5 text-[15.5px] text-mute">{c.cta.text}</p>
            </div>
            <Link href="/contact" className="btn-accent group inline-flex shrink-0 items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">
              {c.cta.button}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
