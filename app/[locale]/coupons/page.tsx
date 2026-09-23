import type { Metadata } from "next";
import { CouponsClient } from "./CouponsClient";

/* Everything on the page depends on who is signed in and what they have
   spent, so the page is a client component and its title lives here. */
export const metadata: Metadata = {
  title: "Boutique de coupons — APL TECH",
  description:
    "Échange tes points de fidélité APL TECH contre des coupons de réduction : livraison offerte, remises en dinars et pourcentages, selon ton niveau.",
};

export default function CouponsPage() {
  return <CouponsClient />;
}
