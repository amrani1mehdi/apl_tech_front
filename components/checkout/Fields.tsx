"use client";

import type { ComponentProps, ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * One stage of the order — contact, delivery, payment.
 *
 * Numbered because they are a sequence the customer moves through, and the
 * number turns into a tick once a stage has nothing left to fill. That tick is
 * the progress indicator: three of them on a page this short say more than a
 * separate stepper would, and they are exactly where the customer's eye is.
 */
export function Step({
  n,
  id,
  title,
  done,
  children,
}: {
  n: number;
  id: string;
  title: string;
  done: boolean;
  children: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold tabular-nums transition-colors duration-300 ${
            done ? "bg-ink text-paper" : "border border-line text-mute"
          }`}
        >
          {done ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              <span className="sr-only">{t("co.stepDone")}</span>
            </>
          ) : (
            n
          )}
        </span>
        <h2 id={id} className="font-display text-[17px] font-bold leading-tight text-ink">
          {title}
        </h2>
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * A label, a control, and one line under it — the error when there is one,
 * otherwise the hint.
 *
 * The line keeps its height whether it holds text or not, so an error
 * appearing under a field does not push every field below it down the page
 * while the customer is looking at it.
 */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  const message = error ?? hint;

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      <p
        id={`${id}-msg`}
        aria-live={error ? "polite" : undefined}
        className={`mt-1.5 min-h-[1.15rem] text-[12.5px] leading-snug ${error ? "text-alert" : "text-faint"}`}
      >
        {message}
      </p>
    </div>
  );
}

const control = (invalid: boolean) =>
  `w-full rounded-xl border bg-white text-[14.5px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-cloud disabled:text-faint ${
    invalid
      ? "border-alert focus:ring-alert/15"
      : "border-line hover:border-ink/25 focus:border-accent focus:ring-accent/15"
  }`;

export function TextInput({
  invalid,
  describedBy,
  className = "",
  ...rest
}: ComponentProps<"input"> & { invalid: boolean; describedBy: string }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${control(invalid)} px-3.5 py-3 ${className}`}
    />
  );
}

export function TextArea({
  invalid,
  describedBy,
  ...rest
}: ComponentProps<"textarea"> & { invalid: boolean; describedBy: string }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${control(invalid)} min-h-[5.5rem] resize-y px-3.5 py-3 leading-relaxed`}
    />
  );
}

/** A native select, dressed. Native on purpose: on a phone it opens the
    system picker, which is the best list of 58 wilayas anyone is going to
    build. */
export function Select({
  invalid,
  describedBy,
  children,
  ...rest
}: ComponentProps<"select"> & { invalid: boolean; describedBy: string }) {
  return (
    <div className="relative">
      <select
        {...rest}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${control(invalid)} appearance-none py-3 pe-10 ps-3.5`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
      />
    </div>
  );
}

/**
 * A radio choice drawn as a card — delivery method, payment method.
 *
 * A real `<input type="radio">` underneath, visually hidden, so arrow keys
 * move between the options and a screen reader announces "1 of 2, selected"
 * without any of that being rebuilt by hand. The card is its label.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  disabled,
  onChange,
  icon,
  title,
  description,
  aside,
  footer,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  /** trailing, on the title line — a "Bientôt" for an unavailable method */
  aside?: ReactNode;
  /** under a rule — price and delay for a delivery method */
  footer?: ReactNode;
}) {
  return (
    <label
      className={`group relative flex h-full flex-col rounded-xl border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        disabled
          ? "cursor-not-allowed border-line bg-cloud"
          : checked
            ? "cursor-pointer border-accent bg-accent/[0.035] ring-1 ring-accent"
            : "cursor-pointer border-line hover:border-ink/25"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />

      <span className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors ${
            checked ? "border-accent" : "border-line"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full bg-accent transition-transform duration-200 ${checked ? "scale-100" : "scale-0"}`}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={disabled ? "text-faint" : checked ? "text-accent" : "text-mute"}>{icon}</span>
            <span className={`text-[14.5px] font-semibold ${disabled ? "text-faint" : "text-ink"}`}>{title}</span>
            {aside && <span className="ms-auto">{aside}</span>}
          </span>
          <span className={`mt-1 block text-[12.5px] leading-snug ${disabled ? "text-faint" : "text-mute"}`}>
            {description}
          </span>
        </span>
      </span>

      {/* Pushed to the card's foot, so two cards side by side put their
          prices on one line whatever their descriptions run to. */}
      {footer && (
        <span className="mt-auto block pt-3.5">
          <span className="flex items-baseline justify-between gap-3 border-t border-line-soft ps-[30px] pt-3">
            {footer}
          </span>
        </span>
      )}
    </label>
  );
}
