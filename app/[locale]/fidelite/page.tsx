import { redirect } from "next/navigation";
import { withLocale } from "@/lib/i18n";
import { isLocale, DEFAULT_LOCALE } from "@/lib/locales";

/**
 * The loyalty card moved into the account — MODULE 8.
 *
 * It was a page of its own for a while, and it should not have been: the
 * card, the coupons bought with it and where every point came from are all
 * "my account", and keeping them one tap away meant a customer had to know
 * the programme existed before they could find their own points.
 *
 * The route stays as a redirect rather than disappearing, because links to
 * it are already out — in the footer, on the coupon shelf, and in anything a
 * customer has bookmarked.
 */
export default async function LoyaltyPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  redirect(withLocale("/compte", isLocale(locale) ? locale : DEFAULT_LOCALE));
}
