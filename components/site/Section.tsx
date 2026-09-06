"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/components/i18n/LocaleLink";
import { type ReactNode } from "react";
import { ScrambleText, SplitText } from "./Reveal";

/** Editorial divider: index marker + drawn line + label. */
export function Divider({ index, label }: { index: string; label: string }) {
  return (
    <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px] font-bold text-accent">({index})</span>
        <motion.span
          className="h-px flex-1 origin-left bg-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <ScrambleText
          text={label}
          className="font-sans text-[11px] font-semibold uppercase text-faint"
        />
      </div>
    </div>
  );
}

/** Section title block with optional CTA link. */
export function SectionHead({
  eyebrow,
  title,
  link,
  href = "/catalogue",
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  link?: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-3 font-sans text-[11px] font-semibold uppercase text-accent">
            <ScrambleText text={eyebrow} />
          </p>
        )}
        {typeof title === "string" ? (
          <SplitText
            as="h2"
            text={title}
            delay={0.06}
            className="font-display text-[clamp(2rem,4.5vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink"
          />
        ) : (
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.02em] text-ink">
            {title}
          </h2>
        )}
        {children && <div className="mt-3 max-w-md text-mute">{children}</div>}
      </div>
      {link && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 sm:self-end"
        >
          {link}
          <ArrowUpRight className="h-4 w-4 text-mute transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
        </Link>
      )}
    </div>
  );
}
