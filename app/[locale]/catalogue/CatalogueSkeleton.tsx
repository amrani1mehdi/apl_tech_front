import { AplLoader } from "@/components/site/AplLoader";

/**
 * What the store shows while the client half of the catalogue is still
 * arriving. It is the shape of the real page rather than a spinner — the
 * category rail, the filter column, the search field, the results bar and a
 * full first page of cards, at the sizes and gaps the real ones use — so the
 * products land in the boxes already on screen and nothing jumps when the
 * real thing takes over.
 *
 * The measurements that are written as raw pixels are the ones a placeholder
 * cannot arrive at on its own: a category chip is 47px because of the text
 * inside it, and an empty box has no text. Everything else is the same
 * utility the live component uses, so the two cannot drift apart silently.
 *
 * A server component: it renders inside the Suspense boundary, and it has no
 * state, no handlers and nothing to hydrate.
 */

/** Chip widths taken off the live rail — a plausible run of category names,
    long enough to overflow the row the way fourteen of them really do. */
const CHIPS = [157, 107, 163, 120, 128, 101, 102, 150, 96, 134];

/** How many options each filter group shows before it offers the rest. */
const GROUPS = [
  { rows: 6, more: true, tall: true },
  { rows: 0, more: false, tall: false },
  { rows: 6, more: true, tall: false },
  { rows: 4, more: false, tall: false },
  { rows: 1, more: false, tall: false },
];

/** A placeholder bar. `flat` drops the travelling sheen, which is the right
    call for anything too small to show one — see .skeleton-flat. */
function Bar({ className, flat }: { className: string; flat?: boolean }) {
  return <span className={`${flat ? "skeleton-flat" : "skeleton"} block rounded ${className}`} />;
}

export function CatalogueSkeleton() {
  return (
    <div aria-hidden>
      {/* ── category rail ── */}
      <div className="border-b border-line bg-paper/85">
        <div className="mx-auto flex max-w-[1320px] items-center gap-5 px-5 lg:px-8">
          <Bar flat className="hidden h-2.5 w-16 shrink-0 lg:block" />
          <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-hidden px-1 py-4">
            {CHIPS.map((w, i) => (
              <span
                key={i}
                className="skeleton h-[47px] shrink-0 rounded-full"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1320px] px-5 pb-14 pt-10 lg:px-8 lg:pb-20 lg:pt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[268px_1fr] lg:gap-12">
          {/* ── filter column ── */}
          <aside className="hidden lg:block">
            <div className="rounded-2xl border border-line bg-cloud p-5">
              <div className="mb-5 border-b border-line-soft pb-4">
                <Bar className="h-5 w-20" />
              </div>

              {GROUPS.map((g, i) => (
                <div key={i} className="border-b border-line-soft pb-4 last:border-b-0 last:pb-0">
                  {/* the group's own heading — a tick, a label, a chevron */}
                  <div className="flex items-center gap-2 py-3">
                    <span className="h-2.5 w-px bg-line" />
                    <Bar flat className="h-2.5 w-20" />
                    <Bar flat className="ms-auto h-3.5 w-3.5 rounded-sm" />
                  </div>

                  {/* the price group is a track and two fields, not a list */}
                  {g.rows === 0 ? (
                    <div className="px-1 pt-1">
                      <Bar className="h-1 w-full rounded-full" />
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex-1">
                          <Bar flat className="h-2 w-8" />
                          <Bar className="mt-1 h-[34px] w-full rounded-lg" />
                        </div>
                        <span className="mb-4 h-px w-2 shrink-0 bg-line" />
                        <div className="flex-1">
                          <Bar flat className="h-2 w-8" />
                          <Bar className="mt-1 h-[34px] w-full rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {Array.from({ length: g.rows }, (_, row) => (
                        <Bar
                          key={row}
                          className={`w-full rounded-lg ${g.tall ? "h-9" : "h-7"}`}
                        />
                      ))}
                      {g.more && <Bar flat className="mt-2 h-2.5 w-24" />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* ── results column ── */}
          <div>
            <Bar className="mb-5 h-[42px] w-full max-w-sm rounded-full" />

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4">
              <Bar className="h-5 w-28" />
              <div className="flex items-center gap-2.5">
                {/* the filter button only exists below lg, where the panel
                    beside the grid does not */}
                <Bar className="h-[42px] w-28 rounded-full lg:hidden" />
                <Bar className="h-[42px] w-[82px] rounded-full" />
                <Bar className="h-[42px] w-32 rounded-full" />
              </div>
            </div>

            {/* A full page of nine, the same batch the grid loads on a desktop
                — six would leave the last row arriving from nowhere. */}
            <div className="relative">
              <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i}>
                    <Bar className="aspect-[4/5] w-full rounded-xl" />
                    <div className="mt-3.5">
                      <Bar flat className="h-2.5 w-24" />
                      <Bar className="mt-1.5 h-5 w-4/5" />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Bar className="h-7 w-24" />
                        <Bar flat className="h-3.5 w-14" />
                      </div>
                      <Bar flat className="mt-2 h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Over the cards rather than above them. In the flow it would
                  make the placeholder page taller than the real one, and the
                  whole grid would jump the moment the products arrived. It is
                  held near the top of the grid for the same reason: centred
                  down a three-row grid, the mark would load below the fold. */}
              <div className="pointer-events-none absolute inset-x-0 top-10 grid h-[clamp(220px,34vh,400px)] place-items-center">
                <span className="apl-loader-halo grid h-60 w-60 place-items-center rounded-full">
                  <AplLoader />
                </span>
              </div>
            </div>

            {/* pager on wide screens, one long button below them */}
            <div className="mt-10 hidden items-center justify-center gap-1.5 border-t border-line pt-8 lg:flex">
              {Array.from({ length: 6 }, (_, i) => (
                <Bar key={i} className="h-9 w-9 rounded-full" />
              ))}
            </div>
            <Bar className="mt-10 h-[50px] w-full rounded-full lg:hidden" />
          </div>
        </div>
      </section>
    </div>
  );
}
