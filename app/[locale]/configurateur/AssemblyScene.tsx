"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import {
  approach,
  at,
  edges,
  faceMatrixX,
  faceMatrixY,
  faceMatrixZ,
  faces,
  fins,
  panelX,
  panelY,
  panelZ,
  seg,
  slotsZ,
  type Box,
  type P3,
} from "@/lib/pcbuilder/iso";
import {
  ASSEMBLY_MS,
  FANS,
  GLASS,
  GLASS_DELAY,
  PANELS,
  PIECES,
  SHELL,
  TONES,
  VIEW_BOX,
  type ToneName,
} from "@/lib/pcbuilder/scene";

/**
 * The tower assembling itself.
 *
 * This is what happens in the gap between the customer finishing their answers
 * and the parts list appearing. That gap is real work — the generator searches
 * every processor against every card and rules on the result — and it will get
 * longer, not shorter, once a model is doing the reading. A spinner would
 * spend that time saying nothing. This spends it saying exactly what is
 * happening: a machine is being put together.
 *
 * Built in the order a person builds one — supply, board, processor, cooler,
 * memory, drive, card, panel — because that order is legible to anyone who has
 * watched it done.
 *
 * ─── on the detail ───
 * The parts are not boxes. A box the size of a graphics card is a grey slab
 * and reads as a placeholder; what makes one legible as a graphics card is the
 * shroud line, the fin stack behind it and the bracket at the end. So each
 * part carries the two or three features that identify it and nothing else —
 * fins on the heatsinks, slots and sockets on the board, a grille on the
 * supply, ridges on the memory. Every one of them is a flat shape lying in one
 * of the case's own planes, drawn with the helpers in `lib/pcbuilder/iso.ts`,
 * so nothing here needs a second idea of where "up" is.
 *
 * Geometry and timing live in `lib/pcbuilder/scene.ts`, where they can be
 * checked. This file draws them.
 */

const INK = "rgba(21,21,26,0.4)";
const INK_SOFT = "rgba(21,21,26,0.26)";
const INK_FAINT = "rgba(21,21,26,0.16)";

/**
 * One solid part: three faces, one stroke weight, and two gradient passes.
 *
 * The three flat tones do the modelling — that is what makes a box read as
 * solid with no gradient anywhere, and it is how isometric drawing has always
 * worked. The gradients only stop the drawing going dead: a sheen down the
 * upward face, which is what keeps a white cooler from vanishing on a white
 * ground, and a soft floor-ward shade on the two vertical faces, which gives
 * every part the same imaginary light and stops a wall of flat tone.
 */
function Solid({ box, tone, children }: { box: Box; tone: ToneName; children?: React.ReactNode }) {
  const f = faces(box);
  const c = TONES[tone];
  /* An accent or ink part is dark enough that an ink edge disappears into it;
     a pale edge is what separates its three faces there. */
  const line = tone === "accent" || tone === "ink" || tone === "board" ? "rgba(255,255,255,0.26)" : INK;

  return (
    <g strokeWidth={0.75} strokeLinejoin="round">
      <path d={f.front} fill={c.front} stroke={line} />
      <path d={f.front} fill="url(#pcb3d-shade)" stroke="none" />
      <path d={f.side} fill={c.side} stroke={line} />
      <path d={f.side} fill="url(#pcb3d-shade)" stroke="none" />
      <path d={f.top} fill={c.top} stroke={line} />
      <path d={f.top} fill="url(#pcb3d-sheen)" stroke="none" />
      {children}
    </g>
  );
}

/* ── fans ───────────────────────────────────────────────────────────────── */

