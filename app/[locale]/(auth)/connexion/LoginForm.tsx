"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Field, TextInput } from "@/components/checkout/Fields";
import { Checkbox, FormAlert, PasswordInput } from "@/components/auth/Controls";
import { returnPath, useAccount } from "@/components/auth/useAccount";
import { SignedInNotice } from "../SignedInNotice";
import { signIn } from "@/lib/auth/accounts";
import { identifierKind } from "@/lib/auth/validate";
import { formatPhone, isValidPhone } from "@/lib/checkout/validate";
import { withLocale } from "@/lib/locales";
import { ramFor, rig } from "../machine";

/* how long the machine is left lit before the page moves on */
const WELCOME_MS = 1500;

export function LoginForm() {
  const { account, ready } = useAccount();
  /* set the moment this form signs someone in, so the "already signed in"
     notice does not replace the form during its own welcome */
  const [arrived, setArrived] = useState(false);

  if (ready && account && !arrived) return <SignedInNotice account={account} />;
  return <Form onSignedIn={() => setArrived(true)} />;
}

function Form({ onSignedIn }: { onSignedIn: () => void }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState<{ identifier?: true; password?: true }>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [refused, setRefused] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    rig.reset();
  }, []);

  const identifierError = !identifier.trim() ? "err.required" : !identifierKind(identifier) ? "auth.err.identifier" : null;
  const passwordError = !password ? "err.required" : null;
  const showIdentifier = submitted || touched.identifier ? identifierError : null;
  const showPassword = submitted || touched.password ? passwordError : null;

  /* the memory fills with the identifier, the fans with the password */
  const lights = (id: string, pw: string) => ({
    ram: ramFor(id, identifierKind(id) !== null),
    fans: Math.min(3, Math.ceil(pw.length / 3)),
  });

  const submit = async () => {
    if (status !== "idle") return;
    setSubmitted(true);
    setRefused(false);
    if (identifierError || passwordError) {
      document.getElementById(identifierError ? "login-id" : "login-password")?.focus();
      return;
    }

    setStatus("busy");
    rig.set({ mode: "working", label: "auth.rig.signingIn" });
    const result = await signIn(identifier, password, remember);

    if (result.ok) {
      onSignedIn();
      setStatus("done");
      rig.set({ mode: "success", label: null, name: result.account.firstName, ram: 4, fans: 3 });
      await new Promise((r) => setTimeout(r, reduced ? 300 : WELCOME_MS));
      /* read now rather than subscribed to: it only matters at this moment,
         and subscribing would keep the form out of the server render */
      router.push(withLocale(returnPath(new URLSearchParams(window.location.search).get("retour")), locale));
    } else {
      setStatus("idle");
      setRefused(true);
      /* the password goes; the identifier stays — it is usually the password
         that was wrong, and retyping a phone number is the slow part */
      setPassword("");
      rig.fail("auth.rig.refused", lights(identifier, ""));
      document.getElementById("login-password")?.focus();
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
        {t("auth.signIn.title")}
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-mute">{t("auth.signIn.subtitle")}</p>

      <div className="mt-8 space-y-1">
        <Field id="login-id" label={t("auth.identifier")} error={showIdentifier ? t(showIdentifier) : null} hint={t("auth.identifierHint")}>
          <TextInput
            id="login-id"
            describedBy="login-id-msg"
            invalid={Boolean(showIdentifier)}
            value={identifier}
            onChange={(e) => {
              const v = e.target.value;
              setIdentifier(v);
              setRefused(false);
              rig.key(lights(v, password));
            }}
            onBlur={() => {
              setTouched((s) => ({ ...s, identifier: true }));
              if (!identifier.includes("@") && isValidPhone(identifier)) setIdentifier(formatPhone(identifier));
            }}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="0770 12 34 56"
            dir="ltr"
            className="rtl:text-end"
          />
        </Field>

        <Field
          id="login-password"
          label={t("auth.password")}
          error={showPassword ? t(showPassword) : null}
          hint={caps ? t("auth.caps") : undefined}
        >
          <PasswordInput
            id="login-password"
            describedBy="login-password-msg"
            invalid={Boolean(showPassword)}
            value={password}
            onChange={(e) => {
              const v = e.target.value;
              setPassword(v);
              setRefused(false);
              rig.key(lights(identifier, v));
            }}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            onCapsLock={setCaps}
            autoComplete="current-password"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Checkbox id="login-remember" checked={remember} onChange={setRemember}>
          {t("auth.remember")}
        </Checkbox>
        <Link href="/mot-de-passe-oublie" className="text-[13.5px] font-semibold text-accent transition-colors hover:text-accent-deep">
          {t("auth.forgot")}
        </Link>
      </div>

      <button
        type="submit"
        disabled={status !== "idle"}
        className="btn-accent mt-7 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-90"
      >
        {status === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "done" && <Check className="h-4 w-4" strokeWidth={3} />}
        {t(status === "busy" ? "auth.signIn.busy" : status === "done" ? "auth.signIn.done" : "auth.signIn.submit")}
      </button>

      <FormAlert message={refused ? t("auth.err.refused") : null} />
    </form>
  );
}
