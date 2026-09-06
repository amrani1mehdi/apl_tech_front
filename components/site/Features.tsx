"use client";

import { motion } from "motion/react";
import { Truck, Banknote, ShieldCheck, Wrench, Star } from "lucide-react";
import { Divider, SectionHead } from "./Section";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";
import { useLocale } from "@/components/i18n/LocaleProvider";

const FEATURES = [
  { icon: Truck, k: "delivery" },
  { icon: Banknote, k: "cod" },
  { icon: ShieldCheck, k: "warranty" },
  { icon: Wrench, k: "service" },
];

export function Features() {
  const { t } = useLocale();
  return (
    <section className="py-16 lg:py-24">
      <Divider index="06" label={t("sec.why.divider")} />
      <div className="mx-auto mt-8 max-w-[1320px] px-5 lg:mt-12 lg:px-8">
        <SectionHead eyebrow={t("sec.why.eyebrow")} title={t("sec.why.title")} />

        <Reveal className="mt-10" delay={0.05}>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-cloud lg:grid-cols-4">
            {[
              { node: <CountUp to={58} />, label: t("stat.wilayas") },
              { node: <CountUp to={12000} suffix="+" />, label: t("stat.clients") },
              { node: <CountUp to={200} suffix="+" />, label: t("stat.brands") },
              {
                node: (
                  <span className="inline-flex items-center gap-1.5">
                    <CountUp to={4.9} decimals={1} />
                    <Star className="h-5 w-5 fill-accent text-accent" />
                  </span>
                ),
                label: t("stat.rating"),
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`p-6 lg:p-8 ${i % 2 === 1 ? "border-s border-line" : ""} ${
                  i >= 2 ? "border-t border-line lg:border-t-0" : ""
                } ${i !== 0 ? "lg:border-s" : ""}`}
              >
                <p className="font-display text-4xl font-bold text-ink lg:text-5xl">{s.node}</p>
                <p className="mt-1.5 font-sans text-[11px] font-semibold uppercase text-mute">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.k}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
              className={`lg:ps-8 ${i !== 0 ? "lg:border-s lg:border-line" : ""}`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border border-line text-accent">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-ink">{t(`feat.${f.k}.t`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{t(`feat.${f.k}.d`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
