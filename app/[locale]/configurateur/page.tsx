import { Suspense } from "react";
import type { Metadata } from "next";
import { auditParts } from "@/lib/pcbuilder/parts";
import { auditExtras } from "@/lib/pcbuilder/extras";
import { BuilderClient } from "./BuilderClient";

export const metadata: Metadata = {
  title: "PC Builder IA — APL TECH",
  description:
    "Décris ton budget et ce que tu joues : l'assistant choisit les composants dans notre stock réel, vérifie la compatibilité, calcule la consommation et estime les FPS en 1080p, 1440p et 4K.",
};

/**
 * MODULE 4 — the AI PC Builder.
 *
 * Everything is inside the boundary because the builder reads its entry point
 * from the query string — a pinned component (PCB-02) or a shared
 * configuration (PCB-15) — and `useSearchParams` opts everything above the
 * nearest Suspense boundary out of prerendering.
 *
 * The fallback is a full viewport rather than nothing. This page is entered
 * from a product card and from the nav, and a collapse to zero height before
 * the stage arrives would yank the footer up the screen and back down again.
 */
export default function ConfiguratorPage() {
  /* The two catalogue tables the builder reads — the component specs and the
     peripheral shelves — describe products that live somewhere else, and they
     drift: a slug is renamed, a shelf key changes, a card is added and only
     half the file is updated. Both failures are silent in production, which is
     why they are noisy here. Development only, and a warning rather than a
     throw: a mis-keyed shelf costs one empty slot, not a broken page. */
  if (process.env.NODE_ENV !== "production") {
    const problems = [...auditParts(), ...auditExtras()];
    if (problems.length > 0) {
      console.warn(`[pc builder] catalogue drift\n${problems.map((p) => `  · ${p}`).join("\n")}`);
    }
  }

  return (
    <main className="bg-cloud">
      <Suspense fallback={<div className="min-h-[100svh]" />}>
        <BuilderClient />
      </Suspense>
    </main>
  );
}
