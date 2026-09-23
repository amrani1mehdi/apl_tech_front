"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Field, TextInput } from "@/components/checkout/Fields";
import { CodeInput, PasswordInput, StrengthMeter } from "@/components/auth/Controls";
import { requestReset, resetPassword, verifyResetCode, type ResetRequest } from "@/lib/auth/accounts";
import { identifierKind, isAcceptablePassword, passwordStrength } from "@/lib/auth/validate";
import { formatPhone, isValidPhone } from "@/lib/checkout/validate";
import { withLocale } from "@/lib/locales";
import { fill } from "@/lib/pcbuilder/engine";
import { ramFor, rig } from "../machine";

type Step = "identify" | "code" | "password";
const STEPS: Step[] = ["identify", "code", "password"];
const RESEND_AFTER = 30;
const WELCOME_MS = 1500;

/**
 * Getting back in: who you are, the code that proves it, a new password.
 *
 * Three steps on one page rather than three pages, because they are one task
 * and the second is useless without the first — a reload in the middle should
 * start over, not land on a code box for a code nobody asked for.
 */
export function ResetForm() {
  const { t, locale, dir } = useLocale();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState<ResetRequest | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [badCode, setBadCode] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    rig.reset();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const tick = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [resendIn]);

  const go = (next: Step) => {
    setStep(next);
    setSubmitted(false);
    setTouched(false);
    setStatus("idle");
  };

  /* ── 1 · who ── */
  const identifierError = !identifier.trim() ? "err.required" : !identifierKind(identifier) ? "auth.err.identifier" : null;

  const send = async () => {
    if (status !== "idle") return;
    setSubmitted(true);
    if (identifierError) {
      document.getElementById("rs-id")?.focus();
      return;
    }
    setStatus("busy");
    rig.set({ mode: "working", label: "auth.rig.sending" });
    const request = await requestReset(identifier);
    setSent(request);
    setCode("");
    setBadCode(false);
    setResendIn(RESEND_AFTER);
    go("code");
    rig.reset({ mode: "awake", label: "auth.rig.codeSent" });
  };

  const resend = async () => {
    if (resendIn > 0 || status !== "idle") return;
    setResendIn(RESEND_AFTER);
    setBadCode(false);
    setCode("");
    rig.set({ mode: "working", label: "auth.rig.sending" });
    setSent(await requestReset(identifier));
    rig.reset({ mode: "awake", label: "auth.rig.codeSent" });
  };

  /* ── 2 · the code ── */
  const digits = code.replace(/\D/g, "").length;

  const verify = async (candidate: string) => {
    if (status !== "idle") return;
    setSubmitted(true);
    if (!/^\d{6}$/.test(candidate)) {
      setBadCode(false);
      return;
    }
    setStatus("busy");
    rig.set({ mode: "working", label: "auth.rig.checking" });
    const check = await verifyResetCode(identifier, candidate);
    if (check.ok) {
      go("password");
      rig.reset({ mode: "awake", ram: 4 });
    } else {
      setStatus("idle");
      setBadCode(true);
      setCode("");
      rig.fail("auth.rig.badCode", { ram: 0 });
      /* after the boxes are enabled again — focusing a disabled input does nothing */
      setTimeout(() => document.querySelector<HTMLInputElement>("#rs-code input")?.focus(), 0);
    }
  };

  /* ── 3 · the new password ── */
  const strength = passwordStrength(password);
  const passwordError = !password ? "err.required" : !isAcceptablePassword(password) ? "auth.err.weak" : null;

  const save = async () => {
    if (status !== "idle") return;
    setSubmitted(true);
    if (passwordError) {
      document.getElementById("rs-password")?.focus();
      return;
    }
    setStatus("busy");
    rig.set({ mode: "working", label: "auth.rig.saving" });
    const result = await resetPassword(identifier, code, password);
    if (result.ok) {
      setStatus("done");
      rig.set({ mode: "success", label: null, name: result.account.firstName, ram: 4, fans: 3 });
      await new Promise((r) => setTimeout(r, reduced ? 300 : WELCOME_MS));
      router.push(withLocale("/compte", locale));
    } else {
      setBadCode(true);
      setCode("");
      go("code");
      rig.fail("auth.rig.badCode", { ram: 0, fans: 0 });
    }
  };

  const index = STEPS.indexOf(step);
  const slide = dir === "rtl" ? -24 : 24;

  return (
    <div
      onFocus={() => rig.focus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) rig.focus(false);
      }}
    >
      {/* where in the three steps */}
      <div className="flex items-center gap-3">
        <ol className="grid w-24 grid-cols-3 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <li key={s} className="h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className={`block h-full origin-left rounded-full bg-accent transition-transform duration-500 rtl:origin-right ${
                  i <= index ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </li>
          ))}
        </ol>
        <p className="text-[12.5px] font-medium text-mute">{fill(t("auth.reset.step"), { n: String(index + 1), total: "3" })}</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: slide }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: -slide }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          {step === "identify" && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <Heading title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")} />
              <div className="mt-8">
                <Field
                  id="rs-id"
                  label={t("auth.identifier")}
                  error={(submitted || touched) && identifierError ? t(identifierError) : null}
                  hint={t("auth.identifierHint")}
                >
                  <TextInput
                    id="rs-id"
                    describedBy="rs-id-msg"
                    invalid={Boolean((submitted || touched) && identifierError)}
                    value={identifier}
                    onChange={(e) => {
                      const v = e.target.value;
                      setIdentifier(v);
                      rig.key({ ram: ramFor(v, identifierKind(v) !== null) });
                    }}
                    onBlur={() => {
                      setTouched(true);
                      if (!identifier.includes("@") && isValidPhone(identifier)) setIdentifier(formatPhone(identifier));
                    }}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="0770 12 34 56"
                    dir="ltr"
                    className="rtl:text-end"
                    autoFocus
                  />
                </Field>
              </div>
              <Submit status={status} idle={t("auth.reset.submit")} busy={t("auth.reset.busy")} />
            </form>
          )}

          {step === "code" && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void verify(code);
              }}
            >
              <Heading title={t("auth.code.title")} />
              <p className="mt-2.5 text-[15px] leading-relaxed text-mute">
                {t(sent?.channel === "email" ? "auth.code.sentEmail" : "auth.code.sentSms")}{" "}
                <span dir="ltr" className="font-medium text-ink">
                  {sent?.to}
                </span>{" "}
                <button
                  type="button"
                  onClick={() => {
                    go("identify");
                    rig.reset({ mode: "awake", ram: ramFor(identifier, identifierKind(identifier) !== null) });
                  }}
                  className="font-semibold text-accent transition-colors hover:text-accent-deep"
                >
                  {t("auth.code.change")}
                </button>
              </p>

              <p id="rs-code-label" className="mt-8 block text-[13px] font-medium text-ink">
                {t("auth.code.label")}
              </p>
              <div id="rs-code" className="mt-1.5">
                <CodeInput
                  value={code}
                  autoFocus
                  labelledBy="rs-code-label"
                  describedBy="rs-code-msg"
                  invalid={badCode || (submitted && digits < 6)}
                  disabled={status !== "idle"}
                  onChange={(next) => {
                    setCode(next);
                    setBadCode(false);
                    const n = next.replace(/\D/g, "").length;
                    rig.key({ ram: Math.ceil((n * 4) / 6) });
                    /* the last digit is the submit — nobody wants to reach
                       for a button after typing six numbers */
                    if (/^\d{6}$/.test(next)) void verify(next);
                  }}
                />
              </div>
              <p
                id="rs-code-msg"
                aria-live="polite"
                className={`mt-1.5 min-h-[1.15rem] text-[12.5px] leading-snug ${badCode || (submitted && digits < 6) ? "text-alert" : "text-faint"}`}
              >
                {badCode ? t("auth.err.badCode") : submitted && digits < 6 ? t("auth.err.codeIncomplete") : ""}
              </p>

              <p className="mt-3 text-[13px] text-mute">
                {resendIn > 0 ? (
                  fill(t("auth.code.resendIn"), { s: String(resendIn) })
                ) : (
                  <button type="button" onClick={() => void resend()} className="font-semibold text-accent transition-colors hover:text-accent-deep">
                    {t("auth.code.resend")}
                  </button>
                )}
              </p>

              <Submit status={status} idle={t("auth.code.submit")} busy={t("auth.code.busy")} />
            </form>
          )}

          {step === "password" && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <Heading title={t("auth.newPassword.title")} subtitle={t("auth.newPassword.subtitle")} />
              {/* so a password manager files the new password under the right account */}
              <input type="text" name="username" autoComplete="username" value={identifier} readOnly hidden />
              <div className="mt-8">
                <Field
                  id="rs-password"
                  label={t("auth.newPassword.label")}
                  error={(submitted || touched) && passwordError ? t(passwordError) : null}
                  hint={caps ? t("auth.caps") : t("auth.passwordRule")}
                >
                  <PasswordInput
                    id="rs-password"
                    describedBy="rs-password-msg rs-password-strength"
                    invalid={Boolean((submitted || touched) && passwordError)}
                    value={password}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPassword(v);
                      rig.key({ ram: 4, fans: Math.max(0, passwordStrength(v) - 1) });
                    }}
                    onBlur={() => setTouched(true)}
                    onCapsLock={setCaps}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <StrengthMeter id="rs-password-strength" strength={strength} />
                </Field>
              </div>
              <Submit status={status} idle={t("auth.newPassword.submit")} busy={t("auth.newPassword.busy")} done={t("auth.signIn.done")} />
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h1 className="font-display text-[clamp(1.9rem,3.4vw,2.6rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink">{title}</h1>
      {subtitle && <p className="mt-2.5 text-[15px] leading-relaxed text-mute">{subtitle}</p>}
    </>
  );
}

function Submit({ status, idle, busy, done }: { status: "idle" | "busy" | "done"; idle: string; busy: string; done?: string }) {
  return (
    <button
      type="submit"
      disabled={status !== "idle"}
      className="btn-accent mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-90"
    >
      {status === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
      {status === "done" && <Check className="h-4 w-4" strokeWidth={3} />}
      {status === "busy" ? busy : status === "done" ? (done ?? idle) : idle}
    </button>
  );
}
