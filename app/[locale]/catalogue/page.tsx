import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { CatalogueClient } from "./CatalogueClient";

export const metadata: Metadata = {
  title: "Catalogue — APL TECH",
  description: "Toutes nos cartes graphiques, processeurs, PC, portables et périphériques gaming.",
};

export default function CataloguePage() {
  return (
    <main>
      <PageHeader crumbKey="cata.crumb" titleKey="cata.title" subtitleKey="cata.subtitle" />
      <Suspense fallback={null}>
        <CatalogueClient />
      </Suspense>
    </main>
  );
}
