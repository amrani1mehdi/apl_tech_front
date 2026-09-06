"use client";

import { motion, useReducedMotion } from "motion/react";
import { LayoutGrid, Rows3 } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type View = "grid" | "list";

const VIEWS: { key: View; Icon: typeof LayoutGrid; label: string }[] = [
  { key: "grid", Icon: LayoutGrid, label: "cata.view.grid" },
  { key: "list", Icon: Rows3, label: "cata.view.list" },
];

/**
 * Grid or list, as a two-stop segmented control.
 *
 * The indicator is the same travelling pill the category rail uses, so the
 * two "which one is on" answers on this page are told the same way.
 */
export function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const { t } = useLocale();
  const reduced = useReducedMotion();

  return (
    <div
      role="group"
      aria-label={t("cata.view.grid")}
      className="flex items-center gap-0.5 rounded-full border border-line bg-cloud p-1"
    >
      {VIEWS.map(({ key, Icon, label }) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={on}
            aria-label={t(label)}
            title={t(label)}
            className={`relative grid h-8 w-9 place-items-center rounded-full transition-colors ${
              on ? "text-white" : "text-faint hover:text-ink"
            }`}
          >
            {on && (
              <motion.span
                layoutId="view-pill"
                transition={
                  reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 36 }
                }
                className="bg-accent-gradient-x absolute inset-0 rounded-full"
              />
            )}
            <Icon className="relative h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
