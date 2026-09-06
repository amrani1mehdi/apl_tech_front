"use client";

import { Divider, SectionHead } from "./Section";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { NEW_ARRIVALS } from "@/lib/products";

export function NewArrivals() {
  const { t } = useLocale();
  if (NEW_ARRIVALS.length === 0) return null;

  return (
    <section className="bg-cloud py-16 lg:py-24">
      <Divider index="04" label={t("sec.new.divider")} />
      <div className="mx-auto mt-8 max-w-[1320px] px-5 lg:mt-12 lg:px-8">
        <SectionHead
          eyebrow={t("sec.new.eyebrow")}
          title={t("sec.new.title")}
          link={t("c.seeAll")}
          href="/catalogue"
        />

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
          {NEW_ARRIVALS.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 4) * 0.07}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
