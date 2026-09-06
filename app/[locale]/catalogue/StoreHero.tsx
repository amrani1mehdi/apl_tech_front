"use client";

import { ChevronRight } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * The catalogue's header: the same light band every other subpage opens on,
 * with a slightly larger title because this page has no section headings
 * under it to carry the weight.
 */
export function StoreHero() {
  const { t } = useLocale();

  return (
    <section className="border-b border-line bg-cloud pb-10 pt-28 lg:pb-12 lg:pt-36">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        <nav className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase text-faint">
          <Link href="/" className="transition-colors hover:text-ink">
            APL TECH
          </Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-mute">{t("cata.crumb")}</span>
        </nav>

        <h1 className="mt-4 font-display text-[clamp(2.6rem,5.5vw,4rem)] font-bold leading-[1] tracking-[-0.02em] text-ink">
          {t("cata.title")}
        </h1>

        {/* One line, not the paragraph that used to be here — it says what is
            in the shop and stops, so the title keeps the weight. */}
        <p className="mt-3 text-mute">{t("cata.subtitle")}</p>
      </div>
    </section>
  );
}
