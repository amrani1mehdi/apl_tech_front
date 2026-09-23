"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCart } from "@/components/cart/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Link } from "@/components/i18n/LocaleLink";
import { SplitText } from "@/components/site/Reveal";
import { ChevronRight, Eraser, Layers, SlidersHorizontal, Wand2, X } from "lucide-react";
import { defaultVariantOf, formatDA } from "@/lib/products";
import { withLocale } from "@/lib/i18n";
import { buildId } from "@/lib/build";

import {
  PART_KINDS,
  applyPick,
  partOf,
  partsIn,
  buildTotal,
  buildableCount,
  isComplete,
  lines,
  sameBay,
  setQuantity,
  type Build,
  type PartKind,
} from "@/lib/pcbuilder/parts";
import {
  extrasList,
  extrasTotal,
  reserveFor,
  suggestExtras,
  type ExtraKind,
  type Extras,
} from "@/lib/pcbuilder/extras";
import { buildState, checkBuild, faultyKinds, fill, powerVerdict } from "@/lib/pcbuilder/engine";
import { DEFAULT_GAMES, RESOLUTIONS, estimate, headlineFps } from "@/lib/pcbuilder/fps";
import {
  cheapestPossible,
  emptyBrief,
  generate,
  type Brief,
  type Variant,
} from "@/lib/pcbuilder/generate";
import {
  QUESTIONS,
  heard,
  nextQuestion,
  readMessage,
  say,
  type Message,
  type QuestionKey,
} from "@/lib/pcbuilder/chat";
import {
  BUILD_PARAM,
  EXTRAS_PARAM,
  buildParam,
  copyText,
  extrasParam,
  loadSaved,
  openWhatsApp,
  parseBuildParam,
  parseExtrasParam,
  printSheet,
  recapText,
  saveBuild,
  shareUrl,
} from "@/lib/pcbuilder/share";

import { Conversation } from "./Conversation";
import { ExtrasSection } from "./ExtrasSection";
import { ModeChooser } from "./ModeChooser";
import { AssemblyScene } from "./AssemblyScene";
import { BuildSheet } from "./BuildSheet";
import { InstrumentRail } from "./InstrumentRail";
import { IssuePanel } from "./IssuePanel";
import { CommitBar, VariantSwitch, type ActKey } from "./ActionBar";
import { Blueprint } from "./Blueprint";
import { FpsSection } from "./FpsSection";
import { SwapDrawerHost } from "./SwapDrawer";
import { AiIntro, shouldPlayAiIntro } from "./AiIntro";

/** How long the assistant appears to think before answering.
 *
 *  Not decoration. The local parser is instantaneous, and an instantaneous
 *  answer to "what's your budget" reads as a form validating rather than
 *  someone replying — people stop reading the replies. It is also the slot a
 *  real model call will occupy, so the pacing will not change when the model
 *  arrives. */
const THINKING_MS = 520;

/** Gap between component rows arriving, close enough to the pace the parts
    seated at that the list reads as the same event continuing. */
const ROW_MS = 90;

/** How long a swapped bay stays lit afterwards. Comfortably past the 900ms
    eject-and-reseat, so the part has settled back before the highlight lets
    go and the machine returns to normal. */
const CHANGED_MS = 2200;

/**
 * The verdict, next to the heading.
 *
 * A summary of what the findings panel says in full. Up here because it is the
 * first question a customer has about a machine somebody else specced — does
 * it actually work — and making them scroll to a panel for the answer is
 * making them scroll to find out whether to trust the page.
 */
function StateBadge({
  state,
  label,
  filled,
}: {
  state: "ok" | "warn" | "error";
  label: string;
  /** bays with a part in them, out of eight */
  filled: number;
}) {
  /* Ink for a machine that works. Colour costs nothing to add and everything
     to spend, so it goes on the two states that want a decision and nowhere
     else — see the status tokens in globals.css. */
  const tone = { ok: "text-mute", warn: "text-warn", error: "text-alert" }[state];

  return (
    <span className="flex items-baseline gap-3">
      {/* The count set in the display face rather than in a monospace chip.
          It is the second-largest figure in this header and it behaves like
          one — a fraction, with the denominator stepped back so the eye lands
          on how many are seated rather than on the constant. */}
      <span className="font-display text-[19px] font-bold leading-none tracking-[-0.01em] text-ink">
        {filled}
        <span className="text-faint">/8</span>
      </span>

      {/* A hairline, not a middle dot. The rule is drawing vocabulary and this
          whole module is a drawing; a "·" between two values is the joint that
          turns any two facts into a generated meta string. */}
      <span aria-hidden className="h-3.5 w-px self-center bg-line" />

      <span className={`text-[13px] font-medium ${tone}`}>{label}</span>
    </span>
  );
}

/**
 * Three stages, one page.
 *
 * `chat` owns the whole screen while the brief is being gathered — nothing
 * else is on it, because nothing else is decided yet and a half-empty parts
 * table sitting beside the first question is a promise the page cannot keep.
 * `assembling` is the machine being built. `result` is everything that came
 * out of it — and the conversation does not follow it there. Once a machine
 * exists the controls on the page say everything the chat could: another
 * proposal, cheaper, faster, swap this part. A thread underneath all of that
 * is a second way to ask for the same things, kept alive out of habit.
 */
type Stage = "choose" | "chat" | "assembling" | "result";

/**
 * Which of the two builders is running — PCB-16.
 *
 * Not a second page and not a second component. Both modes produce the same
 * `Build`, are ruled on by the same engine, priced by the same table and
 * bought through the same bar; the whole difference is who fills the eight
 * bays and therefore how the result page should talk. Forking this into two
 * routes would have forked the compatibility engine's consumers with it, and
 * the one thing this module must never have is two screens that disagree
 * about whether a machine assembles.
 *
 * Kept in the URL, not just in state — see the sync effect below. It was state
 * only to begin with, on the argument that the chooser is the honest place for
 * a browser refresh to land. That argument missed the action this site
 * performs more than any other: changing language. `setLocale` navigates to
 * the same path under a new locale segment, which is a fresh mount, so an
 * Arabic customer halfway through a build pressed FR and was handed the
 * chooser again with their machine gone.
 */
type Mode = "ai" | "manual";

/** Where the chosen builder travels. Read on the way in as a deep link the
    footer or a product card can point at, written on the way out so the
    session survives a remount. */
const MODE_PARAM = "mode";
const MODE_VALUE: Record<Mode, string> = { ai: "ia", manual: "manuel" };

