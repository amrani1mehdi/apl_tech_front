"use client";

import { Link } from "@/components/i18n/LocaleLink";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * Placeholder while there is no auth. The store is cash-on-delivery and takes
 * orders without a login, so this says so plainly and routes people to the two
 * things they actually came for, rather than showing an empty sign-in form.
 */
export default function AccountPage() {
  const { t } = useLocale();

  return (
    <main className="min-h-svh">
      <PageHeader crumbKey="ac.crumb" titleKey="ac.title" subtitleKey="ac.subtitle" />

      <div className="mx-auto max-w-[1320px] px-5 py-14 lg:px-8 lg:py-20">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="btn-accent group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[0.95rem] font-semibold"
          >
            {t("ac.contactCta")}
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
          </Link>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 rounded-full border border-line px-7 py-3.5 text-[0.95rem] font-medium text-ink transition-colors hover:border-accent/40"
          >
            {t("ac.shopCta")}
          </Link>
        </div>
      </div>
    </main>
  );
}
