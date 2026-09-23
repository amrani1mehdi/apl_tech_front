import type { Metadata } from "next";
import { AboutClient } from "./AboutClient";

export const metadata: Metadata = {
  title: "À propos — APL TECH",
  description:
    "APL TECH, boutique algérienne de matériel informatique et gaming : produits authentiques avec facture, PC montés et testés, livraison dans les 58 wilayas.",
};

export default function AboutPage() {
  return <AboutClient />;
}
