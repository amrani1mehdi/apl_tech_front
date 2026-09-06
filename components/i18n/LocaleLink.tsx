"use client";

import NextLink from "next/link";
import { type ComponentProps } from "react";
import { useLocale } from "./LocaleProvider";
import { withLocale } from "@/lib/i18n";

type Props = Omit<ComponentProps<typeof NextLink>, "href"> & { href: string };

/* A drop-in for next/link that carries the current locale.

   Every page sits under a locale segment, so a bare "/catalogue" would land on
   the proxy and bounce through a redirect — and, worse, would read as the
   wrong URL in the markup and to a crawler. Putting the rule here rather than
   at each call site means a link written anywhere is correct by default, and
   there is one place to change if the scheme ever does. */
export function Link({ href, ...rest }: Props) {
  const { locale } = useLocale();
  const external = /^([a-z]+:|\/\/|#)/i.test(href);
  return <NextLink href={external ? href : withLocale(href, locale)} {...rest} />;
}
