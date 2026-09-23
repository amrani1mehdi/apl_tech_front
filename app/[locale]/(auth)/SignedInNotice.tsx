"use client";

import { useEffect } from "react";
import { ArrowRight, LogOut } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { initialOf } from "@/components/auth/useAccount";
import { signOut, type Account } from "@/lib/auth/accounts";
import { formatPhone } from "@/lib/checkout/validate";
import { fill } from "@/lib/pcbuilder/engine";
import { rig } from "./machine";

/**
 * What the sign-in and sign-up pages show someone who is already signed in —
 * a bookmark, the back button, a second tab. A second account form would only
 * invite signing in twice; this says who they are and offers the two things
 * they could want.
 */
export function SignedInNotice({ account }: { account: Account }) {
  const { t } = useLocale();

  useEffect(() => {
    rig.reset({ mode: "success", name: account.firstName, ram: 4, fans: 3 });
  }, [account.firstName]);

  return (
    <div>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">
        {initialOf(account)}
      </span>
      <h1 className="mt-6 font-display text-[clamp(1.9rem,3.4vw,2.6rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink">
        {fill(t("auth.already.title"), { name: account.firstName })}
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-mute">
        {fill(t("auth.already.desc"), { phone: "" })}
        <span dir="ltr" className="font-medium tabular-nums text-ink">
          {formatPhone(account.phone)}
        </span>
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/compte"
          className="btn-accent group inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
        >
          {t("auth.myAccount")}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </Link>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink/25"
        >
          <LogOut className="h-4 w-4 rtl:rotate-180" />
          {t("auth.signOut")}
        </button>
      </div>
    </div>
  );
}
