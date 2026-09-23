import type { CSSProperties } from "react";

import { AplLoader } from "@/components/site/AplLoader";

/**
 * What a product page shows while its client half is still arriving. It is the
 * shape of the real page rather than a spinner — the square gallery frame and
 * its thumbnails, the whole info column down to the share row, the description
 * and spec table, and a row of related cards — so the product lands in the
 * boxes already on screen and nothing jumps when the real thing takes over.
 *
 * The measurements written as raw pixels are the ones a placeholder cannot
 * arrive at on its own: a button is 52px tall because of the text inside it,
 * and an empty box has no text. Everything else is the same utility the live
 * component uses, so the two cannot drift apart silently.
 *
 * A server component: it renders inside the Suspense boundary, and it has no
 * state, no handlers and nothing to hydrate.
 *
 * The `Bar` here is a copy of the catalogue skeleton's rather than a shared
 * import — it is three lines, and the two pages have no other reason to be
 * coupled. The reasoning behind `flat` is written out once, over there.
 */

/** A placeholder bar. `flat` drops the travelling sheen, which is the right
    call for anything too small to show one — see .skeleton-flat. */
function Bar({
  className,
  flat,
  style,
}: {
  className: string;
  flat?: boolean;
  /** for the widths that are a measurement rather than a step on the scale */
  style?: CSSProperties;
}) {
  return (
    <span
      className={`${flat ? "skeleton-flat" : "skeleton"} block rounded ${className}`}
      style={style}
    />
  );
}

/** The specs table: how wide the key and the value are, row by row, so the
    column does not read as a stack of identical pairs. */
const SPECS = [
  [64, 96],
  [76, 128],
  [56, 84],
  [88, 112],
  [68, 140],
  [72, 92],
];

export function ProductSkeleton() {
  return (
    <main aria-hidden className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        {/* ── breadcrumb ── */}
        <nav className="flex flex-wrap items-center gap-1.5 py-5">
          <Bar flat className="h-2.5 w-16" />
          <span className="h-3 w-px bg-line" />
          <Bar flat className="h-2.5 w-28" />
          <span className="h-3 w-px bg-line" />
          <Bar flat className="h-2.5 w-40" />
        </nav>

        {/* ── main ── */}
        <div className="grid grid-cols-1 gap-10 py-6 lg:grid-cols-2 lg:gap-16">
          {/* ── gallery ── */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            {/* The frame keeps its own border and tint: it is the one box on
                the page whose edges are visible before anything loads, and
                filling it with a placeholder instead would make the picture
                arrive into a hole rather than into a frame. */}
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-cloud">
              {/* The mark draws itself where the photograph will be — the one
                  place on this page big enough to watch it happen. */}
              <div className="absolute inset-0 grid place-items-center">
                <span className="apl-loader-halo grid h-60 w-60 place-items-center rounded-full">
                  <AplLoader />
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Bar key={i} className="h-20 w-20 shrink-0 rounded-lg" />
              ))}
            </div>
          </div>

          {/* ── info ── */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <Bar flat className="mt-1 h-2.5 w-20" />
              <Bar className="-mt-2 h-9 w-9 shrink-0 rounded-full" />
            </div>

            {/* the title runs to two lines on most names */}
            <Bar className="mt-2.5 h-9 w-11/12" />
            <Bar className="mt-2.5 h-9 w-2/3" />

            {/* rating */}
            <div className="mt-4 flex items-center gap-3">
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Bar key={i} flat className="h-4 w-4 rounded-sm" />
                ))}
              </span>
              <Bar flat className="h-3 w-24" />
            </div>

            {/* short description */}
            <div className="mt-5 max-w-md">
              <Bar flat className="h-3 w-full" />
              <Bar flat className="mt-2 h-3 w-4/5" />
            </div>

            {/* price, old price, discount pill */}
            <div className="mt-7 flex flex-wrap items-end gap-3">
              <Bar className="h-9 w-48" />
              <Bar flat className="mb-1 h-4 w-20" />
              <Bar className="mb-1.5 h-6 w-28 rounded-full" />
            </div>

            {/* ── the buy box ── */}
            <div className="mt-6">
              {/* availability: a dot and a line */}
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-line" />
                <Bar flat className="h-3 w-52" />
              </div>

              {/* Whatever banner the stock state calls for. There is always one
                  on a page that has any of these states, and holding its height
                  is the whole point — this is the tallest thing that would
                  otherwise appear out of nowhere and push the buttons down. */}
              <div className="mt-5 rounded-xl border border-line bg-cloud px-4 py-3.5">
                <Bar flat className="h-3 w-40" />
                <Bar flat className="mt-2 h-2.5 w-56" />
              </div>

              {/* quantity, order, add to cart */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Bar className="h-[52px] w-[136px] rounded-full" />
                <Bar className="h-[52px] min-w-[200px] flex-1 rounded-full" />
                <Bar className="h-[52px] w-[190px] rounded-full" />
              </div>
            </div>

            {/* delivery, payment, warranty */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Bar key={i} className="h-[52px] w-full rounded-xl" />
              ))}
            </div>

            <Bar flat className="mt-5 h-3 w-64" />

            {/* share row */}
            <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-line pt-6">
              <Bar flat className="h-3 w-20" />
              <Bar className="h-[38px] w-32 rounded-full" />
              <Bar className="h-[38px] w-36 rounded-full" />
            </div>
          </div>
        </div>

        {/* ── description and specs ── */}
        <section className="border-t border-line py-14 lg:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Bar className="h-6 w-40" />
              <div className="mt-5 max-w-2xl">
                {[100, 96, 92, 98, 70].map((pct, i) => (
                  <Bar
                    key={i}
                    flat
                    className="mt-2.5 h-3 first:mt-0"
                    style={{ width: `${pct}%` }}
                  />
                ))}
              </div>
            </div>

            <div>
              <Bar className="h-6 w-28" />
              <div className="mt-5 max-w-2xl">
                <Bar flat className="h-2.5 w-24" />
                {/* the same rule the real table draws between its rows */}
                <dl className="mt-3 divide-y divide-line-soft border-y border-line">
                  {SPECS.map(([k, v], i) => (
                    <div key={i} className="flex items-baseline gap-3 py-3.5">
                      <Bar flat className="h-3 shrink-0" style={{ width: k }} />
                      <span className="h-px min-w-4 flex-1 bg-line-soft" />
                      <Bar flat className="h-3 shrink-0" style={{ width: v }} />
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ── related ── */}
        <section className="border-t border-line py-16 lg:py-24">
          <Bar className="h-8 w-64" />
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-6 sm:gap-y-9 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
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
        </section>
      </div>
    </main>
  );
}
