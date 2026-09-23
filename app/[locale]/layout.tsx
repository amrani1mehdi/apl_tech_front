import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { WishlistProvider } from "@/components/site/WishlistProvider";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageTransition } from "@/components/site/PageTransition";
import { SplitTransition } from "@/components/site/SplitTransition";
import { BuilderTransition } from "@/components/site/BuilderTransition";
import { LOCALES, dirOf, isLocale } from "@/lib/locales";

export const metadata: Metadata = {
  title: "APL TECH — Matériel Informatique & Gaming en Algérie",
  description:
    "GPU, processeurs, PC sur-mesure et périphériques de compétition. Livraison dans les 58 wilayas, paiement à la livraison.",
  keywords: [
    "gaming algérie",
    "matériel informatique",
    "carte graphique",
    "pc gamer",
    "GPU",
    "CPU",
    "APL TECH",
  ],
};

export const viewport: Viewport = {
  themeColor: "#f1f0f5",
  width: "device-width",
  initialScale: 1,
};

/** the three locales are known at build time, so all three shells prerender */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  // the segment is a wildcard, so anything could arrive here; a bad locale is
  // a missing page rather than a page rendered in the wrong language
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={dirOf(locale)} className="h-full antialiased">
      {/* Browser extensions stamp their own attributes on <body> before React
          hydrates — ColorZilla's cz-shortcut-listen is the one that turns up
          here — and React reports each as a hydration mismatch it cannot
          patch. The suppression reaches this element's own attributes and no
          further, so a genuine mismatch inside the page still surfaces. */}
      <body className="min-h-full bg-paper text-ink" suppressHydrationWarning>
        <LocaleProvider locale={locale}>
          <WishlistProvider>
            <CartProvider>
              <PageTransition />
              <SplitTransition />
              <BuilderTransition />
              <Header />
              {children}
              <Footer />
            </CartProvider>
          </WishlistProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
