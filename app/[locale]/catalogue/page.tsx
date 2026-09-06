import { Suspense } from "react";
import type { Metadata } from "next";
import { StoreHero } from "./StoreHero";
import { CatalogueClient } from "./CatalogueClient";
import { CatalogueSkeleton } from "./CatalogueSkeleton";

export const metadata: Metadata = {
  title: "Catalogue — APL TECH",
  description: "Toutes nos cartes graphiques, processeurs, PC, portables et périphériques gaming.",
};

export default function CataloguePage() {
  return (
    <main>
      <StoreHero />
      <Suspense fallback={<CatalogueSkeleton />}>
        <CatalogueClient />
      </Suspense>
    </main>
  );
}
