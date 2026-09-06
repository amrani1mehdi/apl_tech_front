"use client";

import { motion } from "motion/react";
import { Link } from "@/components/i18n/LocaleLink";
import { ArrowUpRight } from "lucide-react";
import { Divider, SectionHead } from "./Section";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catName } from "@/lib/i18n";

const CATS = [
  { key: "pc-gamer", image: "/products/setup.jpg", span: "col-span-2 lg:col-span-2 lg:row-span-2" },
  { key: "cartes-graphiques", image: "/products/gpu.jpg", span: "col-span-2 lg:col-span-2" },
  { key: "processeurs", image: "/products/cpu.jpg", span: "col-span-1" },
  { key: "ecrans", image: "/products/monitor.jpg", span: "col-span-1" },
  { key: "portables", image: "/products/laptop.jpg", span: "col-span-2 lg:col-span-2" },
  { key: "peripheriques", image: "/products/mouse.jpg", span: "col-span-2 lg:col-span-2" },
];

export function Categories() {
  const { t, locale } = useLocale();
  return (
    <section className="py-16 lg:py-24">
      <Divider index="01" label={t("sec.cat.divider")} />
      <div className="mx-auto mt-8 max-w-[1320px] px-5 lg:mt-12 lg:px-8">
        <SectionHead
          eyebrow={t("sec.cat.eyebrow")}
          title={t("sec.cat.title")}
          link={t("c.allCatalogue")}
          href="/catalogue"
        />

        <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[220px] lg:grid-cols-4">
          {CATS.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
              className={c.span}
            >
              <Link
                href={`/catalogue?cat=${c.key}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-ink lg:aspect-auto lg:h-full"
              >
                <img
                  src={c.image}
                  alt={catName(c.key, locale)}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                <span className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-all duration-300 group-hover:bg-accent group-hover:text-white">
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45 rtl:-scale-x-100" />
                </span>

                <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
                  <h3 className="font-display text-xl font-bold text-white lg:text-2xl">
                    {catName(c.key, locale)}
                  </h3>
                  <p className="mt-0.5 font-sans text-[11px] font-semibold uppercase text-white/70">
                    {t(`catmeta.${c.key}`)}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
