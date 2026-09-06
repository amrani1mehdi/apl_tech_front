"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Clock, ArrowRight, Check } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { useLocale } from "@/components/i18n/LocaleProvider";

const field =
  "w-full rounded-lg border border-line bg-cloud px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent";

export default function ContactPage() {
  const { t } = useLocale();
  const [form, setForm] = useState({ name: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      setError(true);
      return;
    }
    setError(false);
    setSent(true);
  }

  return (
    <main className="min-h-svh">
      <PageHeader crumbKey="ct.crumb" titleKey="ct.title" subtitleKey="ct.subtitle" />

      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-5 py-14 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-20">
        {/* ── how to reach us ── */}
        <div className="lg:col-span-5">
          <h2 className="font-sans text-[11px] font-semibold uppercase text-faint">
            {t("ct.reach")}
          </h2>

          <ul className="mt-5 space-y-4">
            {[
              { icon: Phone, label: "+213 770 00 00 00", href: "tel:+213770000000" },
              { icon: Mail, label: "contact@apltech.dz", href: "mailto:contact@apltech.dz" },
            ].map((r) => (
              <li key={r.label}>
                <a
                  href={r.href}
                  className="group flex items-center gap-3 text-ink transition-colors hover:text-accent"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-accent transition-colors group-hover:border-accent/40">
                    <r.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="font-medium">{r.label}</span>
                </a>
              </li>
            ))}

            <li className="flex items-center gap-3 text-ink">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-accent">
                <MapPin className="h-[18px] w-[18px]" />
              </span>
              <span className="font-medium">Alger Centre, Algérie</span>
            </li>

            <li className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-accent">
                <Clock className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block text-xs text-mute">{t("ct.hoursLabel")}</span>
                <span className="font-medium text-ink">{t("ct.hours")}</span>
              </span>
            </li>
          </ul>
        </div>

        {/* ── message form ── */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-line bg-white p-6 lg:p-8">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-gradient text-white">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
                <p className="max-w-sm text-mute">{t("ct.sent")}</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h2 className="font-display text-xl font-bold text-ink">{t("ct.formTitle")}</h2>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-mute">
                      {t("ct.name")} <span className="text-accent">*</span>
                    </span>
                    <input value={form.name} onChange={set("name")} className={field} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-mute">
                      {t("ct.phone")} <span className="text-accent">*</span>
                    </span>
                    <input
                      type="tel"
                      placeholder="0770 00 00 00"
                      value={form.phone}
                      onChange={set("phone")}
                      className={field}
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-medium text-mute">{t("ct.subject")}</span>
                  <input value={form.subject} onChange={set("subject")} className={field} />
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-medium text-mute">
                    {t("ct.message")} <span className="text-accent">*</span>
                  </span>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    className={`${field} resize-y`}
                  />
                </label>

                {error && (
                  <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
                    {t("ct.fill")}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-accent group mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"
                >
                  {t("ct.send")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
