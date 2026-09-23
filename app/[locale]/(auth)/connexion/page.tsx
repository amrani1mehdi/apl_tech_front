import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — APL TECH",
  description: "Connecte-toi à ton compte APL TECH avec ton téléphone ou ton e-mail pour retrouver tes commandes.",
};

export default function SignInPage() {
  return <LoginForm />;
}
