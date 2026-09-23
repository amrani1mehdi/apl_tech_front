import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Créer un compte — APL TECH",
  description: "Crée ton compte APL TECH pour retrouver toutes tes commandes et les suivre en un clic.",
};

export default function SignUpPage() {
  return <RegisterForm />;
}
