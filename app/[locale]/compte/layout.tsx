import type { ReactNode } from "react";
import type { Metadata } from "next";

/* The page is a client component — it depends on who is signed in — so its
   title lives here. */
export const metadata: Metadata = {
  title: "Mon compte — APL TECH",
  description: "Tes commandes APL TECH et tes informations, au même endroit.",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return children;
}
