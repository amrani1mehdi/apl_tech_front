import type { Metadata } from "next";
import { BlogIndex } from "./BlogIndex";

export const metadata: Metadata = {
  title: "Blog — APL TECH",
  description: "Guides et conseils pour choisir ton matériel, monter ton PC et équiper ton setup, par APL TECH.",
};

export default function BlogPage() {
  return <BlogIndex />;
}
