import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, PRODUCTS, type Product } from "@/lib/products";
import { ProductDetail } from "./ProductDetail";
import { ProductSkeleton } from "./ProductSkeleton";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return {
    title: p ? `${p.name} — APL TECH` : "Produit — APL TECH",
    description: p?.short,
  };
}

/**
 * How long to hold the skeleton on screen, so the loader's draw can actually
 * be watched. Products come out of a local module and the route is prerendered
 * from generateStaticParams, so in real life the fallback is gone long before
 * the first stroke lands.
 *
 * The mark's loop is 2.6s (see .apl-loader in globals.css) — this is two full
 * passes, and the same hold the catalogue uses. Set it to 0 to hand the page
 * back its real speed.
 */
const LOADER_HOLD_MS = 5200;

/**
 * The hold, as a component rather than an await in the page: suspending has to
 * happen *inside* the boundary, and a page that awaited would just delay the
 * whole route with nothing on screen. Development only — a production build
 * renders the detail with no wrapper at all.
 */
async function HeldDetail({ product }: { product: Product }) {
  await new Promise((resolve) => setTimeout(resolve, LOADER_HOLD_MS));
  return <ProductDetail product={product} />;
}

const Detail =
  process.env.NODE_ENV === "development" && LOADER_HOLD_MS > 0 ? HeldDetail : ProductDetail;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  /* Before the boundary, deliberately. A `loading.tsx` for this segment would
     wrap the lookup too, and a bad slug would show a full page of placeholders
     on its way to a 404. */
  if (!product) notFound();

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <Detail product={product} />
    </Suspense>
  );
}
