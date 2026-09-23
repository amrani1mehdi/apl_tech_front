"use client";

import { useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { TextInput } from "@/components/checkout/Fields";
import type { Strength } from "@/lib/auth/validate";

/**
 * A password field with a way to see what was typed.
 *
 * On a phone a password is typed blind with thumbs, and one wrong character
 * means doing it again — so the eye is there, and a warning when Caps Lock is
 * on, which is the other reason a correct password gets refused.
 */
export function PasswordInput({
  onCapsLock,
  className = "",
  ...rest
}: Omit<ComponentProps<typeof TextInput>, "type"> & { onCapsLock?: (on: boolean) => void }) {
  const { t } = useLocale();
  const [shown, setShown] = useState(false);
  const caps = (e: KeyboardEvent<HTMLInputElement>) => onCapsLock?.(e.getModifierState("CapsLock"));

  return (
    <div className="relative">
      <TextInput
        {...rest}
        type={shown ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={(e) => {
          caps(e);
          rest.onKeyDown?.(e);
        }}
        onKeyUp={caps}
        className={`pe-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={t(shown ? "auth.hide" : "auth.show")}
        aria-pressed={shown}
        aria-controls={rest.id}
        className="absolute end-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-faint transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        {shown ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

/**
 * How strong the password is, as four bars and a word.
 *
 * Red for one that will be refused, the accent from the minimum up. Nothing
 * turns green: the rest of the site has no green, and "acceptable" does not
 * need to celebrate.
 */
export function StrengthMeter({ strength, id }: { strength: Strength; id?: string }) {
  const { t } = useLocale();
  const tone = strength <= 1 ? "bg-alert" : strength === 2 ? "bg-accent-lit" : "bg-accent";

  return (
    <div id={id} className="mt-2.5 flex items-center gap-3" aria-live="polite">
      <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className="h-1.5 overflow-hidden rounded-full bg-line">
            <span
              className={`block h-full origin-left rounded-full transition-[transform,background-color] duration-300 rtl:origin-right ${tone} ${
                n <= strength ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </span>
        ))}
      </div>
      <span className={`min-w-[5.5rem] text-end text-[12px] font-medium ${strength <= 1 && strength > 0 ? "text-alert" : "text-mute"}`}>
        {strength > 0 ? t(`auth.strength.${strength}`) : ""}
      </span>
    </div>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="group inline-flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
          checked ? "border-ink bg-ink text-white" : "border-line bg-white group-hover:border-ink/30"
        }`}
      >
        <Check className={`h-3 w-3 transition-transform duration-200 ${checked ? "scale-100" : "scale-0"}`} strokeWidth={3.5} />
      </span>
      {children}
    </label>
  );
}

/**
 * Six boxes for a six-digit code.
 *
 * One real input per digit, moving on as each is typed and back on
 * Backspace. A pasted code, or one the phone offers from the SMS, arrives
 * whole in whichever box has focus and is spread across the rest.
 */
export function CodeInput({
  value,
  onChange,
  invalid,
  labelledBy,
  describedBy,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (code: string) => void;
  invalid: boolean;
  labelledBy: string;
  describedBy: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const { t } = useLocale();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  /* An emptied box is kept as a space, so clearing the third digit does not
     slide the fourth into its place. */
  const digits = Array.from({ length: 6 }, (_, i) => (value[i] ?? "").trim());
  const focus = (i: number) => boxes.current[Math.max(0, Math.min(5, i))]?.focus();
  const emit = (next: string[]) => onChange(next.map((x) => x || " ").join("").trimEnd());

  const put = (i: number, typed: string) => {
    const incoming = typed.replace(/\D/g, "");
    if (!incoming) return;
    const next = [...digits];
    incoming
      .slice(0, 6 - i)
      .split("")
      .forEach((d, k) => (next[i + k] = d));
    emit(next);
    focus(Math.min(5, i + incoming.length));
  };

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} dir="ltr" className="grid grid-cols-6 gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`${t("auth.code.digit")} ${i + 1}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const typed = e.target.value;
            if (typed === "") {
              const next = [...digits];
              next[i] = "";
              emit(next);
            } else put(i, typed.replace(d, "") || typed);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) {
              e.preventDefault();
              const next = [...digits];
              next[i - 1] = "";
              emit(next);
              focus(i - 1);
            } else if (e.key === "ArrowLeft") focus(i - 1);
            else if (e.key === "ArrowRight") focus(i + 1);
          }}
          className={`h-14 w-full rounded-xl border bg-white text-center font-display text-[22px] font-bold tabular-nums text-ink transition-[border-color,box-shadow] duration-200 focus:outline-none focus:ring-2 disabled:bg-cloud ${
            invalid
              ? "border-alert focus:ring-alert/15"
              : d
                ? "border-ink/40 focus:border-accent focus:ring-accent/15"
                : "border-line hover:border-ink/25 focus:border-accent focus:ring-accent/15"
          }`}
        />
      ))}
    </div>
  );
}

/** The one message a form gives about the whole attempt — opens under the
    button rather than appearing, so the page does not jump. */
export function FormAlert({ message, children }: { message: string | null; children?: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          role="alert"
          initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
          animate={reduced ? { opacity: 1, marginTop: 16 } : { opacity: 1, height: "auto", marginTop: 16 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-xl border border-alert/25 bg-alert/[0.04] text-[13px] leading-snug text-alert"
        >
          <div className="px-4 py-3">
            {message}
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
