"use client";

import { Divider, SectionHead } from "./Section";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { PROMOS } from "@/lib/products";

export function Promos() {
  const { t } = useLocale();
  if (PROMOS.length === 0) return null;

  return (
    <section className="bg-cloud py-16 lg:py-24">
      <Divider index="05" label={t("sec.promo.divider")} />
      <div className="mx-auto mt-8 max-w-[1320px] px-5 lg:mt-12 lg:px-8">
        <SectionHead
          eyebrow={t("sec.promo.eyebrow")}
          title={t("sec.promo.title")}
          link={t("c.seeAll")}
          href="/catalogue"
        />

        {/* three across, because three products are actually discounted —
            a four-column grid would leave a hole */}
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-3">
          {PROMOS.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.07}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
