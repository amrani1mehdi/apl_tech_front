import { BRANDS } from "@/lib/brands";

export function BrandMarquee() {
  return (
    <div className="brand-strip relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-paper to-transparent" />

      {/* the track carries the animation, not the lists: -50% of two identical
          lists is exactly one list, which is what makes the loop seamless */}
      <div className="pause-on-hover flex w-max animate-marquee">
        {[0, 1].map((dup) => (
          <ul key={dup} aria-hidden={dup === 1} className="flex items-center">
            {BRANDS.map((b) => (
              <li
                key={b.slug}
                className="mx-9 flex shrink-0 items-center text-faint transition-colors duration-300 hover:text-ink"
              >
                {/* the mark is a mask, so the colour above paints it */}
                <span
                  className="brand-mark"
                  style={{
                    ["--mark" as string]: `url(/brands/${b.slug}.svg)`,
                    ["--k" as string]: b.k,
                    ["--ar" as string]: b.ratio,
                  }}
                />
                <span className="sr-only">{b.name}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
