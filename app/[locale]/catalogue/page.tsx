import { Suspense } from "react";
import type { Metadata } from "next";
import { StoreHero } from "@/components/site/StoreHero";
import { CatalogueClient } from "./CatalogueClient";
import { CatalogueSkeleton } from "./CatalogueSkeleton";

export const metadata: Metadata = {
  title: "Catalogue — APL TECH",
  description: "Toutes nos cartes graphiques, processeurs, PC, portables et périphériques gaming.",
};

/**
 * How long to hold the skeleton on screen, so the loader's draw can actually
 * be watched. The catalogue reads its products out of a local module, so in
 * real life the fallback is gone long before the first stroke lands.
 *
 * The mark's loop is 2.6s (see .apl-loader in globals.css) — this is two full
 * passes. Set it to 0 to hand the page back its real speed.
 */
const LOADER_HOLD_MS = 5200;

/**
 * The hold, as a component rather than an await in the page: suspending has
 * to happen *inside* the boundary, and a page that awaited would just delay
 * the whole route with nothing on screen. Development only — a production
 * build renders the catalogue with no wrapper at all.
 */
async function HeldCatalogue() {
  await new Promise((resolve) => setTimeout(resolve, LOADER_HOLD_MS));
  return <CatalogueClient />;
}

const Catalogue =
  process.env.NODE_ENV === "development" && LOADER_HOLD_MS > 0 ? HeldCatalogue : CatalogueClient;

export default function CataloguePage() {
  return (
    <main>
      <StoreHero subtitleKey="cata.subtitle" />
      <Suspense fallback={<CatalogueSkeleton />}>
        <Catalogue />
      </Suspense>
    </main>
  );
}
