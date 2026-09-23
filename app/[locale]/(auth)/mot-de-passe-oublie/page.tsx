import type { Metadata } from "next";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — APL TECH",
  description: "Reçois un code par SMS ou par e-mail et choisis un nouveau mot de passe pour ton compte APL TECH.",
};

export default function ResetPage() {
  return <ResetForm />;
}
