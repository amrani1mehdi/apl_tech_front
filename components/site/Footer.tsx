"use client";

import { Link } from "@/components/i18n/LocaleLink";
import { Mail, Phone, MapPin, Truck, Banknote } from "lucide-react";
import { Logo } from "./Logo";
import { useLocale } from "@/components/i18n/LocaleProvider";

const COLS = [
  {
    titleKey: "foot.shop",
    items: [
      { k: "nav.composants", href: "/catalogue" },
      { k: "nav.pcGamer", href: "/catalogue?cat=pc-gamer" },
      { k: "nav.peripheriques", href: "/catalogue?cat=peripheriques" },
      { k: "nav.portables", href: "/catalogue?cat=portables" },
      { k: "nav.ecrans", href: "/catalogue?cat=ecrans" },
      { k: "nav.configurateur", href: "/configurateur" },
    ],
  },
  {
    titleKey: "foot.help",
    items: [
      { k: "foot.link.delivery", href: "#" },
      { k: "foot.link.returns", href: "#" },
      { k: "foot.link.warranty", href: "#" },
      { k: "foot.link.faq", href: "#" },
      { k: "foot.link.track", href: "#" },
    ],
  },
  {
    titleKey: "foot.company",
    items: [
      { k: "foot.link.about", href: "#" },
      { k: "foot.link.stores", href: "#" },
      { k: "foot.link.contact", href: "#" },
      { k: "foot.link.blog", href: "#" },
    ],
  },
];

const SOCIAL = ["Instagram", "Facebook", "TikTok", "YouTube"];

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <span aria-hidden className="footer-neon" />
      <div className="mx-auto max-w-[1320px] px-5 pt-16 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-6 lg:gap-8">
          <div className="col-span-2 lg:col-span-3">
            <Logo light />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/60">
              {t("foot.brandDesc")}
            </p>

            <div className="mt-6 flex flex-col gap-2.5 text-sm text-paper/70">
              <a href="#" className="flex items-center gap-2.5 transition-colors hover:text-white">
                <Phone className="h-4 w-4 text-accent" /> +213 770 00 00 00
              </a>
              <a href="#" className="flex items-center gap-2.5 transition-colors hover:text-white">
                <Mail className="h-4 w-4 text-accent" /> contact@apltech.dz
              </a>
              <span className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-accent" /> Alger Centre, Algérie
              </span>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.titleKey}>
              <h4 className="font-sans text-[11px] font-semibold uppercase text-paper/40">
                {t(col.titleKey)}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((l) => (
                  <li key={l.k}>
                    <Link
                      href={l.href}
                      className="text-sm text-paper/70 transition-colors hover:text-white"
                    >
                      {t(l.k)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-white/10 pt-8">
          <span className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-paper/70">
            <Banknote className="h-4 w-4 text-accent" /> {t("feat.cod.t")}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-paper/70">
            <Truck className="h-4 w-4 text-accent" /> {t("feat.delivery.t")}
          </span>
          <div className="flex flex-1 items-center justify-start gap-4 sm:justify-end">
            {SOCIAL.map((s) => (
              <a key={s} href="#" className="text-xs font-medium text-paper/60 transition-colors hover:text-white">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none mt-12 select-none px-5 lg:px-8">
        <p className="font-display text-[15vw] font-bold leading-[0.8] tracking-tight text-white/[0.04]" aria-hidden="true">
          APL TECH
        </p>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] items-center justify-center px-5 py-6 text-xs text-paper/50 lg:px-8">
          <p>© 2026 APLTECH.dz — {t("foot.made")} 🇩🇿</p>
        </div>
      </div>
    </footer>
  );
}
