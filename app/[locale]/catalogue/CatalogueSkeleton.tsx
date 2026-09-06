/**
 * What the store shows while the client half of the catalogue is still
 * arriving. It is the shape of the real page rather than a spinner — the
 * category rail, the filter column and a grid of cards at the same sizes and
 * gaps — so the products land in the boxes already on screen and nothing
 * jumps when the real thing takes over.
 *
 * A server component: it renders inside the Suspense boundary, and it has no
 * state, no handlers and nothing to hydrate.
 */
export function CatalogueSkeleton() {
  return (
    <div aria-hidden>
      {/* category rail */}
      <div className="border-b border-line bg-paper/85">
        <div className="mx-auto flex max-w-[1320px] items-center gap-5 px-5 lg:px-8">
          <span className="skeleton hidden h-3 w-16 rounded lg:block" />
          <div className="flex flex-1 gap-1.5 py-3">
            {[88, 132, 118, 104, 96, 126].map((w, i) => (
              <span
                key={i}
                className="skeleton h-9 shrink-0 rounded-full"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1320px] px-5 py-10 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[268px_1fr] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="rounded-2xl border border-line bg-cloud p-5">
              <span className="skeleton block h-5 w-24 rounded" />
              <div className="mt-6 space-y-6">
                {[5, 4, 3].map((rows, g) => (
                  <div key={g}>
                    <span className="skeleton block h-2.5 w-20 rounded" />
                    <div className="mt-3 space-y-2">
                      {Array.from({ length: rows }, (_, i) => (
                        <span key={i} className="skeleton block h-6 rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <span className="skeleton h-5 w-28 rounded" />
              <span className="skeleton h-9 w-40 rounded-full" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:mt-10 lg:gap-x-7 lg:gap-y-12">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <span className="skeleton block aspect-[4/5] rounded-xl" />
                  <span className="skeleton mt-3.5 block h-2.5 w-16 rounded" />
                  <span className="skeleton mt-2 block h-4 w-4/5 rounded" />
                  <span className="skeleton mt-2.5 block h-5 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
