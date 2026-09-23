import type { Metadata } from "next";
import { HelpClient } from "./HelpClient";

export const metadata: Metadata = {
  title: "Livraison, retours et garantie — APL TECH",
  description:
    "Livraison dans les 58 wilayas, paiement à la livraison, retours sous 7 jours et garantie : tout ce qui se passe après ta commande APL TECH.",
};

export default function HelpPage() {
  return <HelpClient />;
}
