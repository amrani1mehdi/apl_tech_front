"use client";

import { Link } from "@/components/i18n/LocaleLink";
import { ChevronRight } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function PageHeader({
  crumbKey,
  titleKey,
  subtitleKey,
}: {
  crumbKey: string;
  titleKey: string;
  subtitleKey?: string;
}) {
  const { t } = useLocale();
  return (
    <section className="border-b border-line bg-cloud pb-10 pt-28 lg:pb-14 lg:pt-36">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        <nav className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase text-faint">
          <Link href="/" className="transition-colors hover:text-ink">
            APL TECH
          </Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-mute">{t(crumbKey)}</span>
        </nav>
        <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
          {t(titleKey)}
        </h1>
        {subtitleKey && <p className="mt-3 max-w-xl text-mute">{t(subtitleKey)}</p>}
      </div>
    </section>
  );
}
