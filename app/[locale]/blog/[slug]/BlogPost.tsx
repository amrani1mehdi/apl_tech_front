"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getPost } from "@/lib/blog";
import { typeset } from "@/lib/typography";
import { Meta } from "../BlogIndex";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * An article: one image, and the text underneath it.
 *
 * Nothing else on the page — no sidebar, no gallery, no list of other posts
 * interrupting the text — so it reads like an article and not like a shop
 * page with an article in it.
 */
export function BlogPost({ slug }: { slug: string }) {
  const { t, locale } = useLocale();
  const reduced = useReducedMotion();
  const post = getPost(slug);
  if (!post) return null;

  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <main className="min-h-svh">
      <article className="mx-auto max-w-[880px] px-5 pb-20 pt-28 lg:pb-28 lg:pt-36">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[13.5px] font-medium text-mute transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("blog.back")}
        </Link>

        {/* the one image */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-6 overflow-hidden rounded-3xl bg-paper"
        >
          <img
            src={post.image.src}
            alt={post.alt[locale]}
            width={post.image.width}
            height={post.image.height}
            className="aspect-[16/9] w-full object-cover"
          />
        </motion.div>

        {/* and the text underneath it */}
        <div className="mx-auto mt-10 max-w-[700px] lg:mt-14">
          <motion.div {...rise(0.15)}>
            <Meta post={post} />
          </motion.div>
          <motion.h1
            {...rise(0.2)}
            className="mt-4 font-display text-[clamp(2rem,4.4vw,3.2rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink"
          >
            {typeset(post.title[locale], locale)}
          </motion.h1>

          <motion.div {...rise(0.3)} className="mt-8">
            {post.body[locale].map((block, i) =>
              block.type === "h" ? (
                <h2 key={i} className="mb-3 mt-10 font-display text-[23px] font-bold leading-snug text-ink">
                  {typeset(block.text, locale)}
                </h2>
              ) : (
                <p key={i} className={`mb-5 leading-[1.8] ${i === 0 ? "text-[19px] text-ink" : "text-[17px] text-ink/80"}`}>
                  {typeset(block.text, locale)}
                </p>
              ),
            )}
          </motion.div>

          <div className="mt-12 border-t border-line pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent transition-colors hover:text-accent-deep"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("blog.back")}
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
