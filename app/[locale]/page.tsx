import { Hero } from "@/components/site/Hero";
import { Categories } from "@/components/site/Categories";
import { Featured } from "@/components/site/Featured";
import { Anatomy } from "@/components/site/Anatomy";
import { NewArrivals } from "@/components/site/NewArrivals";
import { Builder } from "@/components/site/Builder";
import { Promos } from "@/components/site/Promos";
import { Features } from "@/components/site/Features";

export default function Home() {
  return (
    <main>
      <Hero />
      <Categories />
      <Featured />
      <Anatomy />
      <NewArrivals />
      <Builder />
      <Promos />
      <Features />
    </main>
  );
}
