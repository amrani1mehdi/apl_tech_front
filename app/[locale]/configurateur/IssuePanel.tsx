"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { fill, type BuildState, type Issue } from "@/lib/pcbuilder/engine";

/**
 * What the compatibility engine found — PCB-06's output.
 *
 * Findings are written as sentences a customer can act on, not rule names: not
 * "SOCKET_MISMATCH" but "the processor is AM5, the board is LGA 1700, they
 * don't fit together". The phrasing matters more than it looks — this panel is
 * the only place the machine ever tells someone *no*, and a refusal that
 * cannot be understood reads as the site being broken rather than the build.
 *
 * A clean build says so rather than showing nothing. An empty panel is
 * ambiguous — it could equally mean "all good" or "not checked yet".
 *
 * ─── on what this header says ───
 * It used to repeat the verdict — "Compatible" — with "16 checks passed"
 * beside it. Both were wrong in their own way.
 *
 * The word duplicated the badge next to the page heading, so a customer read
 * "Compatible" twice on one screen from two different components and learned
 * nothing the second time. And the count was invented: the caller passed
 * `filled * 2`, so a full machine always "passed 16 checks" and a half-built
 * one always passed eight. It was a number shaped like evidence that was
 * really just the bay count doubled — precisely the sort of detail that costs
 * a page its credibility when somebody notices.
 *
 * So the header now reports the findings, which this panel actually owns and
 * can count honestly: none, or how many. The verdict stays where it was
 * already being given once.
 */
export function IssuePanel({
  issues,
  state,
}: {
  issues: Issue[];
  state: BuildState;
}) {
  const { t } = useLocale();

  /* The panel is the page's own white card, marked down its leading edge
     rather than filled with a tint.

     The edge rule is not a new invention: the parts list already flags a
     faulty row with exactly this device — `border-s-2` in the state colour —
     so a problem is marked the same way in both places a customer meets one,
     and the eye learns the mark once. What it replaces is a pale green box
     with a tick in a white circle, which is the most recognisable piece of
     status furniture there is and said nothing the sentence inside it did not.

     A clean build gets a neutral edge and ink type. No colour, no icon: there
     is nothing to decide. */
  const tone = {
    ok: { edge: "border-s-line", text: "text-ink" },
    warn: { edge: "border-s-warn", text: "text-warn" },
    error: { edge: "border-s-alert", text: "text-alert" },
  }[state];

  return (
    <div className={`overflow-hidden rounded-2xl border border-line border-s-2 bg-white ${tone.edge}`}>
      <div className="px-4 py-3.5">
        <p className={`text-[13px] font-semibold ${tone.text}`}>
          {issues.length === 0
            ? t("pcb.iss.clean")
            : fill(t(issues.length === 1 ? "pcb.iss.count1" : "pcb.iss.count"), {
                n: issues.length,
              })}
        </p>
      </div>

      <AnimatePresence initial={false}>
        {issues.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {/* Findings are ruled off from one another rather than bulleted.
                Each one is a full sentence about a specific pair of parts, and
                a coloured dot in front of a sentence is a decoration standing
                where the severity is already carried by the panel's own edge
                and by the words themselves. */}
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="border-t border-line-soft px-4 py-3 text-[12.5px] leading-relaxed text-mute"
              >
                {fill(t(issue.key), issue.vars)}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
