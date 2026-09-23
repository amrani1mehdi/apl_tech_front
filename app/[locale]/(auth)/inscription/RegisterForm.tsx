"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Field, TextInput } from "@/components/checkout/Fields";
import { FormAlert, PasswordInput, StrengthMeter } from "@/components/auth/Controls";
import { returnPath, useAccount } from "@/components/auth/useAccount";
import { signUp } from "@/lib/auth/accounts";
import {
  SIGN_UP_ORDER,
  emptySignUp,
  isAcceptablePassword,
  passwordStrength,
  validateSignUp,
  type SignUpForm,
} from "@/lib/auth/validate";
import { formatPhone, isValidPhone } from "@/lib/checkout/validate";
import { withLocale } from "@/lib/locales";
import { SignedInNotice } from "../SignedInNotice";
import { rig } from "../machine";

const WELCOME_MS = 1600;

const ERROR_KEY = {
  required: "err.required",
  phone: "err.phone",
  email: "err.email",
  weak: "auth.err.weak",
} as const;

const FIELD_ID: Record<keyof SignUpForm, string> = {
  firstName: "su-first",
  lastName: "su-last",
  phone: "su-phone",
  email: "su-email",
  password: "su-password",
};

export function RegisterForm() {
  const { account, ready } = useAccount();
  const [arrived, setArrived] = useState(false);

  if (ready && account && !arrived) return <SignedInNotice account={account} />;
  return <Form onSignedUp={() => setArrived(true)} />;
}

/* One stick of memory for each thing that says who the customer is, the fans
   for how strong the password is. */
function lightsOf(form: SignUpForm) {
  const strength = passwordStrength(form.password);
  return {
    ram: [form.firstName.trim(), form.lastName.trim(), isValidPhone(form.phone), isAcceptablePassword(form.password)].filter(Boolean)
      .length,
    fans: Math.max(0, strength - 1),
  };
}