export function BuilderClient() {
  const { t, locale, dir } = useLocale();
  const { addItem } = useCart();
  const router = useRouter();
  const params = useSearchParams();
  const reduced = useReducedMotion();

  /* ── what we were opened with ──────────────────────────────────────────
     A product's "Ajouter au PC Builder" arrives with `?part=` (PCB-02); a
     shared configuration arrives with `?build=` (PCB-15). Both are read as
     initial state rather than in an effect, so the first paint is already
     right — an effect would show the empty builder for a frame and then
     visibly correct itself. */

  const pinnedSlug = params.get("part");
  const pinned = pinnedSlug ? partOf(pinnedSlug) : null;
  const sharedBuild = useMemo(() => parseBuildParam(params.get(BUILD_PARAM)), [params]);
  const sharedExtras = useMemo(() => parseExtrasParam(params.get(EXTRAS_PARAM)), [params]);
  const openedShared = Object.keys(sharedBuild).length > 0;

  /* `?mode=` is the skip-the-chooser link. The French spellings are the ones
     that go in the URL because every other route on this site is French —
     `/configurateur`, `/panier`, `/commande` — and a query string in a second
     language is the kind of seam nobody notices until it is everywhere. */
  const modeParam = params.get(MODE_PARAM);
  const wantsAi = modeParam === MODE_VALUE.ai;
  const wantsManual = modeParam === MODE_VALUE.manual;

  /* A shared configuration opens in manual. There is no brief behind a link —
     no budget, no usage, no games — so the assistant's controls on that page
     would be regenerating against an empty brief and proposing something
     unrelated to the machine that was actually shared. Manual is the honest
     framing for "here is a specific build, do what you like with it". */
  const [mode, setMode] = useState<Mode>(
    wantsAi ? "ai" : wantsManual || openedShared ? "manual" : "ai",
  );

  const [stage, setStage] = useState<Stage>(
    openedShared || wantsManual ? "result" : wantsAi ? "chat" : "choose",
  );
  const [brief, setBrief] = useState<Brief>(() => ({
    ...emptyBrief(),
    pinned: pinned ? pinned.product.slug : undefined,
  }));

  const [messages, setMessages] = useState<Message[]>(() => {
    if (openedShared) return [say("pcb.said.proposed")];
    const opening = [say("pcb.greeting")];
    if (pinned) opening.push(say("pcb.said.pinned", { name: pinned.product.name }));
    opening.push(say(QUESTIONS.budget.key, undefined, QUESTIONS.budget.chips));
    return opening;
  });

  const [asked, setAsked] = useState<QuestionKey[]>(["budget"]);
  const [build, setBuild] = useState<Build>(sharedBuild);

  /* ── the setup around the machine — PCB-04 ─────────────────────────────
     Held apart from `build` on purpose. Nothing in here is checked for
     compatibility, draws power, or counts towards the eight bays, and folding
     it into the same record would put a monitor in the power budget and make
     an unfilled mousepad slot read as an incomplete machine. It only exists
     once the machine does — see `extras.ts`. */
  const [extras, setExtras] = useState<Extras>(sharedExtras);
  /** which slots the assistant filled from the scope answer rather than the
      customer choosing, so the rows can admit it */
  const [suggested, setSuggested] = useState<Set<ExtraKind>>(new Set());
  const [games, setGames] = useState<string[]>(DEFAULT_GAMES);
  const [nth, setNth] = useState(0);
  const [pending, setPending] = useState(false);

  /** what the drawer is open on: a bay, and the row in it being replaced —
      null for an empty bay, or for adding beside what is already there */
  const [swap, setSwap] = useState<{ kind: PartKind; replacing: string | null } | null>(null);
  /** the bay the customer is pointing at, lifted out of the drawing */
  const [highlight, setHighlight] = useState<PartKind | null>(null);
  /** how many times each bay has been swapped — drives the eject-and-reseat */
  const [swapSeq, setSwapSeq] = useState<Record<string, number>>({});
  /** the bay that just changed, held long enough to be noticed */
  const [changed, setChanged] = useState<PartKind | null>(null);

  /* ── derived ───────────────────────────────────────────────────────────
     Recomputed every render rather than cached in state. These are cheap — a
     few table lookups over eight slugs — and holding a verdict in state is how
     a build and its compatibility report drift apart, which is the one bug
     this module must never have. */
  /* Three totals, and they are not interchangeable. `total` is the machine —
     what the parts table sums to, what the compatibility engine and the
     generator reason about, and what the assistant quoted in the thread.
     `setupTotal` is everything chosen around it. `orderTotal` is what the
     customer pays, and it is the only one the cart button and the instrument
     band are allowed to show: two competing totals on one page is how a
     customer stops trusting either. */
  const total = buildTotal(build);
  const power = powerVerdict(build);
  const issues = checkBuild(build);
  const state = buildState(issues);
  const faulty = faultyKinds(issues);
  const filled = PART_KINDS.filter((k) => partsIn(build, k).length > 0).length;
  const complete = isComplete(build);
  const fps = headlineFps(build, games);

  /* Zero while the machine is unfinished, not merely hidden. The setup shelf
     shuts itself in that state and says why, and a headline total that went on
     counting a screen the page had stopped showing would be the one number on
     here nobody could reconcile. It comes back with the missing bay — a link
     that lost a delisted part is the case this happens in. */
  const setupTotal = complete ? extrasTotal(extras) : 0;
  const orderTotal = total + setupTotal;

  /** Shorthand — read on nearly every branch of the result page. */
  const manual = mode === "manual";

  /**
   * Bays the customer filled themselves.
   *
   * Not `filled`, because a component pinned from a product card was seated
   * for them on the way in — and counting it made the manual builder's opening
   * screen offer "Tout vider" instead of "Pars d'une base" to precisely the
   * people most likely to want a base: they arrived holding one part and seven
   * empty rows. Nothing has been chosen here yet.
   */
  const chosen = PART_KINDS.filter(
    (kind) =>
      partsIn(build, kind).length > 0 &&
      !(pinned?.spec.kind === kind && sameBay(build, { [kind]: [pinned.product.slug] }, kind)),
  ).length;

  const heaviestGame = useMemo(() => {
    const rows = estimate(build, games);
    if (rows.length === 0) return null;
    return rows.reduce((top, r) => (r.game.gpuLoad > top.game.gpuLoad ? r : top)).game.name;
  }, [build, games]);

  /* ── the parts list arriving ───────────────────────────────────────────
     `revealed` counts rows the sheet may show; bumping `token` replays the
     run. A swap sets `revealed` directly instead, because one part changed and
     re-dealing the other seven would misrepresent that as a new machine. */
  /* Full count wherever the result page is the *first* thing seen. The
     one-row-at-a-time reveal is the tail of the assembly sequence — it says
     "this is still arriving". Nothing arrived on a shared link or on the
     manual builder's opening screen, so dealing eight rows out would be
     animating an event that did not happen. */
  const [revealed, setRevealed] = useState(
    openedShared || wantsManual ? PART_KINDS.length : 0,
  );
  const [token, setToken] = useState(0);

  const [seenToken, setSeenToken] = useState(token);
  if (seenToken !== token) {
    setSeenToken(token);
    setRevealed(reduced ? PART_KINDS.length : 0);
  }

  useEffect(() => {
    if (token === 0 || reduced) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= PART_KINDS.length) clearInterval(id);
    }, ROW_MS);
    return () => clearInterval(id);
  }, [token, reduced]);

  /* The layout renders a footer under every page. While the conversation or
     the assembly owns the viewport there is nothing below them worth scrolling
     to, and a footer poking up under a stage that is exactly one screen tall is
     the thing that makes it read as a tall section rather than as a screen. It
     comes back the moment the result — an ordinary scrolling page — takes over.

     A class on <body> rather than a prop, because the footer is a sibling of
     this page in the layout and there is no prop to pass it. */
  useEffect(() => {
    document.body.classList.toggle("pcb-solo", stage !== "result");
    return () => document.body.classList.remove("pcb-solo");
  }, [stage]);

  /**
   * The URL, kept describing the session — PCB-16.
   *
   * Everything this page holds lived in component state, which was fine until
   * it met the one action that throws component state away. Changing language
   * is a navigation: `setLocale` pushes the same path under a new locale
   * segment, the tree remounts, and every `useState` initialiser runs again
   * against a query string that said nothing about what the customer was
   * doing. Pressing FR halfway through a build returned them to the chooser
   * with the machine gone — on a site whose whole point is being readable in
   * three languages.
   *
   * `setLocale` already carries `location.search` across, so the session only
   * has to be *in* the query for the switch to become lossless. The three
   * things worth carrying are the builder they chose, the machine, and the
   * setup around it; the serialisation is the one `share.ts` already uses for
   * links, so a URL copied from the address bar is a working shared build.
   *
   * `replace` rather than `push`, and this is the load-bearing half: a history
   * entry per swapped part would turn the back button into a walk backwards
   * through the customer's own build, and pressing it once at the end would
   * land them on a machine they had already changed their mind about.
   *
   * The browser's own `history.replaceState`, not `router.replace`. The router
   * treats a new query as a navigation and asks the server for the page again,
   * and French pages reach the server through the proxy's rewrite from the bare
   * path to `/fr/…` — on that route the round trip settled back on the URL the
   * page was opened with, so the address bar never moved. Every swap made on
   * the French builder was then thrown away by the next language switch, and
   * the address bar handed anyone who copied it the machine as it first
   * loaded. Nothing on the server depends on this query — the build is decided
   * in this component — so there was never anything to fetch. The native call
   * writes the URL and nothing else, and Next keeps `useSearchParams` in step
   * with it.
   *
   * Skipped on the chooser, where there is no session yet — the query stays
   * clean until a door has been picked.
   */
  useEffect(() => {
    if (stage === "choose") return;

    const next = new URLSearchParams();
    /* A component pinned from a product card outlives everything else here —
       it is the reason this page was opened. */
    if (pinnedSlug) next.set("part", pinnedSlug);
    next.set(MODE_PARAM, MODE_VALUE[mode]);
    if (PART_KINDS.some((k) => partsIn(build, k).length > 0)) next.set(BUILD_PARAM, buildParam(build));
    if (extrasList(extras).length > 0) next.set(EXTRAS_PARAM, extrasParam(extras));

    const qs = next.toString();
    /* Nothing to say. Without this the effect replaces the URL with the URL on
       every unrelated render — cheap, but it also fights `resetChat`, which
       clears the query deliberately. */
    if (qs === window.location.search.replace(/^\?/, "")) return;

    window.history.replaceState(null, "", `${withLocale("/configurateur", locale)}?${qs}`);
  }, [build, extras, locale, mode, pinnedSlug, stage]);

  /**
   * Feedback for the five actions under the parts table.
   *
   * These had none that anyone would see. Copy and save called `flash`, which
   * renders beside the variant switch up at the heading — a screen and a half
   * above the button that was pressed, so the confirmation appeared somewhere
   * the customer was not looking and was gone before they got there. PDF only
   * spoke when it failed, WhatsApp never spoke at all, and both of those open
   * a tab that a pop-up blocker can swallow without a word.
   *
   * So the answer goes on the button: the pressed pill says what happened for
   * a moment and goes back to its label. `done` carries the key as well as the
   * word, because five pills that all confirm at once would say "something
   * happened" rather than "this happened".
   *
   * Timers are held in a ref and cleared on the way in, so mashing a button —
   * or pressing a second one while the first is still lit — restarts the one
   * confirmation instead of leaving an earlier timeout to blank the new one
   * early. Cleared on unmount too: `setState` from a timer after the result
   * screen has been left is a stray update on a component that is gone.
   */
  const [done, setDone] = useState<ActKey | null>(null);
  const [actNotice, setActNotice] = useState<string | null>(null);
  const [variantDone, setVariantDone] = useState(false);
  const actTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const variantTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      actTimers.current.forEach(clearTimeout);
      if (variantTimer.current) clearTimeout(variantTimer.current);
    },
    [],
  );

  /** The variant control's own confirmation. Fired when the new machine has
      actually landed, not when the button was pressed — there is a deliberate
      beat of thinking time in between, and a tick that appears during it is
      confirming something that has not happened yet. */
  const confirmVariant = useCallback(() => {
    if (variantTimer.current) clearTimeout(variantTimer.current);
    setVariantDone(true);
    variantTimer.current = setTimeout(() => setVariantDone(false), 1900);
  }, []);

  const acted = useCallback((key: ActKey, problem?: string) => {
    actTimers.current.forEach(clearTimeout);
    actTimers.current = [];

    setDone(problem ? null : key);
    setActNotice(problem ?? null);

    actTimers.current.push(
      setTimeout(() => setDone(null), 1900),
      /* A refusal outlives a confirmation: it is asking the customer to go and
         change a browser setting, which is not readable in two seconds. */
      setTimeout(() => setActNotice(null), 6000),
    );
  }, []);

  const push = useCallback((...m: Message[]) => setMessages((prev) => [...prev, ...m]), []);

  /* Held back until the tower has finished assembling, so the assistant's
     verdict types out in the dock while the customer is looking at the machine
     rather than arriving on a screen they cannot see yet. */
  const queued = useRef<Message[]>([]);

  /* ── producing a machine ───────────────────────────────────────────── */

  const verdictFor = useCallback(
    (
      candidateTotal: number,
      forBrief: Brief,
      variant: Variant,
      index: number,
      /** what was held back for the screen and peripherals, if anything */
      setupCost: number,
    ): Message[] => {
      const lead =
        variant === "cheaper"
          ? "pcb.said.cheaper"
          : variant === "faster"
            ? "pcb.said.faster"
            : index > 0
              ? "pcb.said.regenerated"
              : "pcb.said.proposed";

      const out: Message[] = [say(lead)];
      if (forBrief.budget === null) return out;

      const gap = candidateTotal - forBrief.budget;
      const money = { total: formatDA(candidateTotal, locale), gap: formatDA(Math.abs(gap), locale) };

      if (gap > 0) out.push(say("pcb.said.over", money));
      else if (Math.abs(gap) < forBrief.budget * 0.03) out.push(say("pcb.said.exact", money));
      else out.push(say("pcb.said.under", money));

      /* The gap under the budget is not a surplus when the customer asked for
         peripherals — it is the screen and the keyboard, deliberately not
         spent on the tower. Saying so is the difference between a machine that
         came in cheap and one that left room on purpose; the older "you've got
         X left, keep it or add a screen" line would be offering them something
         already waiting further down the page. */
      if (setupCost > 0) {
        out.push(say("pcb.said.setup", { gap: formatDA(setupCost, locale) }));
      } else if (gap < 0 && Math.abs(gap) > forBrief.budget * 0.15) {
        /* Only worth remarking on when the surplus could buy something.
           Telling someone they have 4 000 DA spare is noise. */
        out.push(say("pcb.said.leftover", { gap: formatDA(Math.abs(gap), locale) }));
      }
      return out;
    },
    /* `locale` is a real dependency now that the money strings are written in
       it. Left at `[]` the callback keeps the language it was created under,
       so switching to Arabic mid-conversation would go on quoting totals in
       DA for the rest of the session. */
    [locale],
  );

  const produce = useCallback(
    (forBrief: Brief, variant: Variant, index: number, firstTime: boolean) => {
      /* The setup comes out of the same budget, so it is subtracted before the
         machine is specced rather than after. The generator spends whatever
         ceiling it is handed — `spendLeftovers` exists to use up the rest — so
         handing it the whole budget when the customer asked for a screen
         produces a tower that has quietly eaten the screen.

         On the first machine that is the reserve for whatever scope was asked
         for; afterwards it is simply what the peripherals already on the page
         cost, so "moins cher" re-specs the tower against what is genuinely
         left rather than against a budget already partly spent. */
      /* A machine can reach this page with no brief behind it — a shared link,
         or the tree remounted by a language switch, both of which carry the
         build in the URL and nothing else. With `budget` still null the
         generator ranks on score alone and ignores price entirely, so pressing
         "moins cher" on a 300 000 DA machine could hand back the most
         expensive thing in the catalogue.

         The machine already on screen is the honest stand-in. It is what the
         customer is looking at and what "cheaper" and "faster" are being asked
         relative to, so the order total becomes the ceiling. Only for the
         generator — the verdict messages still say nothing about a budget
         nobody stated. */
      const ceiling = forBrief.budget ?? (orderTotal > 0 ? orderTotal : null);

      const held = firstTime ? reserveFor(forBrief.scope, ceiling) : extrasTotal(extras);

      const forGenerator =
        ceiling === null ? forBrief : { ...forBrief, budget: Math.max(ceiling - held, 0) };

      const candidate = generate(forGenerator, variant, index);

      if (!candidate) {
        push(say("pcb.said.none"));
        return;
      }

      /* Which bays actually moved. "Moins cher" often keeps the case and the
         supply and changes three parts; ejecting all eight would say the whole
         machine was rebuilt, and ejecting none would hide the change
         altogether. Only what differs is serviced. */
      if (!firstTime) {
        const moved = PART_KINDS.filter((k) => !sameBay(build, candidate.build, k));
        if (moved.length > 0) {
          setSwapSeq((s) => {
            const next = { ...s };
            for (const k of moved) next[k] = (next[k] ?? 0) + 1;
            return next;
          });
        }
      }

      setBuild(candidate.build);

      /* The scope question — "l'unité centrale seule, ou j'ajoute l'écran et
         les périphériques ?" — has been asked since the first version of this
         module and nothing has ever read the answer. It is read here, and only
         here: after the machine exists, so the peripherals are chosen against a
         real total and whatever is actually left of the budget.

         First machine only. Pressing "moins cher" afterwards frees up budget,
         but re-suggesting would quietly overwrite a screen the customer picked
         themselves — which is the one thing a suggestion must never do. */
      let setupCost = 0;
      if (firstTime) {
        const left =
          forBrief.budget === null
            ? Number.POSITIVE_INFINITY
            : Math.max(forBrief.budget - candidate.total, 0);
        const opening = suggestExtras(forBrief.scope, left);
        setupCost = extrasTotal(opening);
        setExtras(opening);
        setSuggested(new Set(Object.keys(opening) as ExtraKind[]));
      }

      const verdict = verdictFor(candidate.total, forBrief, variant, index, setupCost);

      if (firstTime) {
        /* The first machine gets the full build sequence. Every one after it
           does not: a customer pressing "moins cher" three times does not want
           to watch a tower go together three times, they want to compare. */
        queued.current = verdict;
        setStage("assembling");
      } else {
        setToken((n) => n + 1);
        push(...verdict);
      }
    },
    [build, extras, orderTotal, push, verdictFor],
  );

  const onAssembled = useCallback(() => {
    setStage("result");
    setToken((n) => n + 1);
    if (queued.current.length > 0) {
      push(...queued.current);
      queued.current = [];
    }
  }, [push]);

  /* ── the conversation loop ─────────────────────────────────────────── */

  const advance = useCallback(
    (nextBrief: Brief, askedSoFar: QuestionKey[], firstTime: boolean) => {
      const question = nextQuestion(nextBrief, askedSoFar);

      if (question) {
        setAsked([...askedSoFar, question]);
        push(say(QUESTIONS[question].key, undefined, QUESTIONS[question].chips));
        return;
      }

      setNth(0);
      produce(nextBrief, "same", 0, firstTime);
    },
    [produce, push],
  );

  /* Tracked so a restart mid-thought cannot land an answer to a question that
     is no longer on screen. */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleSend = useCallback(
    (text: string) => {
      push(heard(text));

      const next = readMessage(text, brief);
      setBrief(next);

      /* Games named in passing steer the FPS panel without the customer ever
         opening it — "je joue à Warzone" should mean the estimate is about
         Warzone by the time they look. */
      if (next.games.length > 0) {
        setGames((prev) => [...next.games, ...prev.filter((g) => !next.games.includes(g))].slice(0, 6));
      }

      setPending(true);
      const firstTime = stage === "chat";
      const id = setTimeout(() => {
        setPending(false);
        advance(next, asked, firstTime);
      }, THINKING_MS);
      timers.current.push(id);
    },
    [advance, asked, brief, push, stage],
  );

  /**
   * Back to an empty conversation, built around one part or around nothing.
   *
   * Shared by the chat's own "Recommencer" and by the hand-off out of the
   * manual builder, because those are the same event with a different anchor:
   * throw away the brief, the machine and the thread, and start asking again.
   * The only thing that survives is the component the assistant has to build
   * around — the URL's pin in the first case, whatever the customer had
   * already chosen for themselves in the second.
   */
  const resetChat = useCallback((anchor: { slug: string; name: string } | undefined) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    queued.current = [];
    setPending(false);
    setMode("ai");
    setStage("chat");
    setBrief({ ...emptyBrief(), pinned: anchor?.slug });
    setBuild({});
    setExtras({});
    setSuggested(new Set());
    setRevealed(0);
    setToken(0);
    setNth(0);
    setAsked(["budget"]);
    setGames(DEFAULT_GAMES);
    setMessages([
      say("pcb.greeting"),
      ...(anchor ? [say("pcb.said.pinned", { name: anchor.name })] : []),
      say(QUESTIONS.budget.key, undefined, QUESTIONS.budget.chips),
    ]);
    /* The URL used to be cleared by hand here, to stop a shared `?build=`
       reinstating itself. The sync effect above does it now and does it
       better: emptying `build` drops the parameter on the next render, and
       `?part=` survives — which the hand-written clear took with it, quietly
       costing a restart the very component it was supposed to build around. */
  }, []);

  const handleRestart = useCallback(
    () =>
      resetChat(
        pinned ? { slug: pinned.product.slug, name: pinned.product.name } : undefined,
      ),
    [pinned, resetChat],
  );

  /* ── the two doors, and the corridor between them — PCB-16 ─────────── */

  /** The chat stage — what the builder has always opened on. */
  const openChat = useCallback(() => {
    setMode("ai");
    setStage("chat");
  }, []);

  /** Where the one-time welcome grows from, while it is on screen. */
  const [intro, setIntro] = useState<{ x: number; y: number } | null>(null);
  const endIntro = useCallback(() => setIntro(null), []);

  /**
   * The chooser's left card.
   *
   * Plays the welcome, which puts the chat stage underneath itself just before
   * it lifts away — on every press for now, or only the first in a browser once
   * `ONCE_PER_BROWSER` in `AiIntro` is switched back on. Someone who has asked
   * for less motion gets the chat directly either way.
   */
  const chooseAi = useCallback(
    (origin?: { x: number; y: number }) => {
      if (!reduced && shouldPlayAiIntro()) {
        setIntro(origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
        return;
      }
      openChat();
    },
    [openChat, reduced],
  );

  /**
   * The chooser's right card — eight empty bays.
   *
   * A component arrived with from a product card is seated on the way in,
   * which is the whole promise of that button: they pressed "Ajouter au PC
   * Builder" on a specific card, and the builder they land on already contains
   * it. The other seven are theirs to fill.
   */
  const chooseManual = useCallback(() => {
    setMode("manual");
    setStage("result");
    setRevealed(PART_KINDS.length);
    if (pinned) setBuild({ [pinned.spec.kind]: [pinned.product.slug] });
  }, [pinned]);

  /** Taking the assistant's proposal into your own hands. One flag — the
      machine, its verdict, the frame rates and anything already chosen around
      it all stay exactly where they are; only the controls change. */
  const takeOver = useCallback(() => setMode("manual"), []);

  /**
   * Handing a half-built machine back to the assistant.
   *
   * The dearest part already chosen becomes the pin. That is the component the
   * customer was most deliberate about — nobody agonises over the case and
   * then shrugs at the graphics card — so it is the one the assistant should
   * build around rather than throw away. Everything else goes, because the
   * assistant is about to propose a whole machine and keeping half of a
   * different one would produce a build nobody chose.
   */
  const handToAi = useCallback(() => {
    const anchor = PART_KINDS.flatMap((kind) => partsIn(build, kind))
      .reduce<{ slug: string; name: string; price: number } | undefined>(
        (top, p) =>
          top && top.price >= p.product.price
            ? top
            : { slug: p.product.slug, name: p.product.name, price: p.product.price },
        undefined,
      );

    resetChat(anchor);
  }, [build, resetChat]);

  /**
   * A complete, compatible, cheapest-possible machine to edit rather than a
   * blank page.
   *
   * Eight empty rows is the right default — it is what a parts picker is — but
   * it is also a cold start, and a customer who knows they want to change two
   * things should not have to choose the other six first. `cheapestPossible`
   * is the generator run with no ceiling at all, so what lands is the floor of
   * the catalogue: nothing here is a recommendation, it is a starting point
   * that happens to assemble.
   */
  const startFromBase = useCallback(() => {
    const base = cheapestPossible({ ...emptyBrief(), pinned: pinned?.product.slug });
    if (!base) return;

    /* Which bays moved, so the drawing services those and only those — the
       same courtesy a regenerate gets. From empty that is all eight. */
    const moved = PART_KINDS.filter((k) => !sameBay(build, base.build, k));
    setSwapSeq((s) => {
      const next = { ...s };
      for (const k of moved) next[k] = (next[k] ?? 0) + 1;
      return next;
    });

    setBuild(base.build);
    setRevealed(PART_KINDS.length);
  }, [build, pinned]);

  /** Back to eight empty bays, without leaving the manual builder. */
  const clearBuild = useCallback(() => {
    setBuild(pinned ? { [pinned.spec.kind]: [pinned.product.slug] } : {});
    setExtras({});
    setSuggested(new Set());
    setRevealed(PART_KINDS.length);
  }, [pinned]);

  const handleVariant = useCallback(
    (variant: Variant) => {
      const index = variant === "same" ? nth + 1 : 0;
      setNth(index);
      setPending(true);
      const id = setTimeout(() => {
        setPending(false);
        produce(brief, variant, index, false);
        confirmVariant();
      }, THINKING_MS);
      timers.current.push(id);
    },
    [brief, confirmVariant, nth, produce],
  );

  const openSwap = useCallback(
    (kind: PartKind, replacing: string | null) => setSwap({ kind, replacing }),
    [],
  );

  const handlePick = useCallback(
    (slug: string) => {
      if (!swap) return;
      const { kind, replacing } = swap;
      /* A second kit or a second drive, rather than a bay filled or a part
         replaced — the thread says which, because "Mémoire remplacé" after
         adding a kit beside the first would describe something that did not
         happen. */
      const adding = replacing === null && partsIn(build, kind).length > 0;

      setBuild((prev) => applyPick(prev, kind, slug, replacing));
      /* Full count, so the other seven cards do not re-deal themselves — one
         part changed, and replaying the whole arrival would say otherwise. */
      setRevealed(PART_KINDS.length);

      /* Bumping the count re-keys that piece in the drawing, which restarts
         its eject-and-reseat run even if the same bay was just swapped. */
      setSwapSeq((s) => ({ ...s, [kind]: (s[kind] ?? 0) + 1 }));

      /* And hold the bay lit afterwards. The drawer covers the machine while
         it is open, so without this the change happens entirely behind the
         thing that was hiding it and the customer returns to a machine that
         looks identical. */
      setChanged(kind);
      timers.current.push(setTimeout(() => setChanged(null), CHANGED_MS));

      push(say(adding ? "pcb.said.added" : "pcb.said.swapped", { part: t(`part.${kind}`) }));
      setSwap(null);
    },
    [build, push, swap, t],
  );

  /**
   * A second kit of the same memory, a third of the same drive — or one fewer.
   *
   * No eject-and-reseat in the drawing and no lit card afterwards, unlike a
   * swap. The stepper is pressed where the customer is already looking, and
   * the figure and the price change under their finger; replaying a 900 ms
   * service animation for every tap would make a stepper feel like a form
   * submitting.
   */
  const handleQuantity = useCallback((kind: PartKind, slug: string, qty: number) => {
    setBuild((prev) => setQuantity(prev, kind, slug, qty));
  }, []);

  /** A peripheral chosen, changed, or dropped. `null` empties the slot.
   *
   *  The slot also stops being marked as suggested the moment it is touched:
   *  once the customer has made the choice themselves, a badge saying the
   *  assistant picked it is simply false. */
  const handleExtra = useCallback((kind: ExtraKind, slug: string | null) => {
    setExtras((prev) => {
      const next = { ...prev };
      if (slug) next[kind] = slug;
      else delete next[kind];
      return next;
    });

    setSuggested((prev) => {
      if (!prev.has(kind)) return prev;
      const next = new Set(prev);
      next.delete(kind);
      return next;
    });
  }, []);

  /* ── the exits ─────────────────────────────────────────────────────── */

  const recap = useCallback(
    () =>
      recapText(build, extras, orderTotal, power.draw, power.recommended, {
        title: t("pcb.sheet.heading"),
        partLabel: (kind) => t(`part.${kind}`),
        extraLabel: (kind) => t(`extra.${kind}`),
        setup: t("pcb.extras.sheet"),
        total: t("pcb.m.total"),
        power: t("pcb.m.draw"),
        psu: t("pcb.m.psu"),
        /* Bound to the locale, not passed bare. `recapText` calls this for
           every line of the WhatsApp message and the clipboard copy, and the
           bare reference takes the default — so an Arabic customer sending
           their build to a friend was sending it priced in DA. */
        money: (n: number) => formatDA(n, locale),
      }),
    [build, extras, locale, orderTotal, power.draw, power.recommended, t],
  );

  const handlePdf = useCallback(() => {
    /* A row per product, quantity in the name and priced for all of them — so
       the column still adds up to the total at the bottom of the sheet. */
    const rows = PART_KINDS.flatMap((kind) =>
      lines(build, kind).map(({ part, qty }) => ({
        label: t(`part.${kind}`),
        name: qty > 1 ? `${qty} × ${part.product.name}` : part.product.name,
        price: formatDA(part.product.price * qty, locale),
        stock: part.product.stock ? t("c.inStock") : t("c.outOfStock"),
      })),
    );

    /* Peripherals get their own table on the sheet rather than eight more
       rows in the machine's. Whoever is handed this is checking two different
       things — does the tower add up, and is the setup around it what was
       agreed — and one flat list of thirteen lines answers neither cleanly. */
    const extraRows = extrasList(extras).map(({ kind, product }) => ({
      label: t(`extra.${kind}`),
      name: product.name,
      price: formatDA(product.price, locale),
      stock: product.stock ? t("c.inStock") : t("c.outOfStock"),
    }));

    const fpsRows = estimate(build, games);

    const ok = printSheet({
      heading: t("pcb.sheet.heading"),
      subheading: new Date().toLocaleDateString(
        locale === "ar" ? "ar-DZ" : locale === "en" ? "en-GB" : "fr-DZ",
      ),
      rows,
      columns: {
        part: t("pcb.sheet.part"),
        product: t("pcb.sheet.product"),
        price: t("pcb.sheet.price"),
        stock: t("pcb.sheet.stock"),
      },
      extras: extraRows.length > 0 ? { heading: t("pcb.extras.sheet"), rows: extraRows } : undefined,
      totals: [
        { label: t("pcb.m.draw"), value: `${power.draw} W` },
        { label: t("pcb.m.psu"), value: `${power.recommended} W` },
        { label: t("pcb.m.total"), value: formatDA(orderTotal, locale) },
      ],
      fps:
        fpsRows.length > 0
          ? {
              heading: t("pcb.fps.title"),
              columns: RESOLUTIONS.map((r) => r.label),
              rows: fpsRows.map((row) => ({
                game: `${row.game.name} — ${t(`pcb.preset.${row.cells[0].preset}`)}`,
                cells: row.cells.map((c) => `${c.fps} fps`),
              })),
            }
          : undefined,
      footer: t("pcb.sheet.footer"),
      dir,
      lang: locale,
    });

    acted("pdf", ok ? undefined : t("pcb.act.popupBlocked"));
  }, [acted, build, dir, extras, games, locale, orderTotal, power.draw, power.recommended, t]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(recap());
    acted("copy", ok ? undefined : t("pcb.act.copyFailed"));
  }, [acted, recap, t]);

  const handleShare = useCallback(async () => {
    const url = shareUrl(build, extras, window.location.origin, withLocale("/configurateur", locale));
    const ok = await copyText(url);
    acted("share", ok ? undefined : t("pcb.act.copyFailed"));
  }, [acted, build, extras, locale, t]);

  const handleWhatsApp = useCallback(() => {
    const ok = openWhatsApp(recap());
    acted("whatsapp", ok ? undefined : t("pcb.act.popupBlocked"));
  }, [acted, recap, t]);

  const handleSave = useCallback(() => {
    saveBuild({
      id: buildId(),
      name: fill(t("pcb.saved.name"), { n: loadSaved().length + 1 }),
      build,
      extras,
      total: orderTotal,
      at: Date.now(),
    });
    acted("save");
  }, [acted, build, extras, orderTotal, t]);

  /**
   * The machine as one line, and every peripheral as itself.
   *
   * The configuration collapses into a single cart line because that is what
   * it is: eight parts the shop assembles, tests and warranties together, and
   * a cart that let someone remove the power supply from an assembled build
   * would be offering something the shop cannot ship.
   *
   * The setup around it does not collapse. Those are ordinary products, picked
   * off ordinary shelves, and in the cart they behave like it — removable one
   * at a time, quantity adjustable, priced and labelled exactly as they would
   * be had the customer added them from their own product page. Folding them
   * into the build line would mean a customer who changed their mind about a
   * chair had to come back here and rebuild a computer to drop it.
   *
   * Only the build flies from the button; the peripherals are added silently
   * behind it. Six images racing to the same corner at once reads as a glitch,
   * and the drawer that opens on landing lists all of them anyway.
   */
  const handleAddToCart = useCallback(
    (origin: HTMLElement | null) => {
      const cpu = partsIn(build, "cpu")[0]?.product.name ?? "";
      const gpu = partsIn(build, "gpu")[0]?.product.name ?? "";
      addItem(
        {
          slug: buildId(),
          name: `${t("pcb.cartLine")} — ${cpu} · ${gpu}`,
          image: "/products/ai-builder.jpg",
          price: total,
          /* Back to the builder with this exact machine in it, rather than to
             a product page for a slug no catalogue will ever contain. The
             query is the one `share.ts` writes for links, so the line reopens
             the configuration it represents — which is the only page that can
             explain a "Configuration sur-mesure" to someone reviewing their
             basket a day later. */
          href: `/configurateur?${BUILD_PARAM}=${encodeURIComponent(buildParam(build))}`,
        },
        1,
        origin,
      );

      for (const { product } of extrasList(extras)) {
        addItem(
          {
            slug: product.slug,
            name: product.name,
            image: product.image,
            price: product.price,
            /* Sold in more than one finish and the builder never asked which —
               so it goes in on the same opening variant the product page would
               have selected, rather than as a line with no finish on it that
               whoever packs the box has to guess at. */
            variant: defaultVariantOf(product),
          },
          1,
        );
      }
    },
    [addItem, build, extras, t, total],
  );

  /**
   * The way out of the takeover.
   *
   * `back()` alone strands anyone who opened the builder directly — a shared
   * configuration, a bookmark, a link from WhatsApp — on a history entry that
   * does not exist, and the button appears to do nothing. A fresh tab has a
   * history length of one, so that is the case to fall back on, and the shop
   * front is where someone who arrived cold should land.
   */
  const leave = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(withLocale("/", locale));
  }, [locale, router]);

  /* ── stages ────────────────────────────────────────────────────────── */

  const crumb = (
    <nav className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase text-faint">
      <Link href="/" className="transition-colors hover:text-ink">
        APL TECH
      </Link>
      <ChevronRight className="h-3 w-3 rtl:rotate-180" />
      <span className="text-mute">{t("pcb.crumb")}</span>
    </nav>
  );

  /* The trail and the door, shared by every full-screen stage. The site nav is
     hidden while one of these owns the screen, so the builder has to provide
     the way out itself — without one a takeover is a trap. Extracted when the
     chooser became a third stage needing exactly the same two things. */
  const takeoverChrome = (
    <div className="flex shrink-0 items-start justify-between gap-4">
      {crumb}
      <button
        onClick={leave}
        aria-label={t("pcb.chat.exit")}
        className="-mt-1.5 flex shrink-0 items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-[12px] font-medium text-mute transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("pcb.chat.exit")}</span>
      </button>
    </div>
  );

  /**
   * The conversation and the build, under one roof.
   *
   * Both are full-screen takeovers on the same blueprint, and they used to be
   * two separate returns — which meant the hand-off between them was a hard
   * cut at the single most important moment on the page. One tree instead, so
   * `AnimatePresence` can cross them, and so the backdrop *persists* across
   * the change rather than being torn down and rebuilt.
   *
   * That persistence is the whole trick. The drawing board does not move; only
   * what is lying on it does. The sheet with the conversation is lifted off,
   * and the machine is set down in its place — which is the same room, a beat
   * later, rather than a different page.
   */
  if (stage !== "result") {
    return (
      <div className="relative flex h-[100svh] w-full flex-col">
        <Blueprint />

        {intro && <AiIntro origin={intro} onReveal={openChat} onDone={endIntro} />}

        <AnimatePresence mode="wait">
          {stage === "choose" ? (
            /* No sheet under this one, unlike the conversation. The blueprint
               is masked to nothing through the middle of the page — the whole
               composition lives in the two margins — and the chooser is a
               display headline, one line of lead and two solid cards, none of
               which needs rescuing from a grid that is not there. A sheet here
               would only hide the drawing the screen is meant to introduce. */
            <motion.div
              key="choose"
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.55, 0, 0.85, 0.3] }}
              className="relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col overflow-y-auto px-5 pb-6 pt-6 sm:px-8 sm:pt-8 lg:px-12"
            >
              {takeoverChrome}
              <ModeChooser
                pinnedName={pinned?.product.name}
                onPickAi={chooseAi}
                onPickManual={chooseManual}
              />
            </motion.div>
          ) : stage === "chat" ? (
            <motion.div
              key="chat"
              /* No `initial` — the stage is already on screen when the page
                 loads, and fading it in would delay the headline behind an
                 animation nobody asked for. It only needs to know how to
                 leave. */
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -28, scale: 0.975 }}
              transition={{ duration: 0.34, ease: [0.55, 0, 0.85, 0.3] }}
              className="relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col overflow-hidden px-5 pb-6 pt-6 sm:px-8 sm:pt-8 lg:px-12"
            >
          {takeoverChrome}

          {/* ── the sheet ──
              Everything readable sits on a solid surface. A blueprint is a
              lovely thing to look at and a terrible thing to read 17px body
              copy on: the grid crosses every line of text and the eye has to
              separate the two before it can start on the words.

              So the drawing stays the room and this is the page laid on it —
              which is what a technical drawing gets annotated on anyway. Not
              full width, so the tower running off the end corner is still
              visible beside it rather than buried. */}
          <div className="mx-auto mt-5 flex min-h-0 w-full flex-1 flex-col rounded-3xl border border-line bg-white/95 p-5 shadow-[0_1px_3px_rgba(21,21,26,0.05)] backdrop-blur-sm sm:p-8 lg:max-w-[52rem]">
            <div className="shrink-0">
              {/* The site's own reveals, not new ones. The claim resolves out
                  of noise and the headline lifts word by word — the same
                  entrance the home page gives its build section, so arriving
                  here reads as the same company rather than a new template. */}
              {/* See ModeChooser: the pill above this headline is gone and its
                  fact moved into the sentence below. */}
              <SplitText
                as="h1"
                text={t("pcb.title")}
                delay={0.08}
                className="mt-4 block max-w-[18ch] font-display text-[clamp(1.8rem,4.2vw,2.9rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink"
              />

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-mute"
              >
                {fill(t("pcb.subtitle"), { n: buildableCount() })}
              </motion.p>
            </div>

            {/* `min-h-0` is what lets the thread scroll instead of growing: a
                flex child's default minimum is its content, so without it the
                conversation stretches the column past the viewport and takes
                the input down with it. */}
            <div className="mt-6 flex min-h-0 flex-1 flex-col">
              <Conversation
                messages={messages}
                pending={pending}
                full
                onSend={handleSend}
                onRestart={handleRestart}
              />
            </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="assembling"
              /* Arrives small and settles, which reads as being set down on
                 the board rather than cut to. The delay is a beat of empty
                 blueprint after the sheet has gone — without it the two moves
                 overlap and the hand-off is mush. */
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-1 flex-col items-center justify-center px-5"
            >
              <div className="w-full max-w-[27rem]">
                <AssemblyScene playing onDone={onAssembled} />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.45 }}
                className="mt-8 flex items-center gap-2.5 text-[13.5px] text-mute"
              >
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                      className="h-1.5 w-1.5 rounded-full bg-accent"
                    />
                  ))}
                </span>
                {t("pcb.assembling")}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      {/* The same drawing board the conversation and the build happened on.
          Fixed, so it stays put while the parts table scrolls over it — the
          board on the desk does not travel with the paper — and dimmer,
          because this page is dense with content that has to win. */}
      <Blueprint variant="page" />

      {/* 1320 and the same gutters as every other section — PageHeader, the
          home build card, the catalogue all sit on this measure, and a builder
          an inch narrower than the page before it reads as a different
          template. */}
      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-5 pb-16 pt-24 lg:px-8 lg:pt-28">
      {crumb}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="font-display text-[clamp(1.8rem,3.8vw,2.6rem)] font-bold leading-[1.04] tracking-[-0.02em] text-ink">
          {/* "La configuration" is the assistant presenting a result. On a
              page somebody is filling in themselves it would be announcing a
              machine that does not exist yet. */}
          {t(manual ? "pcb.build.titleManual" : "pcb.build.title")}
        </h1>
        <StateBadge state={state} label={t(`pcb.state.${state}`)} filled={filled} />
      </div>

      {/* The one control that changes depending on who built this.
 *
 *    The assistant's page asks for a different machine, and that belongs with
 *    the heading: it acts on the whole result, and pressing one changes every
 *    figure on the page.
 *
 *    The manual page must not offer it. "Moins cher" is a request to the
 *    generator for a whole new build, and on a machine somebody assembled part
 *    by part it would silently discard every decision they made — the single
 *    most destructive button on the site, sitting under the heading, unlabelled
 *    as destructive. What that page needs instead is a way to stop staring at
 *    eight empty rows, and a way to empty them again. */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {manual ? (
          <>
            {chosen === 0 ? (
              <button
                onClick={startFromBase}
                title={t("pcb.build.baseHint")}
                className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Layers className="h-3.5 w-3.5 text-accent" />
                {t("pcb.build.base")}
              </button>
            ) : (
              <button
                onClick={clearBuild}
                className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[12.5px] font-medium text-mute transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Eraser className="h-3.5 w-3.5" />
                {t("pcb.build.clear")}
              </button>
            )}

            {/* The corridor back to the assistant. Quiet, because it is an
                offer rather than the job: somebody on this page chose to do it
                themselves. */}
            <button
              onClick={handToAi}
              className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-2.5 text-[12.5px] font-medium text-accent transition-colors hover:border-accent/60 hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {t("pcb.build.handToAi")}
            </button>
          </>
        ) : (
          <>
            <VariantSwitch disabled={!complete} done={variantDone} onVariant={handleVariant} />
            <button
              onClick={takeOver}
              className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[12.5px] font-medium text-mute transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("pcb.build.takeOver")}
            </button>
          </>
        )}
      </div>

      {/* Eight empty rows need a sentence telling you they are yours to fill.
          Once anything is in the machine the parts speak for themselves and
          this would be instructions for a task already under way. */}
      {manual && chosen === 0 && (
        <p className="mt-4 max-w-[62ch] text-[13.5px] leading-relaxed text-mute">
          {t("pcb.build.emptyLead")}
        </p>
      )}

      {/* The answer, at full width and at the top. They spent four questions
          and a build sequence getting here; finding the total underneath a
          parts table, set in the same size as a line item, is the screen
          failing to say what it worked out. */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-7"
      >
        <InstrumentRail
          total={orderTotal}
          extras={setupTotal}
          budget={brief.budget}
          power={power}
          fps={fps}
          fpsGame={heaviestGame}
        />
      </motion.div>

      {/* A narrow rail and a wide column, not two halves.

          The drawing is portrait — 201×278 — so it renders about 1.4× as tall
          as whatever column it is given. Split down the middle it came out
          around 850px tall: taller than the viewport, which quietly cost the
          page both of the things the split was for. A sticky column taller
          than the screen does not stick, so the drawing scrolled away exactly
          when the parts being hovered needed it; and the tower out-weighed the
          table, which is the part actually being read.

          Sized in rem rather than as a fraction because the constraint is the
          drawing's own height, not the page's width — a rail that grew with the
          viewport would bring the same problem back on a wide screen. What the
          table gains is real: at 1320 it goes from ~615px to ~870px, which is
          the difference between component names truncating and not. */}
      {/* `grid-cols-[minmax(0,1fr)]` on the base column is not decoration — it
          is the fix for a phone-width blow-out that had been shipping.

          A grid item's automatic minimum size is its min-content size, and the
          assembly drawing is an `<svg width="100%">` whose min-content
          contribution is around 478px. Above `lg` that never showed, because
          both columns are already declared — one fixed at 21rem, the other
          explicitly `minmax(0,…)`. Below `lg` the single implicit column is
          sized `auto`, so it took the drawing's 478px and grew to 513 inside a
          339px container: 154px of horizontal overflow on every phone.

          In French it hid behind `body { overflow-x: hidden }`, clipped off
          the right edge where nobody looks. In Arabic the same overflow runs
          the other way, so the entire page sat shifted with the header cut in
          half — which is how it was finally noticed. One declaration fixes all
          three languages. */}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[23rem_minmax(0,1fr)]">
        {/* ── the machine that was just built ──
            Sticky, so it stays alongside whichever part is being read — which
            only works now that the rail is shorter than the screen. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4 lg:sticky lg:top-24"
        >
          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            {/* Pointing at a row wins over the after-swap glow: once the
                customer is moving a cursor they are asking about something
                specific, and a hold-over from a change they already saw would
                be answering a question they stopped asking. */}
            <AssemblyScene
              playing={false}
              compact
              highlight={highlight ?? changed}
              highlightLabel={
                highlight ?? changed ? t(`part.${(highlight ?? changed) as PartKind}`) : undefined
              }
              swapSeq={swapSeq}
              lift={highlight !== null}
            />
            <p className="mt-2 text-center text-[11.5px] text-faint">{t("pcb.build.hint")}</p>
          </div>
          <IssuePanel issues={issues} state={state} />
        </motion.div>

        {/* ── its parts ──
            Cards in a grid, each its own surface, so there is no outer card
            around them any more — a white box holding white boxes. */}
        <div className="space-y-4">
          <BuildSheet
            build={build}
            revealed={revealed}
            faulty={faulty}
            pinnedSlug={pinned ? pinned.product.slug : null}
            onSwap={openSwap}
            onQuantity={handleQuantity}
            onHighlight={setHighlight}
            changed={changed}
          />

          {/* ── and what goes around it — PCB-04 ──
              Under the parts and above the cart, which is the order the
              decision is actually made in: the machine is settled, then the
              screen and the peripherals are chosen against what it cost and
              what is left of the budget, then the whole thing is bought. Put
              below the cart button it would be offering to sell someone
              something after handing them the bill; put above the parts table
              it would be selling a screen for a computer nobody has specced
              yet. The shelf stays shut until all eight bays are full and says
              why — that rule lives in `extras.ts` and is the point of it. */}
          <ExtrasSection
            extras={extras}
            suggested={suggested}
            locked={!complete}
            onPick={handleExtra}
          />

          {/* Buying sits directly under what is being bought. Read the parts,
              then commit — a cart button that is not adjacent to the list of
              what it adds is asking for trust it has not earned yet. */}
          <CommitBar
            disabled={!complete}
            total={formatDA(orderTotal, locale)}
            done={done}
            notice={actNotice}
            onPdf={handlePdf}
            onCopy={handleCopy}
            onWhatsApp={handleWhatsApp}
            onShare={handleShare}
            onSave={handleSave}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>

      {/* The answer customers actually arrive with — "will it run the game I
          play". On the page, not behind a button: making the one figure they
          came for the one thing they have to go looking for is the screen
          hiding its own conclusion.
 *
 *        Both builders, and the reason is worth writing down. This was briefly
 *        the assistant's page only, because the table was *broken* on the
 *        manual one — `FpsSection` attached its intersection-observer ref to
 *        only one of its two branches, and the manual builder mounts on the
 *        other, so the estimate never resolved and sat on skeleton rows
 *        forever. That was a bug, not a reason: the model reads the processor
 *        and the graphics card out of the build, and a build is a build
 *        whoever chose it. Somebody who picked their own card has arguably the
 *        most use for the answer. */}
      <div className="mt-10">
        <FpsSection build={build} games={games} />
      </div>

        <SwapDrawerHost
          open={swap !== null}
          kind={swap?.kind ?? "cpu"}
          replacing={swap?.replacing ?? null}
          build={build}
          onPick={handlePick}
          onClose={() => setSwap(null)}
        />
      </div>
    </>
  );
}