function Fan({
  p,
  r,
  spin,
  plane = "x",
}: {
  p: P3;
  r: number;
  spin?: boolean;
  /** which face the fan is mounted on — the open side, or the case front */
  plane?: "x" | "z";
}) {
  const { cx, cy } = at(p);
  /* Seven blades, swept rather than straight. A straight-spoked fan reads as a
     wheel; the sweep is what says it moves air. */
  const blades = Array.from({ length: 7 }, (_, i) => (i * 360) / 7);

  return (
    <g transform={plane === "z" ? faceMatrixZ(cx, cy) : faceMatrixX(cx, cy)}>
      <circle r={r} fill="rgba(255,255,255,0.55)" stroke={INK_SOFT} strokeWidth={0.9} />
      <circle r={r * 0.94} fill="none" stroke={INK_FAINT} strokeWidth={0.5} />
      {/* The housing stays put and only the blades turn, nested so the face
          matrix above is not the thing being animated — a CSS transform on
          this group would replace that matrix outright and fling the fan
          across the drawing. The blades are symmetric about their own origin,
          so `fill-box` centre is exactly the hub. */}
      <g className={spin ? "pcb3d-fan" : undefined}>
        {blades.map((a) => {
          const rad = (a * Math.PI) / 180;
          const sweep = 0.55;
          return (
            <path
              key={a}
              d={`M${(r * 0.28 * Math.cos(rad)).toFixed(2)} ${(r * 0.28 * Math.sin(rad)).toFixed(2)}
                  Q${(r * 0.72 * Math.cos(rad + sweep * 0.5)).toFixed(2)} ${(r * 0.72 * Math.sin(rad + sweep * 0.5)).toFixed(2)}
                   ${(r * 0.9 * Math.cos(rad + sweep)).toFixed(2)} ${(r * 0.9 * Math.sin(rad + sweep)).toFixed(2)}`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={r * 0.16}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle r={r * 0.27} fill="rgba(21,21,26,0.14)" stroke={INK_SOFT} strokeWidth={0.7} />
    </g>
  );
}

/* ── per-part detail ────────────────────────────────────────────────────── */

/** The board: rear I/O block, socket, slots, heatsinks, the 24-pin. All of it
    lies on the tray's outward face, which is the only one you can see. */
function BoardDetail({ box }: { box: Box }) {
  const fx = box.x + box.dx; // the face looking out of the open side
  const ink = TONES.ink;

  return (
    <g>
      {/* rear I/O shroud — the block of ports at the back of every board */}
      <path d={panelX(fx, 108, 18, 20, 26)} fill={ink.side} stroke="none" />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={panelX(fx + 0.01, 112 + i * 6, 21, 4, 20)}
          fill="rgba(255,255,255,0.22)"
          stroke="none"
        />
      ))}

      {/* CPU socket surround */}
      <path
        d={panelX(fx, 88, 48, 20, 20)}
        fill="none"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth={0.7}
      />

      {/* Memory slots — four, of which two get filled. The z positions and
          widths match the sticks in `scene.ts` exactly: slots that do not line
          up with the parts sitting in them is the detail that makes a drawing
          look wrong without anyone being able to say why. */}
      {[76, 84, 92, 100].map((z) => (
        <path key={z} d={panelX(fx, 88, z, 34, 4)} fill={ink.front} stroke="none" />
      ))}

      {/* the long PCIe slot the card drops into, and a short one above it */}
      <path d={panelX(fx, 52, 26, 4, 74)} fill={ink.front} stroke="none" />
      <path d={panelX(fx, 76, 26, 3, 34)} fill={ink.side} stroke="none" />

      {/* The chipset heatsink — low and forward, clear of the drive above it
          and the card in front. There is no separate M.2 slab: the drive is
          its own part in the sequence, and a second one here sat inside the
          graphics card. */}
      <Solid box={{ x: fx, y: 40, z: 62, dx: 2.5, dy: 10, dz: 18 }} tone="slate" />
      <path d={panelX(fx + 2.5, 42, 65, 6, 12)} fill="none" stroke={INK_FAINT} strokeWidth={0.5} />

      {/* 24-pin power, at the board's front edge where it always is */}
      <path d={panelX(fx, 96, 114, 24, 5)} fill={ink.front} stroke="none" />

      {/* a scatter of capacitors around the socket, drawn as they read from
          this angle: short cylinders seen end-on */}
      {[
        [84, 44],
        [84, 50],
        [84, 56],
        [112, 46],
        [112, 52],
      ].map(([y, z]) => {
        const { cx, cy } = at([fx, y, z]);
        return <circle key={`${y}-${z}`} r={1.5} transform={faceMatrixX(cx, cy)} fill={ink.top} />;
      })}
    </g>
  );
}

/** The card: shroud, fin stack behind the fans, bracket, power tab. */
function GpuDetail({ box }: { box: Box }) {
  const fx = box.x + box.dx;
  const fz = box.z + box.dz;

  return (
    <g>
      {/* the fin stack, read through the length of the shroud */}
      <path d={fins(box, 5)} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.5} />

      {/* bracket at the rear of the card, where it screws into the case */}
      <Solid box={{ x: box.x, y: box.y - 2, z: box.z - 2.5, dx: 3, dy: box.dy + 4, dz: 2.5 }} tone="slate" />

      {/* the backplate edge, and the shroud's top seam */}
      <path
        d={seg([box.x, box.y + box.dy - 2, fz], [fx, box.y + box.dy - 2, fz])}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={0.6}
      />

      {/* the power connector, always on the top edge near the front */}
      <Solid box={{ x: box.x + 6, y: box.y + box.dy, z: fz - 22, dx: 7, dy: 2.5, dz: 10 }} tone="ink" />
    </g>
  );
}

/** The tower cooler: a fin stack with heatpipes coming out of the top. */
function CoolerDetail({ box }: { box: Box }) {
  const topY = box.y + box.dy;

  return (
    <g>
      <path d={fins(box, 13)} fill="none" stroke={INK_FAINT} strokeWidth={0.45} />
      {/* heatpipe ends, seen from above */}
      {[
        [box.x + 5, box.z + 7],
        [box.x + 5, box.z + 21],
        [box.x + 18, box.z + 7],
        [box.x + 18, box.z + 21],
      ].map(([x, z]) => {
        const { cx, cy } = at([x, topY, z]);
        return (
          <circle
            key={`${x}-${z}`}
            r={2}
            transform={faceMatrixY(cx, cy)}
            fill="#cfccd9"
            stroke={INK_SOFT}
            strokeWidth={0.5}
          />
        );
      })}
    </g>
  );
}

/** Memory: a ridged heatspreader with a lit strip along the top. */
function RamDetail({ box }: { box: Box }) {
  return (
    <g>
      <path
        d={slotsZ(box.x, box.y + 4, box.z + box.dz, box.dx, box.dy - 8, 3)}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={0.5}
      />
      <path
        d={panelY(box.x, box.y + box.dy + 0.01, box.z, box.dx, box.dz)}
        fill="#d9a2ee"
        stroke="none"
      />
    </g>
  );
}

/** The supply: a fan grille on top and the cable exit at the front. */
function PsuDetail({ box }: { box: Box }) {
  const { cx, cy } = at([box.x + box.dx * 0.42, box.y + box.dy, box.z + box.dz * 0.5]);
  return (
    <g transform={faceMatrixY(cx, cy)}>
      {[13, 9.5, 6].map((r) => (
        <circle key={r} r={r} fill="none" stroke={INK_FAINT} strokeWidth={0.6} />
      ))}
      <circle r={2.4} fill="rgba(21,21,26,0.18)" />
    </g>
  );
}

/** The drive: a label, which is all you ever see of one. */
function SsdDetail({ box }: { box: Box }) {
  return (
    <path
      d={panelX(box.x + box.dx + 0.01, box.y + 2, box.z + 3, box.dy - 4, box.dz - 6)}
      fill="rgba(255,255,255,0.6)"
      stroke={INK_FAINT}
      strokeWidth={0.4}
    />
  );
}

const DETAIL: Record<string, (p: { box: Box }) => React.ReactElement> = {
  mb: BoardDetail,
  gpu: GpuDetail,
  cooling: CoolerDetail,
  "ram-a": RamDetail,
  "ram-b": RamDetail,
  psu: PsuDetail,
  ssd: SsdDetail,
};

/* ── the case ───────────────────────────────────────────────────────────────
   Built out of solid panels with real thickness, not a wireframe box.
   That change is most of what separates a drawing of a machine from a drawing
   of a transparent cube: a wireframe shows all twelve edges including the
   three behind the object, and the eye reads the result as a glass box no
   matter how much detail sits inside it. Panels occlude each other, so the
   hidden lines are removed for free — and their cut edges give the case the
   3 mm of steel that says it is a physical thing.

   It is drawn in two passes with the components sandwiched between, because
   painter's order is the only depth test here. The floor, rear and tray sit
   behind everything; the basement divider, the front panel and the roof sit in
   front of it. Drawing the case as one group put the divider behind a power
   supply it is physically above. */

/** Floor, rear wall and motherboard tray — behind every component. */
function ShellBack({ lit }: { lit: boolean }) {
  return (
    <g className="pcb3d-case" data-lit={lit ? "" : undefined}>
      {/* feet, so the tower stands on something rather than stopping */}
      {[
        [4, 8],
        [4, 124],
        [48, 8],
        [48, 124],
      ].map(([x, z]) => (
        <path key={`${x}-${z}`} d={faces({ x, y: -4, z, dx: 8, dy: 4, dz: 8 }).side} fill="#b0acbd" />
      ))}

      <Solid box={PANELS.rear} tone="slate" />
      {/* rear I/O cutout and a stack of expansion-slot covers, where the
          card's bracket screws in */}
      <path
        d={panelZ(4, 106, PANELS.rear.z + PANELS.rear.dz + 0.01, 22, 26)}
        fill={TONES.ink.front}
      />
      {Array.from({ length: 6 }, (_, i) => 48 + i * 8).map((y) => (
        <path
          key={y}
          d={panelZ(5, y, PANELS.rear.z + PANELS.rear.dz + 0.01, 13, 5)}
          fill="rgba(21,21,26,0.2)"
        />
      ))}

      <Solid box={PANELS.tray} tone="steel" />
      {/* the cable pass-through every tray has behind the board */}
      <path
        d={panelX(PANELS.tray.x + PANELS.tray.dx + 0.01, 44, 122, 76, 10)}
        fill="rgba(21,21,26,0.09)"
      />

      <Solid box={PANELS.floor} tone="steel" />
    </g>
  );
}

/** Divider, front panel and roof — in front of the components. */
function ShellFront({ lit }: { lit: boolean }) {
  const fz = PANELS.front.z + PANELS.front.dz;
  const roofY = PANELS.roof.y + PANELS.roof.dy;

  return (
    <g className="pcb3d-case" data-lit={lit ? "" : undefined}>
      <Solid box={PANELS.divider} tone="steel" />

      <Solid box={PANELS.front} tone="steel" />

      {/* Three intake fans behind the front panel.
          Drawn on the panel's face and then crossed by the mesh slats below,
          which is what reads as *behind the mesh* rather than bolted to the
          outside of it. Mounting them at their true depth and letting the
          panel occlude them would be more honest and would show nothing at
          all: the panel is solid, and a fan you cannot see is not a fan. */}
      {[26, 64, 102].map((y) => (
        <Fan key={y} p={[30, y, fz + 0.02]} r={15} plane="z" spin />
      ))}

      {/* the mesh, over the fans */}
      <path
        d={slotsZ(6, 12, fz + 0.04, 48, 122, 15)}
        fill="none"
        stroke={INK_FAINT}
        strokeWidth={0.6}
      />
      {/* power button and two ports, along the top of the front panel */}
      {(() => {
        const { cx, cy } = at([12, 140, fz + 0.02]);
        return (
          <circle
            r={2.6}
            transform={faceMatrixZ(cx, cy)}
            fill="#b8b4c4"
            stroke={INK_SOFT}
            strokeWidth={0.5}
          />
        );
      })()}
      <path d={panelZ(24, 138, fz + 0.02, 6, 2.6)} fill={TONES.ink.front} />
      <path d={panelZ(34, 138, fz + 0.02, 6, 2.6)} fill={TONES.ink.front} />

      <Solid box={PANELS.roof} tone="steel" />
      {/* exhaust vents cut into the roof */}
      {Array.from({ length: 7 }, (_, i) => 22 + i * 13).map((z) => (
        <path
          key={z}
          d={panelY(8, roofY + 0.01, z, 44, 5)}
          fill="rgba(21,21,26,0.13)"
        />
      ))}

      {/* The silhouette, drawn over the panels so the tower keeps one crisp
          outline whatever the fills are doing — and the line the build
          sequence draws itself in on. */}
      <path
        className="pcb3d-frame"
        d={edges(SHELL)}
        pathLength={1}
        fill="none"
        stroke="rgba(21,21,26,0.42)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * The leader line naming the part currently lifted out.
 *
 * Anchored on the part's own centre, pushed out by the same lift the part
 * takes, then a short dog-leg up and out to the label — the standard run of an
 * assembly call-out, which goes out and then across so the text never sits on
 * top of the thing it is naming.
 *
 * The case has no box of its own in `PIECES`, so it anchors on the shell.
 */
function Callout({ id, label, lifted }: { id: string; label: string; lifted: boolean }) {
  const ids = PIECES_FOR[id] ?? [];
  const box = ids.length > 0 ? PIECES.find((p) => p.id === ids[0])?.box : SHELL;
  if (!box) return null;

  /* The pin has to sit on the part wherever the part currently is. Offsetting
     it by the lift unconditionally put it where the component would have been
     if it had moved — which, for a bay lit after a swap rather than by a
     cursor, is empty space next to it. */
  const [ox, oy] = lifted && ids.length > 0 ? LIFT : [0, 0];
  const { cx, cy } = at([box.x + box.dx, box.y + box.dy * 0.5, box.z + box.dz * 0.5]);

  const px = cx + ox;
  const py = cy + oy;
  /* Out along the viewing axis, then level. Kept short so the label stays
     inside the drawing's own box at every width. */
  const kx = px + 20;
  const ky = py - 22;
  const ex = kx + 16;

  return (
    <g className="pcb3d-callout">
      <path
        d={`M${px.toFixed(1)} ${py.toFixed(1)}L${kx.toFixed(1)} ${ky.toFixed(1)}L${ex.toFixed(1)} ${ky.toFixed(1)}`}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={px} cy={py} r={2.6} fill="var(--color-accent)" />
      <text
        x={ex + 4}
        y={ky + 3.4}
        fill="var(--color-ink)"
        fontFamily="var(--font-sans)"
        fontSize={9}
        fontWeight={600}
        letterSpacing={0.6}
        style={{ textTransform: "uppercase" }}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Which drawn pieces a bay in the parts list corresponds to.
 *
 * Not one-to-one: memory is two sticks, and the case is the shell itself
 * rather than anything in the `PIECES` array. The list does not know any of
 * that and should not have to.
 */
const PIECES_FOR: Record<string, string[]> = {
  cpu: ["cpu"],
  gpu: ["gpu"],
  mb: ["mb"],
  ram: ["ram-a", "ram-b"],
  ssd: ["ssd"],
  cooling: ["cooling"],
  psu: ["psu"],
  case: [],
};

/** How far a highlighted part pulls out of the case, along the axis it went
    in down. Far enough to read as lifted, not so far it leaves its slot. */
const LIFT = approach("x", 16);

/** The bay a drawn piece belongs to — the reverse of `PIECES_FOR`, so a swap
    reported per bay can find the one or two pieces that have to move. */
const KIND_OF_PIECE: Record<string, string> = Object.fromEntries(
  Object.entries(PIECES_FOR).flatMap(([kind, ids]) => ids.map((id) => [id, kind])),
);

export function AssemblyScene({
  playing,
  onDone,
  compact = false,
  highlight = null,
  highlightLabel,
  swapSeq = {},
  lift = false,
}: {
  playing: boolean;
  onDone?: () => void;
  /** the finished machine, no sequence — shown beside the parts list */
  compact?: boolean;
  /** the bay's name, already translated — drawn on the call-out */
  highlightLabel?: string;
  /**
   * A bay to pull out of the machine — PCB-09's table and the drawing are the
   * same object seen two ways, and this is the thread between them. Reading
   * down the list lifts each part out of the tower in turn, which is an
   * exploded assembly drawing that the customer drives with a cursor rather
   * than a static one they have to decode.
   */
  highlight?: string | null;
  /**
   * How many times each bay has been swapped.
   *
   * A count rather than a flag, because the run has to replay when the same
   * bay is changed twice over. Bumping it re-keys the piece, which remounts
   * the group and starts its eject-and-reseat animation from the top — the one
   * reliable way to restart a CSS animation that is already playing.
   */
  swapSeq?: Record<string, number>;
  /**
   * Whether the highlighted bay should physically pull out of the case.
   *
   * Separate from `highlight` because the two reasons a bay lights up want
   * different things. A cursor on a row is a question — "which one is that" —
   * and pulling the part out answers it. A bay that has just been swapped is a
   * statement, and it is already mid-flight on its own eject-and-reseat run;
   * lifting it as well means it reseats and then immediately pops back out,
   * which reads as the drawing glitching rather than as anything being said.
   */
  lift?: boolean;
}) {
  const reduced = useReducedMotion();
  const lit = highlight ? (PIECES_FOR[highlight] ?? []) : [];
  const shellLit = highlight === "case";

  useEffect(() => {
    if (!playing || !onDone) return;
    /* Reduced motion still gets the scene, just not the three seconds of
       things flying across it — so the hand-off happens almost at once. */
    const id = setTimeout(onDone, reduced ? 240 : ASSEMBLY_MS);
    return () => clearTimeout(id);
  }, [playing, onDone, reduced]);

  const still = compact || reduced;
  const glass = faces(GLASS);

  return (
    <svg
      viewBox={VIEW_BOX}
      className={`pcb3d ${still ? "is-still" : "is-playing"}`}
      data-focus={highlight ? "" : undefined}
      data-lift={highlight && lift ? "" : undefined}
      role="img"
      aria-label="Assemblage de la configuration"
    >
      <defs>
        {/* the only shading in the drawing: a sheen across upward faces */}
        <linearGradient id="pcb3d-sheen" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* the light falls off toward the floor on every vertical face, so
            nothing is a slab of one flat tone */}
        <linearGradient id="pcb3d-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15151a" stopOpacity="0" />
          <stop offset="100%" stopColor="#15151a" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="pcb3d-shadow">
          <stop offset="0%" stopColor="#15151a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#15151a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={-34} cy={104} rx={106} ry={31} fill="url(#pcb3d-shadow)" />

      <ShellBack lit={shellLit} />

      {PIECES.map((piece) => {
        const [tx, ty] = approach(piece.from.axis, piece.from.d);
        const Detail = DETAIL[piece.id];
        const seq = swapSeq[KIND_OF_PIECE[piece.id]] ?? 0;
        return (
          <g
            /* The count is in the key so a swap remounts the group and its
               animation runs again from the start. */
            key={`${piece.id}:${seq}`}
            className="pcb3d-piece"
            data-swap={seq > 0 && still ? "" : undefined}
            data-lit={lit.includes(piece.id) ? "" : undefined}
            style={
              {
                "--tx": `${tx.toFixed(1)}px`,
                "--ty": `${ty.toFixed(1)}px`,
                "--lx": `${LIFT[0].toFixed(1)}px`,
                "--ly": `${LIFT[1].toFixed(1)}px`,
                "--d": `${piece.delay}ms`,
              } as React.CSSProperties
            }
          >
            <Solid box={piece.box} tone={piece.tone} />
            {Detail && <Detail box={piece.box} />}
            {FANS.filter((f) => f.on === piece.id).map((f, i) => (
              <Fan key={i} p={f.at} r={f.r} spin />
            ))}
          </g>
        );
      })}

      <ShellFront lit={shellLit} />

      {/* ── the call-out ──
          A leader line and a pin, which is how an assembly drawing has always
          named a part. Drawn after the pieces so it sits over them, and only
          while something is lifted — a drawing with eight permanent labels is
          a diagram, and this is supposed to answer one question at a time.

          Same treatment as the anatomy plate on the product pages: accent
          hairline, filled pin, small uppercase label. */}
      {highlight && highlightLabel && (
        <Callout id={highlight} label={highlightLabel} lifted={lift} />
      )}

      {/* ── the side panel ──
          Last on, and barely there: a pane that read as a solid surface would
          undo the assembly the moment it landed. The streak is what says there
          is glass rather than a hole. */}
      <g
        className="pcb3d-glass"
        data-lit={shellLit ? "" : undefined}
        style={{ "--d": `${GLASS_DELAY}ms` } as React.CSSProperties}
      >
        {/* Barely tinted. Tempered glass is nearly clear, and at the 0.34 this
            started on it fogged the whole machine — the parts the customer
            just watched go in read as if seen through tracing paper. The pane
            is now carried by its edge and its reflection instead of by a wash:
            a bright streak across the top corner, which is what says there is
            glass rather than a hole. */}
        <path d={glass.side} fill="rgba(255,255,255,0.1)" stroke="rgba(21,21,26,0.3)" strokeWidth={0.9} />
        <path
          d={panelX(GLASS.x + GLASS.dx, GLASS.y + 16, GLASS.z + 20, 104, 24)}
          fill="rgba(255,255,255,0.34)"
          stroke="none"
        />
        <path d={glass.top} fill="rgba(255,255,255,0.66)" stroke="rgba(21,21,26,0.32)" strokeWidth={0.9} />
        <path d={glass.front} fill="rgba(255,255,255,0.18)" stroke="rgba(21,21,26,0.24)" strokeWidth={0.8} />
      </g>
    </svg>
  );
}
