"use client";

import { motion } from "motion/react";
import { Link } from "@/components/i18n/LocaleLink";
import { ArrowRight, Check } from "lucide-react";
import { Magnetic } from "./Magnetic";
import { ScrambleText, SplitText } from "./Reveal";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { SHOWCASE, SHOWCASE_ROWS, buildTotal, showcasePart } from "@/lib/build";

/** priced from the same options the configurator sells, so the figure here is
    one a buyer can actually reach */
const TOTAL = buildTotal(SHOWCASE);

export function Builder() {
  const { t } = useLocale();
  return (
    <section className="relative isolate overflow-hidden bg-ink py-24 text-paper lg:py-32">
      {/* background plate */}
      <img
        src="/products/builder-bg.jpg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      {/* black filter — flat wash for legibility; the image is already darkest
          through the middle, where the copy sits. The vertical gradient only
          softens the top/bottom edges into the neighbouring paper sections. */}
      <div className="absolute inset-0 -z-10 bg-black/60" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-transparent to-black/55" />

      <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-16 lg:px-8">
        {/* ── the pitch ── */}
        <div className="text-start">
          <p className="font-sans text-[11px] font-semibold uppercase text-accent-lit">
            <ScrambleText text={t("sec.build.eyebrow")} />
          </p>

          <SplitText
            as="h2"
            text={`${t("sec.build.title1")} ${t("sec.build.title2")}`}
            delay={0.06}
            className="mt-3 font-display text-[clamp(2.1rem,4.6vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.02em]"
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 max-w-lg leading-relaxed text-paper/75"
          >
            {t("sec.build.desc")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-9 flex"
          >
            <Magnetic strength={0.25}>
              <Link
                href="/configurateur"
                className="btn-accent group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[0.95rem] font-semibold"
              >
                {t("sec.build.cta")}
                <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        {/* ── a build, filled in ──
            Shows the shape of the thing the button opens: five decisions and
            what they come to. Board, case and PSU are priced into the total
            but not listed — they follow from the five above and would only
            crowd the card. */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-white/12 bg-black/45 p-6 backdrop-blur-md lg:p-7"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="font-sans text-[11px] font-semibold uppercase text-paper/50">
              {t("sec.build.config")}
            </p>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-lit/15 px-2.5 py-1 text-[11px] font-semibold text-accent-lit">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-lit" />
              {t("sec.build.compatible")}
            </span>
          </div>

          <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {SHOWCASE_ROWS.map((key, i) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
                className="flex items-center justify-between gap-4 py-3.5"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-accent-lit/15 text-accent-lit">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="truncate text-sm text-paper/70">{t(`part.${key}`)}</span>
                </span>
                {/* a part name is a Latin run in an Arabic line: without an
                    explicit direction the bidi algorithm moves its leading
                    digits to the far end, so "32 Go DDR5 6000" reads back as
                    "Go DDR5 6000 32" */}
                <span dir="ltr" className="text-sm font-semibold text-paper">
                  {showcasePart(key).name}
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="mt-6 flex items-end justify-between gap-4">
            <p className="font-sans text-[11px] font-semibold uppercase text-paper/50">
              {t("sec.build.estTotal")}
            </p>
            <p
              dir="ltr"
              className="font-display text-[clamp(1.6rem,3vw,2.1rem)] font-bold leading-none text-paper"
            >
              {formatDA(TOTAL)}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
