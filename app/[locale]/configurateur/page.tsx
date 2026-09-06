"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, ShieldCheck, Wrench, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatDA } from "@/lib/products";
import { PARTS, defaultSelection, buildTotal } from "@/lib/build";

export default function ConfiguratorPage() {
  const { addItem } = useCart();
  const { t } = useLocale();
  const [sel, setSel] = useState(defaultSelection);

  const total = buildTotal(sel);

  const addBuild = () => {
    const cpu = PARTS[0].options[sel.cpu].name;
    const gpu = PARTS[1].options[sel.gpu].name;
    addItem(
      {
        slug: `build-${Math.random().toString(36).slice(2, 8)}`,
        name: `${t("conf.added")} — ${cpu} · ${gpu}`,
        image: "/products/setup.jpg",
        price: total,
      },
      1,
    );
  };

  return (
    <main>
      <PageHeader crumbKey="conf.crumb" titleKey="conf.title" subtitleKey="conf.subtitle" />

      <section className="mx-auto max-w-[1320px] px-5 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-10">
            {PARTS.map((part, idx) => (
              <motion.div
                key={part.key}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-bold text-accent">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-display text-lg font-bold text-ink">{t(`part.${part.key}`)}</h2>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {part.options.map((opt, i) => {
                    const on = sel[part.key] === i;
                    return (
                      <button
                        key={opt.name}
                        onClick={() => setSel((s) => ({ ...s, [part.key]: i }))}
                        className={`flex items-center justify-between rounded-xl border p-4 text-start transition-colors ${
                          on ? "border-accent bg-accent text-white" : "border-line bg-cloud text-ink hover:border-accent/40"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`grid h-5 w-5 place-items-center rounded-full border transition-colors ${on ? "border-paper bg-paper text-ink" : "border-line"}`}>
                            {on && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className="text-sm font-medium">{opt.name}</span>
                        </span>
                        <span className={`text-sm font-semibold ${on ? "text-paper" : "text-mute"}`}>
                          {opt.price.toLocaleString("fr-FR")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-line bg-cloud p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">{t("conf.config")}</h2>
                <span className="flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-semibold text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {t("sec.build.compatible")}
                </span>
              </div>

              <ul className="mt-5 divide-y divide-line">
                {PARTS.map((p) => (
                  <li key={p.key} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-xs text-mute">{t(`part.${p.key}`)}</span>
                    <span className="text-end text-sm font-medium text-ink">
                      {p.options[sel[p.key]].name}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                <span className="font-sans text-[11px] font-semibold uppercase text-mute">{t("c.total")}</span>
                <motion.span
                  key={total}
                  initial={{ opacity: 0.4, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-3xl font-bold text-ink"
                >
                  {formatDA(total)}
                </motion.span>
              </div>

              <button
                onClick={addBuild}
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
              >
                {t("c.addToCart")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
              </button>

              <div className="mt-5 space-y-2.5 border-t border-line pt-5">
                <p className="flex items-center gap-2.5 text-xs text-mute">
                  <Wrench className="h-4 w-4 text-accent" /> {t("conf.assembly")}
                </p>
                <p className="flex items-center gap-2.5 text-xs text-mute">
                  <ShieldCheck className="h-4 w-4 text-accent" /> {t("conf.warranty")}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