function Form({ onSignedUp }: { onSignedUp: () => void }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [form, setForm] = useState<SignUpForm>(emptySignUp);
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpForm, true>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [taken, setTaken] = useState<"phoneTaken" | "emailTaken" | null>(null);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    rig.reset();
  }, []);

  const errors = validateSignUp(form);
  const shown = (field: keyof SignUpForm): string | null => {
    if (field === "phone" && taken === "phoneTaken") return t("auth.err.phoneTaken");
    if (field === "email" && taken === "emailTaken") return t("auth.err.emailTaken");
    const error = errors[field];
    return error && (submitted || touched[field]) ? t(ERROR_KEY[error]) : null;
  };
  const strength = passwordStrength(form.password);

  const change = (field: keyof SignUpForm, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if ((field === "phone" && taken === "phoneTaken") || (field === "email" && taken === "emailTaken")) setTaken(null);
    rig.key(lightsOf(next));
  };
  const blur = (field: keyof SignUpForm) => setTouched((s) => ({ ...s, [field]: true }));

  const submit = async () => {
    if (status !== "idle") return;
    setSubmitted(true);
    setTaken(null);
    const first = SIGN_UP_ORDER.find((f) => errors[f]);
    if (first) {
      document.getElementById(FIELD_ID[first])?.focus();
      return;
    }

    setStatus("busy");
    rig.set({ mode: "working", label: "auth.rig.signingUp" });
    const result = await signUp(form);

    if (result.ok) {
      onSignedUp();
      setStatus("done");
      rig.set({ mode: "success", label: null, name: result.account.firstName, ram: 4, fans: 3 });
      await new Promise((r) => setTimeout(r, reduced ? 300 : WELCOME_MS));
      router.push(withLocale(returnPath(new URLSearchParams(window.location.search).get("retour")), locale));
    } else {
      setStatus("idle");
      setTaken(result.reason);
      rig.fail(result.reason === "phoneTaken" ? "auth.rig.phoneTaken" : "auth.rig.emailTaken", lightsOf(form));
      document.getElementById(result.reason === "phoneTaken" ? FIELD_ID.phone : FIELD_ID.email)?.focus();
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onFocus={() => rig.focus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) rig.focus(false);
      }}
    >
      <h1 className="font-display text-[clamp(1.9rem,3.4vw,2.6rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink">
        {t("auth.signUp.title")}
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-mute">{t("auth.signUp.subtitle")}</p>

      <div className="mt-8 space-y-1">
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field id={FIELD_ID.firstName} label={t("co.firstName")} error={shown("firstName")}>
            <TextInput
              id={FIELD_ID.firstName}
              describedBy={`${FIELD_ID.firstName}-msg`}
              invalid={Boolean(shown("firstName"))}
              value={form.firstName}
              onChange={(e) => change("firstName", e.target.value)}
              onBlur={() => blur("firstName")}
              autoComplete="given-name"
            />
          </Field>
          <Field id={FIELD_ID.lastName} label={t("co.lastName")} error={shown("lastName")}>
            <TextInput
              id={FIELD_ID.lastName}
              describedBy={`${FIELD_ID.lastName}-msg`}
              invalid={Boolean(shown("lastName"))}
              value={form.lastName}
              onChange={(e) => change("lastName", e.target.value)}
              onBlur={() => blur("lastName")}
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field id={FIELD_ID.phone} label={t("co.phone")} error={shown("phone")} hint={t("auth.phoneHint")}>
          <TextInput
            id={FIELD_ID.phone}
            describedBy={`${FIELD_ID.phone}-msg`}
            invalid={Boolean(shown("phone"))}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="0770 12 34 56"
            dir="ltr"
            className="rtl:text-end"
            value={form.phone}
            onChange={(e) => change("phone", e.target.value)}
            onBlur={() => {
              blur("phone");
              if (isValidPhone(form.phone)) setForm((f) => ({ ...f, phone: formatPhone(f.phone) }));
            }}
          />
        </Field>

        <Field id={FIELD_ID.email} label={t("auth.emailOptional")} error={shown("email")} hint={t("auth.emailHint")}>
          <TextInput
            id={FIELD_ID.email}
            describedBy={`${FIELD_ID.email}-msg`}
            invalid={Boolean(shown("email"))}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nom@exemple.dz"
            dir="ltr"
            className="rtl:text-end"
            value={form.email}
            onChange={(e) => change("email", e.target.value)}
            onBlur={() => blur("email")}
          />
        </Field>

        <Field
          id={FIELD_ID.password}
          label={t("auth.password")}
          error={shown("password")}
          hint={caps ? t("auth.caps") : t("auth.passwordRule")}
        >
          <PasswordInput
            id={FIELD_ID.password}
            describedBy={`${FIELD_ID.password}-msg ${FIELD_ID.password}-strength`}
            invalid={Boolean(shown("password"))}
            value={form.password}
            onChange={(e) => change("password", e.target.value)}
            onBlur={() => blur("password")}
            onCapsLock={setCaps}
            autoComplete="new-password"
          />
          <StrengthMeter id={`${FIELD_ID.password}-strength`} strength={strength} />
        </Field>
      </div>

      <button
        type="submit"
        disabled={status !== "idle"}
        className="btn-accent mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-90"
      >
        {status === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "done" && <Check className="h-4 w-4" strokeWidth={3} />}
        {t(status === "busy" ? "auth.signUp.busy" : status === "done" ? "auth.signUp.done" : "auth.signUp.submit")}
      </button>

      <FormAlert message={taken === "phoneTaken" ? t("auth.err.phoneTakenLong") : taken === "emailTaken" ? t("auth.err.emailTakenLong") : null}>
        {" "}
        <Link href="/connexion" className="font-semibold underline underline-offset-2">
          {t("auth.signInInstead")}
        </Link>
      </FormAlert>
    </form>
  );
}
