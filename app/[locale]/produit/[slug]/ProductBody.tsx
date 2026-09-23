"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { RichBlock, Spec } from "@/lib/products";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * **bold** and nothing else.
 *
 * The description is authored text, and the one mark the copy has ever needed
 * is emphasis. Splitting on the delimiter and rendering the odd pieces as
 * <strong> keeps the whole thing text — there is no path here by which a
 * description could introduce markup, which is the entire reason PRD-10 is a
 * block list rather than a field of HTML.
 */
function Marked({ text }: { text: string }) {
  const pieces = text.split("**");
  return (
    <>
      {pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink">
            {piece}
          </strong>
        ) : (
          <Fragment key={i}>{piece}</Fragment>
        ),
      )}
    </>
  );
}

/** PRD-10 — the description an admin wrote, block by block. */
export function RichText({ blocks }: { blocks: RichBlock[] }) {
  const reduced = useReducedMotion();

  return (
    <div className="max-w-2xl">
      {blocks.map((b, i) => (
        <motion.div
          key={i}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{
            duration: reduced ? 0.2 : 0.5,
            ease: EASE_OUT,
            // each block follows the one above rather than the whole essay
            // arriving at once
            delay: reduced ? 0 : Math.min(i, 6) * 0.06,
          }}
        >
          {b.t === "h" && (
            <h3 className="mt-8 font-display text-lg font-bold text-ink first:mt-0">{b.text}</h3>
          )}
          {b.t === "p" && (
            <p className="mt-3 leading-relaxed text-mute first:mt-0">
              <Marked text={b.text} />
            </p>
          )}
          {b.t === "ul" && (
            <ul className="mt-4 space-y-2">
              {b.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-mute">
                  {/* a rule rather than a bullet — the same mark the spec
                      table uses to join a label to its value */}
                  <span className="mt-2.5 h-px w-3 shrink-0 bg-accent" aria-hidden />
                  <span className="leading-relaxed">
                    <Marked text={item} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {b.t === "img" && (
            <img
              src={b.src}
              alt={b.alt ?? ""}
              className="mt-6 w-full rounded-xl border border-line object-cover"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * PRD-11 — characteristic/value, one table per family.
 *
 * The unnamed group prints without a heading, so a product whose specs nobody
 * has grouped yet reads exactly as it did before the field existed.
 */
export function SpecTable({ groups }: { groups: { name: string; specs: Spec[] }[] }) {
  const reduced = useReducedMotion();

  return (
    <div className="max-w-2xl">
      {groups.map((g, gi) => (
        <section key={g.name || gi} className="mt-8 first:mt-0">
          {g.name && (
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-wide text-accent">
              {g.name}
            </h3>
          )}
          <dl className="mt-3 divide-y divide-line-soft border-y border-line">
            {g.specs.map((s, i) => (
              <motion.div
                key={s.k}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: reduced ? 0.15 : 0.34,
                  ease: EASE_OUT,
                  delay: reduced ? 0 : Math.min(i, 8) * 0.03,
                }}
                className="flex items-baseline gap-3 py-3"
              >
                <dt className="shrink-0 text-sm text-mute">{s.k}</dt>
                {/* the rule carries the eye across the gap, which is the whole
                    job of a two-column table read at a glance */}
                <span aria-hidden className="h-px min-w-4 flex-1 bg-line-soft" />
                {/* Spec values are Latin technical runs — "10 752 CUDA", "16 Go GDDR7",
                    "2,72 GHz" — and an RTL page took them apart. The space inside a
                    grouped figure is bidi-neutral, so 10 752 rendered as 752 10, and
                    a unit landed on the far side of its own number. <bdi> resolves
                    each value from its own first strong character and places the
                    result as one unit: the run reads as written, and still sits
                    where the Arabic line expects it. */}
                <dd className="text-end text-sm font-medium text-ink">
                  <bdi>{s.v}</bdi>
                </dd>
              </motion.div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** The two of them, under one pair of headings. */
export function ProductBody({
  description,
  groups,
}: {
  description?: RichBlock[];
  groups: { name: string; specs: Spec[] }[];
}) {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
      {description && description.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-ink">{t("pd.description")}</h2>
          <div className="mt-5">
            <RichText blocks={description} />
          </div>
        </section>
      )}
      <section>
        <h2 className="font-display text-xl font-bold text-ink">{t("pd.specs")}</h2>
        <div className="mt-5">
          <SpecTable groups={groups} />
        </div>
      </section>
    </div>
  );
}
