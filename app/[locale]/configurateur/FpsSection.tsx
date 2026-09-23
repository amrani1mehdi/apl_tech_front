"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useReveal } from "@/components/site/Reveal";
import { monogram } from "@/lib/brands";
import { RESOLUTIONS, estimate, type Game, type Tier } from "@/lib/pcbuilder/fps";
import type { Build } from "@/lib/pcbuilder/parts";

/**
 * A frame rate is a good-or-bad scale, so it gets the colours that mean good
 * and bad: green through amber to red, deepening as the numbers climb.
 *
 * The accent purple used to carry the top three bands and that was a mistake.
 * Purple is APL TECH's brand colour — it means *this site*, not *this is
 * fine* — so a table where good, adequate and excellent were all purple asked
 * the customer to read every figure to find out which rows were the good ones.
 * The same green/amber/red ramp is already doing this job on the compatibility
 * panel a few hundred pixels up the page, and a screen should not have two
 * different vocabularies for "this is fine".
 *
 * The figure itself takes the colour, not just the bar under it. The number is
 * what people read; tinting only the bar leaves the thing they are looking at
 * silent.
 */
const TIER_TONE: Record<Tier, { bar: string; text: string }> = {
  elite: { bar: "bg-emerald-600", text: "text-emerald-700" },
  great: { bar: "bg-emerald-500", text: "text-emerald-700" },
  smooth: { bar: "bg-emerald-400", text: "text-emerald-600" },
  playable: { bar: "bg-amber-500", text: "text-amber-600" },
  poor: { bar: "bg-red-500", text: "text-red-600" },
};

/** How long the estimate appears to be worked out before the rows resolve. */
const COMPUTE_MS = 900;
/** Gap between one game resolving and the next. */
const ROW_MS = 110;

const GRID = "sm:grid-cols-[minmax(0,20rem)_repeat(3,minmax(0,1fr))]";

/**
 * A frame rate counting up to itself.
 *
 * The whole reveal hangs on this. A table that simply appears has been
 * *fetched*; a table whose figures climb has been *worked out* — and this one
 * genuinely was: every cell is a model run over the parts the customer chose
 * ninety seconds ago. The animation is the honest description of that.
 */
function CountUp({ to, delay }: { to: number; delay: number }) {
  const reduced = useReducedMotion();
  /* Split rather than branched: with reduced motion there is no animation to
     run, so there is no state to hold and no effect to schedule. */
  return reduced ? <>{to}</> : <Rolling to={to} delay={delay} />;
}

