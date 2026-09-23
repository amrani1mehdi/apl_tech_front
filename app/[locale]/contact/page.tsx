import type { Metadata } from "next";
import { ContactClient } from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact — APL TECH",
  description:
    "Appelle, écris sur WhatsApp ou laisse un message à APL TECH : une question sur une pièce, une commande ou une config sur-mesure, on te répond dans la journée.",
};

export default function ContactPage() {
  return <ContactClient />;
}
