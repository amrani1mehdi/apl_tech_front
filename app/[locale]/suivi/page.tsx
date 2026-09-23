import { Suspense } from "react";
import type { Metadata } from "next";
import { TrackClient } from "./TrackClient";

export const metadata: Metadata = {
  title: "Suivi de commande — APL TECH",
  description:
    "Suis ta commande APL TECH avec son numéro et ton téléphone : confirmation, préparation, expédition et livraison, sans compte.",
};

/* Suspense because the client reads `?commande=` — the confirmation page links
   here with the number already filled in — and reading search params opts
   everything above the nearest boundary out of static rendering. */
export default function TrackPage() {
  return (
    <Suspense fallback={<main className="min-h-svh" />}>
      <TrackClient />
    </Suspense>
  );
}
