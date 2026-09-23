import type { ReactNode } from "react";

/**
 * The parcel — one drawing, used by both scenes.
 *
 * Cardboard, taped in the shop's purple. Drawn at 36 × 30 with its bottom
 * edge on y = 30, so placing it on a surface is `y = surface − 30`.
 *
 * The kraft browns are the one set of colours on the page that are not the
 * brand's. A parcel in purple reads as a gift box or an icon; in cardboard it
 * reads as the thing that will actually turn up at the door.
 */
export function Parcel({
  label = false,
  children,
}: {
  /** a shipping label with a barcode on the front — the scanner scene reads it */
  label?: boolean;
  /** badges and rings that travel with the parcel */
  children?: ReactNode;
}) {
  return (
    <>
      {/* side */}
      <path d="M28 8 L36 0 V22 L28 30 Z" className="fill-[#b98450] stroke-ink" strokeWidth={1.4} strokeLinejoin="round" />
      {/* top */}
      <path d="M0 8 L8 0 H36 L28 8 Z" className="fill-[#e7c291] stroke-ink" strokeWidth={1.4} strokeLinejoin="round" />
      {/* front */}
      <rect x={0} y={8} width={28} height={22} className="fill-[#d6a46f] stroke-ink" strokeWidth={1.4} />
      {/* tape, over the top and down the front */}
      <path d="M11 8 L19 0 H24 L16 8 Z" className="fill-accent-lit" />
      <rect x={11} y={8} width={5} height={22} className="fill-accent" />

      {label && (
        <g>
          <rect x={2.5} y={17} width={7} height={9} rx={0.8} className="fill-white" />
          {[3.6, 4.8, 5.5, 6.9, 8.1].map((x, i) => (
            <rect key={x} x={x} y={18.5} width={i % 2 ? 0.45 : 0.8} height={5} className="fill-ink" />
          ))}
          <rect x={18} y={11} width={8} height={5} rx={0.8} className="fill-white" />
          <rect x={19.2} y={12.6} width={5.6} height={0.8} className="fill-ink/60" />
          <rect x={19.2} y={14} width={3.6} height={0.8} className="fill-ink/60" />
        </g>
      )}

      {children}
    </>
  );
}