function Rolling({ to, delay }: { to: number; delay: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const controls = animate(0, to, {
      duration: 0.9,
      delay,
      /* Fast out of the gate and a long settle, so the last twenty frames of
         the count are the ones actually read. A linear count arrives at its
         value with no emphasis at all. */
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, delay]);

  return <>{n}</>;
}

/** One row before it has a number in it.
 *
 *  Built to the real row's geometry — same tile, same tracks, same heights —
 *  so resolving swaps content without moving anything. That is the difference
 *  between a skeleton and a flash of the wrong layout. */
function SkeletonRow() {
  return (
    <li className={`grid grid-cols-3 gap-x-5 gap-y-3 border-b border-line-soft py-4 ${GRID} sm:items-center`}>
      <div className="col-span-3 flex items-center gap-3 sm:col-span-1">
        <span className="skeleton h-[3.1rem] w-[4.6rem] shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <span className="skeleton block h-3.5 w-32 rounded" />
          <span className="skeleton block h-2.5 w-24 rounded" />
        </div>
      </div>

      {RESOLUTIONS.map((r) => (
        <div key={r.key} className="min-w-0">
          <span className="skeleton mx-auto block h-6 w-16 rounded" />
          <span className="skeleton mt-2 block h-1 w-full rounded-full" />
          <span className="skeleton mx-auto mt-2 block h-2.5 w-20 rounded" />
        </div>
      ))}
    </li>
  );
}

/**
 * A game's key art, or its initials.
 *
 * The fallback is not a placeholder to be replaced later — it is the state the
 * folder is in today, and it has to look deliberate. A monogram on a tinted
 * ground is what the catalogue's brand filter already does for a brand with no
 * mark on file, so the pattern is the site's own rather than a new invention.
 *
 * The tint is derived from the id, so a game keeps the same colour on every
 * render and two adjacent rows are never the same shade.
 */
function GameArt({ game }: { game: Game }) {
  const [failed, setFailed] = useState(false);

  /* A stable hue per title. Spread around the wheel but pinned to a low
     saturation and high lightness, so a column of them reads as one set
     rather than as a paint chart competing with the accent. */
  const hue = [...game.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

  /* Landscape, because game marks are. A square tile crops a wordmark like
     "COUNTER-STRIKE 2" down to about two syllables, and the drawn tiles are
     generated at this same 3:2 so the two sources sit together without one
     looking letterboxed against the other. */
  return (
    <span className="relative grid h-[3.1rem] w-[4.6rem] shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
      {failed ? (
        <span
          className="grid h-full w-full place-items-center font-display text-[13px] font-bold"
          style={{ background: `hsl(${hue} 34% 92%)`, color: `hsl(${hue} 40% 38%)` }}
        >
          {monogram(game.name)}
        </span>
      ) : (
        <img
          src={game.image}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className={`h-full w-full ${
            game.fit === "contain" ? "object-contain p-1" : "object-cover"
          }`}
        />
      )}
    </span>
  );
}

/**
 * Estimated frames, every resolution at once — PCB-10.
 *
 * On the page rather than behind a button. This is the answer to the question
 * customers actually arrive with — "will it run the game I play" — and putting
 * it behind "Voir les FPS estimés" made the one figure they came for the one
 * thing they had to go looking for.
 *
 * The titles are the shop's, from `DEFAULT_GAMES`, and the panel offers no way
 * to add or drop one. Which games a storefront leads with is merchandising,
 * and a customer free to curate the list can pick five esport titles and walk
 * away believing every machine in the catalogue performs the same.
 *
 * The bars are scaled within each game's own row rather than across the whole
 * table. A row is one game, and the only comparison worth making inside it is
 * what each resolution costs you. Scaling globally would make every esport row
 * a wall of full bars and every heavy row a set of stubs — comparing games
 * nobody is choosing between, and hiding the comparison they are.
 *
 * Which is also why the quality preset is printed once per row and not per
 * cell: the three numbers are only comparable because they were measured the
 * same way.
 */
export function FpsSection({
  build,
  games,
}: {
  build: Build;
  games: string[];
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const { ref, inView } = useReveal<HTMLElement>("0px 0px -10% 0px");

  const rows = estimate(build, games);

  /**
   * The estimate is computed synchronously and is ready long before this is
   * scrolled to, so the skeleton is not waiting on anything. It is there
   * because the table is the *conclusion of a calculation*, and handing
   * someone fifteen finished numbers in one frame reads as a lookup. Held for
   * a beat and then resolved a game at a time, it reads as what it is.
   *
   * Fires on first sight rather than on mount: the section sits below the
   * fold, and on mount the whole performance would be over before anyone had
   * scrolled far enough to see a frame of it.
   *
   * Once resolved it stays resolved. Re-running the count every time a swap
   * changes the numbers would make editing the build feel like reloading the
   * page — and the instrument rail already tweens those changes in place.
   */
  const [settled, setSettled] = useState(false);

  /* Under reduced motion there is nothing to wait for, so this is read
     straight off `inView` rather than set from an effect — a synchronous
     setState in an effect body is a second render for a value that was
     already knowable during the first. */
  const resolved = reduced ? Boolean(inView) : settled;

  useEffect(() => {
    if (reduced || !inView || settled) return;
    const id = setTimeout(() => setSettled(true), COMPUTE_MS);
    return () => clearTimeout(id);
  }, [inView, settled, reduced]);

  /* `ref` goes on this branch too, and it is not decoration.
 *
 *  `useReveal` observes `ref.current` from an effect that runs once. Mounted
 *  without a processor and a graphics card — which is how a builder the
 *  customer fills in themselves starts — this branch rendered a section with
 *  no ref on it, so the observer was never created. Choosing the two parts
 *  later swapped in the main branch and attached the ref, but the effect had
 *  already run and nothing was watching: `inView` stayed false forever, and
 *  the table below sat on skeleton rows with "Calcul des performances…"
 *  pulsing at it for as long as the page was open. */
  if (rows.length === 0) {
    return (
      <section ref={ref} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink">{t("pcb.fps.title")}</h2>
        <p className="mt-2 text-[13px] text-mute">{t("pcb.fps.needBoth")}</p>
      </section>
    );
  }

  return (
    <section ref={ref} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      {/* Full width, with the name column pinned at 20rem and the three
          resolution columns taking everything that is left.

          Which way round matters. Let the *name* flex and it absorbs every
          spare pixel, opening a hand's width of nothing between a title and
          its figures. Pin the name and flex the data and the same width goes
          into the bars instead — which are the part of this table that is
          actually better for being longer. */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-[clamp(1.2rem,2.4vw,1.6rem)] font-bold text-ink">
            {t("pcb.fps.title")}
          </h2>
          {!resolved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-accent"
            >
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.14 }}
                    className="h-1 w-1 rounded-full bg-accent"
                  />
                ))}
              </span>
              {t("pcb.fps.computing")}
            </motion.span>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-mute">{t("pcb.fps.lead")}</p>

        {/* Column heads, hidden on narrow screens where each row carries its own
            three-up grid and these would double up. */}
        <div className="mt-6 hidden grid-cols-[minmax(0,20rem)_repeat(3,minmax(0,1fr))] gap-5 border-b border-line pb-2.5 sm:grid">
          <span />
          {RESOLUTIONS.map((r) => (
            <div key={r.key} className="text-center">
              <p className="font-display text-[15px] font-bold text-ink">{r.label}</p>
              <p dir="ltr" className="font-mono text-[9.5px] text-faint">{r.pixels}</p>
            </div>
          ))}
        </div>

        <ul>
          {!resolved && rows.map((row) => <SkeletonRow key={row.game.id} />)}

          {resolved &&
            rows.map((row, i) => {
            /* The 1080p figure anchors the row — it is always the largest, so
               every other bar reads directly as a fraction of it. */
            const peak = Math.max(...row.cells.map((c) => c.fps), 1);
            const rowDelay = i * (ROW_MS / 1000);

            return (
              <motion.li
                key={row.game.id}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: rowDelay, ease: [0.16, 1, 0.3, 1] }}
                className={`grid grid-cols-3 gap-x-5 gap-y-3 border-b border-line-soft py-4 ${GRID} sm:items-center`}
              >
                <div className="col-span-3 flex items-center gap-3 sm:col-span-1">
                  <GameArt game={row.game} />
                  <div className="min-w-0 flex-1">
                    <p dir="ltr" className="truncate text-[14px] font-semibold text-ink rtl:text-end">
                      {row.game.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      {t("pcb.fps.quality")} · {t(`pcb.preset.${row.cells[0].preset}`)}
                    </p>
                  </div>
                </div>

                {row.cells.map((cell, ci) => {
                  const tone = TIER_TONE[cell.tier];
                  /* Each column starts a beat after the one before, so a row
                     resolves left to right — 1080p, then what 1440p costs,
                     then what 4K costs. That order is the entire argument the
                     table is making. */
                  const cellDelay = rowDelay + ci * 0.07;

                  return (
                    <div key={cell.res} className="min-w-0">
                      <p className="mb-1 text-center font-display text-[11px] font-bold text-mute sm:hidden">
                        {RESOLUTIONS[ci].label}
                      </p>
                      <p
                        dir="ltr"
                        className={`text-center font-display text-[1.4rem] font-bold leading-none tabular-nums ${tone.text}`}
                      >
                        <CountUp to={cell.fps} delay={cellDelay} />
                        <span className="ms-1 font-sans text-[10px] font-medium text-faint">fps</span>
                      </p>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line-soft">
                        <motion.div
                          initial={reduced ? false : { width: 0 }}
                          animate={{ width: `${(cell.fps / peak) * 100}%` }}
                          transition={{ duration: 0.9, delay: cellDelay, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full rounded-full ${tone.bar}`}
                        />
                      </div>
                      {/* The verdict lands after its number has stopped moving.
                          Arriving together, the word is read first and the
                          count becomes decoration underneath it. */}
                      <motion.p
                        initial={reduced ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: cellDelay + 0.75 }}
                        className={`mt-1.5 text-center text-[10px] font-medium ${tone.text}`}
                      >
                        {t(`pcb.tier.${cell.tier}`)}
                      </motion.p>
                    </div>
                  );
                })}
              </motion.li>
            );
          })}
        </ul>


        <p className="mt-6 border-t border-line-soft pt-4 text-[11px] leading-relaxed text-faint">
          {t("pcb.fps.note")}
        </p>
      </div>
    </section>
  );
}
