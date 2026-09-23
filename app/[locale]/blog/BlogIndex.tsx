"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Reveal } from "@/components/site/Reveal";
import { POSTS, type Post } from "@/lib/blog";
import type { Locale } from "@/lib/locales";
import { fill } from "@/lib/pcbuilder/engine";
import { typeset } from "@/lib/typography";

const EASE = [0.16, 1, 0.3, 1] as const;

export const dateOf = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));

/**
 * The blog: the newest article large, the rest in a grid. Newest first, so a
 * returning reader sees what changed at the top.
 */
export function BlogIndex() {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const [first, ...rest] = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="min-h-svh">
      <section className="border-b border-line bg-cloud pb-10 pt-28 lg:pb-14 lg:pt-36">
        <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-faint">
            <Link href="/" className="transition-colors hover:text-ink">
              APL TECH
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-mute">{t("blog.crumb")}</span>
          </nav>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
            {t("blog.title")}
          </h1>
          <p className="mt-3 max-w-xl text-mute">{t("blog.subtitle")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-5 py-12 lg:px-8 lg:py-16">
        {first && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Link href={`/blog/${first.slug}`} className="group grid items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
              <Cover post={first} className="aspect-[16/10] rounded-3xl" eager />
              <div>
                <Meta post={first} />
                <h2 className="mt-4 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] font-bold leading-[1.06] tracking-[-0.02em] text-ink transition-colors group-hover:text-accent">
                  {typeset(first.title[locale], locale)}
                </h2>
                <Excerpt post={first} className="mt-3 text-[16.5px]" />
                <span className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-semibold text-accent">
                  {t("blog.read")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        )}

        {rest.length > 0 && (
          <div className="mt-14 grid gap-x-6 gap-y-12 border-t border-line pt-14 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:pt-16">
            {rest.map((post, i) => (
              <Reveal key={post.slug} delay={(i % 4) * 0.07}>
                <Card post={post} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Card({ post }: { post: Post }) {
  const { locale } = useLocale();
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <Cover post={post} className="aspect-[4/3] rounded-2xl" />
      <div className="mt-4">
        <Meta post={post} />
        <h3 className="mt-2.5 font-display text-[19px] font-bold leading-snug text-ink transition-colors group-hover:text-accent">
          {typeset(post.title[locale], locale)}
        </h3>
        <Excerpt post={post} className="mt-2 line-clamp-2 text-[14.5px]" />
      </div>
    </Link>
  );
}

function Cover({ post, className, eager }: { post: Post; className: string; eager?: boolean }) {
  const { locale } = useLocale();
  return (
    <div className={`overflow-hidden bg-paper ${className}`}>
      <img
        src={post.image.src}
        alt={post.alt[locale]}
        width={post.image.width}
        height={post.image.height}
        loading={eager ? "eager" : "lazy"}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
    </div>
  );
}

export function Meta({ post }: { post: Post }) {
  const { t, locale } = useLocale();
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mute">
      <span className="rounded-full bg-accent/[0.08] px-2.5 py-0.5 font-medium text-accent">{t(`blog.cat.${post.category}`)}</span>
      <time dateTime={post.date}>{dateOf(post.date, locale)}</time>
      <span aria-hidden className="h-3 w-px bg-line" />
      <span>{fill(t("blog.minutes"), { n: String(post.readMinutes) })}</span>
    </p>
  );
}

function Excerpt({ post, className = "" }: { post: Post; className?: string }) {
  const { locale } = useLocale();
  return <p className={`leading-relaxed text-mute ${className}`}>{typeset(post.excerpt[locale], locale)}</p>;
}
