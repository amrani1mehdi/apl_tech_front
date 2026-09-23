/**
 * The conversation — PCB-01, PCB-03, PCB-04.
 *
 * ─── This is the file the AI replaces ───────────────────────────────────────
 *
 * Everything here does one job: turn what a customer typed into a `Brief`, and
 * decide what still needs asking. Today that happens with keyword matching and
 * a four-question state machine. When the model arrives it takes over exactly
 * this — `readMessage()` becomes a call, `nextQuestion()` becomes the model
 * deciding what it still needs — and nothing downstream changes, because
 * downstream only ever sees a `Brief`.
 *
 * That boundary is the reason the module can be built and sold before the
 * model exists. It also means the model can never propose a machine that does
 * not fit together, invent a price, or offer a part the shop does not stock:
 * it does not get to choose parts at all. It reads intent. `generate.ts`
 * chooses, `engine.ts` rules.
 *
 * The local parser is not a placeholder in the throwaway sense — it stays as
 * the offline path. A customer on a bad connection, or a model outage during a
 * sale, should still get a machine rather than a spinner.
 */

import { GAMES } from "./fps";
import { emptyBrief, type Brief, type BrandPref, type Scope, type Usage } from "./generate";

/* ── reading what they typed ─────────────────────────────────────────────── */

/** Arabic-Indic digits, so a budget typed on an Arabic keyboard is still a
    number. The site ships an Arabic locale; the parser has to meet it. */
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Extended Arabic-Indic — the other digit set an Arabic layout can emit.
    Which of the two a customer gets depends on their keyboard, not on any
    choice they made, so reading one and not the other means the budget
    question silently never gets answered for half of them. */
const EXT_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * One spelling per word.
 *
 * Arabic writes several letters that are, for matching purposes, the same
 * letter. أ إ آ ٱ are all alef and which one arrives depends on the
 * customer's keyboard and habits rather than on meaning — "ألعاب" and
 * "العاب" are one word, and the table only had one of them. The same
 * goes for ة against ه at the end of a word and ى against ي. Harakat are
 * optional vowel marks that change nothing here, and tatweel is a purely
 * typographic stretch.
 *
 * The mark range runs to U+065F rather than stopping at the harakat, because
 * `normalize("NFD")` upstream decomposes أ into alef plus U+0654 — so half
 * the alef variants arrive as a base letter and a combining hamza that the
 * Latin-accent strip (U+0300–U+036F) does not cover.
 *
 * `hit()` folds the keyword tables through this too, so both sides of every
 * comparison are always in the same shape and the tables can go on being
 * written the natural way.
 */
const foldArabic = (s: string): string =>
  s
    /* Harakat, the hamza marks NFD leaves behind, and the dagger alef. Kept
       as escapes rather than literals: every one of them is a combining mark,
       so written out they would sit invisibly on the bracket beside them and
       the class would read as empty. */
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "") // tatweel — a typographic stretch, never meaning
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");

const normalise = (raw: string): string =>
  foldArabic(
    raw
      .toLowerCase()
      .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String(EXT_DIGITS.indexOf(d)))
      /* strip accents so "créer" matches "creer" and a keyboard without accents
         is not a second-class way to talk to the builder */
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();

/**
 * A budget, in dinars, from however the customer said it.
 *
 * The interesting case is local rather than technical. Prices in Algeria are
 * quoted conversationally in *millions of centimes* — "trente millions" is
 * 300 000 DA, not thirty million dinars. A parser that takes that literally
 * reads a 300 000 DA budget as 30 000 000 and proposes the most expensive
 * machine in the shop, which is both wrong and insulting. So "millions" and
 * "malyoun" convert at 10 000 DA each, and the figure is sanity-checked
 * against what a computer can actually cost before it is accepted.
 *
 * The same sentence in Arabic is "٣٠ مليون", and none of the scale words
 * were readable: "مليون" is not "millions", so the centimes branch missed,
 * the plain branch then read a bare 30 and threw it out for being below a
 * sane floor, and the function returned null. Budget is the one question
 * PCB-03 never skips — so an Arabic customer answering it correctly got asked
 * it again, forever. That is the whole of "the chat does not work in Arabic".
 *
 * Returns null rather than guessing when nothing looks like a budget — the
 * assistant then asks, which PCB-03 requires it to do anyway.
 */
export function readBudget(raw: string): number | null {
  const text = normalise(raw);

  /* "30 millions", "30 melyoun", "٣٠ مليون" — centimes, the spoken form */
  const centimes = text.match(
    /(\d[\d\s.,]*)\s*(millions?|melyoun|malyoun|mlioun|مليون|ملايين|مليونين)/,
  );
  if (centimes) {
    const n = Number(centimes[1].replace(/[\s.,]/g, ""));
    if (n > 0 && n <= 500) return n * 10_000;
  }

  /* "300k", "300 k", "٣٠٠ ألف". The Latin "k" cannot take \\b for its right
     edge here: \\b is defined against ASCII word characters, so it reports a
     boundary between "k" and any Arabic letter — "30k دج" would pass, and so
     would "30kg". A negated Unicode class is the same test done properly. */
  const kilo = text.match(/(\d[\d\s.,]*)\s*(k(?![\p{L}\p{N}])|الف|الاف)/u);
  if (kilo) {
    const n = Number(kilo[1].replace(/[\s.,]/g, ""));
    if (n >= 30 && n <= 5000) return n * 1000;
  }

  /* a plain figure — "300000", "300 000", "300.000 da", "300 000 دج" */
  const plain = text.match(/(\d[\d\s.,]{2,})/);
  if (plain) {
    const n = Number(plain[1].replace(/[\s.,]/g, ""));
    if (n >= 50_000 && n <= 5_000_000) return n;
  }

  return null;
}

/** Keyword tables. French first — it is the shop's language — then English,
    then the Arabic terms customers actually type rather than formal ones.

    Written in whatever spelling reads naturally: `hit()` folds every entry
    through `normalise()` before matching, so "دراسة" here and "الدراسه" typed
    by a customer meet in the same shape. */
const USAGE_WORDS: [Usage, string[]][] = [
  ["streaming", ["stream", "streaming", "streamer", "twitch", "youtube", "youtubeur", "direct", "بث", "بث مباشر", "ستريم", "ستريمنج", "تويتش", "يوتيوب"]],
  ["creation",  ["montage", "monter", "video", "videos", "rendu", "3d", "blender", "premiere", "photoshop", "design", "creation", "creer", "editing", "render", "montaj", "تصميم", "مونتاج", "تحرير", "فوتوشوب", "جرافيك", "رندر", "تصوير"]],
  ["office",    ["bureautique", "bureau", "travail", "etude", "etudes", "office", "word", "excel", "study", "دراسة", "مكتب", "مكتبي", "جامعة", "وورد", "اكسل", "كتابة"]],
  ["gaming",    ["jeu", "jeux", "jouer", "joue", "joues", "gaming", "gamer", "game", "games", "play", "playing", "لعب", "العاب", "ألعاب", "لعبة", "قيمنق", "جيمينج"]],
];

const BRAND_WORDS: [BrandPref, string[]][] = [
  ["nvidia", ["nvidia", "geforce", "rtx", "dlss", "انفيديا", "نفيديا", "جيفورس"]],
  ["amd",    ["amd", "ryzen", "radeon", "رايزن", "راديون"]],
  ["intel",  ["intel", "core i5", "core i7", "core i9", "core ultra", "انتل", "إنتل"]],
];

/**
 * Scope, narrowest phrasing first.
 *
 * The order is load-bearing and was wrong. "sans écran" contains "ecran" and
 * "بدون شاشة" contains "شاشة", so with `screen` tested first a customer asking
 * for the tower *without* a monitor was recorded as wanting one — the exact
 * opposite of what they said, and it puts a screen on the bill. `tower` holds
 * all the negations, so it has to be tested before the row it negates.
 */
const SCOPE_WORDS: [Scope, string[]][] = [
  ["full",   ["peripherique", "peripheriques", "clavier", "souris", "casque", "tout", "complet", "complete", "ensemble", "everything", "full setup", "ملحقات", "كل شيء", "كامل", "طقم", "لوحة مفاتيح", "فأرة", "سماعة"]],
  ["tower",  ["unite centrale", "tour seule", "juste la tour", "tower only", "case only", "sans ecran", "وحدة مركزية", "الوحدة المركزية فقط", "بدون شاشة", "الجهاز فقط", "التاور فقط"]],
  ["screen", ["ecran", "ecrans", "moniteur", "screen", "monitor", "شاشة", "مع شاشة", "مونيتور"]],
];

/**
 * Whole-word matching, not substring.
 *
 * This started as `text.includes(word)` and was wrong in a way that only shows
 * up on real sentences: "je joue **surtout** à Valorant" contains "tout", so
 * the customer was silently recorded as wanting a screen and peripherals they
 * never asked for, and the scope question was skipped. Anchoring both ends
 * kills that whole class of accident — "intel" inside "intelligence", "jeu"
 * inside "enjeu", "cs" inside anything.
 *
 * The cost is that inflections have to be listed rather than caught by a
 * prefix, which is why the tables above carry "joue" next to "jouer". That is
 * the right trade: a missed keyword asks one extra question, a false match
 * silently fills in an answer the customer never gave.
 *
 * Boundaries are defined by Unicode letters and digits rather than `\b`, so
 * Arabic terms anchor the same way Latin ones do — `\b` is defined against
 * ASCII word characters and treats every Arabic letter as a boundary.
 *
 * ─── the Arabic exception ───
 * Strict anchoring on both ends is right for French and wrong for Arabic,
 * which glues its function words onto the front of the next word rather than
 * spacing them off. "ألعاب" is the table entry; what customers actually write
 * is "للألعاب", "بالألعاب", "والألعاب" — every one of which the strict anchor
 * rejects, because from its point of view the word starts two letters earlier.
 * So an Arabic entry may be preceded by up to three of the letters that form
 * those clitics, and followed by one of the short noun endings.
 *
 * Both sides stay bounded, so this is still not substring matching: "ملعب"
 * does not match "لعب" (م is not a clitic letter) and "المكتبة" does not leak
 * into anything but "مكتب". A Latin keyword gets none of this — nothing glues
 * onto "intel".
 */

/** و ف ب ك ل and alef — the letters Arabic clitics are built from, including
    the ل + ال elision that turns "الألعاب" into "للألعاب". */
const CLITIC_IN = "[الوفبك]{0,3}";
/** ـات ـها ـه ـي — the endings that attach to the far side. */
const CLITIC_OUT = "(?:ات|ها|ه|ي)?";

const hit = (text: string, words: string[]): boolean =>
  words.some((w) => {
    const word = normalise(w);
    if (!word) return false;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const arabic = /[\u0600-\u06FF]/.test(word);
    return new RegExp(
      `(^|[^\\p{L}\\p{N}])${arabic ? CLITIC_IN : ""}${escaped}${arabic ? CLITIC_OUT : ""}($|[^\\p{L}\\p{N}])`,
      "u",
    ).test(text);
  });

/**
 * Everything the parser can find in one message, merged onto what is already
 * known.
 *
 * Merging rather than replacing matters: the conversation is incremental, and
 * a customer answering "plutôt AMD" three turns in must not wipe the budget
 * they gave at the start. A field only moves when this message actually
 * contains something for it.
 *
 * Games accumulate and de-duplicate, because "je joue à Valorant" followed by
 * "et à Warzone aussi" is two games, not a correction.
 */
export function readMessage(raw: string, prev: Brief = emptyBrief()): Brief {
  const text = normalise(raw);
  const next: Brief = { ...prev, games: [...prev.games] };

  const budget = readBudget(raw);
  if (budget !== null) next.budget = budget;

  for (const [usage, words] of USAGE_WORDS) {
    if (hit(text, words)) {
      next.usage = usage;
      break;
    }
  }

  for (const [brand, words] of BRAND_WORDS) {
    if (hit(text, words)) {
      next.brand = brand;
      break;
    }
  }

  for (const [scope, words] of SCOPE_WORDS) {
    if (hit(text, words)) {
      next.scope = scope;
      break;
    }
  }

  for (const game of GAMES) {
    /* Same whole-word rule as the keyword tables — "cs" is an alias for
       Counter-Strike and a substring of a great many innocent words. Every
       alias that is a prefix of a longer form ("valo") is listed alongside
       that longer form ("valorant"), so anchoring costs nothing here. */
    if (hit(text, game.aliases) && !next.games.includes(game.id)) {
      next.games.push(game.id);
    }
  }

  /* Naming a game is stating an intent even when the word "jouer" never
     appears — "je veux du cyberpunk en 4k" is a gaming brief. */
  if (next.games.length > 0 && next.usage === null) next.usage = "gaming";

  return next;
}

/* ── deciding what to ask ────────────────────────────────────────────────── */

/**
 * The framing questions, in the order the brief puts them.
 *
 * Budget first and always — PCB-03 makes it the one question that is never
 * skipped, because every other answer is conditional on it. Then use, then
 * brand, then scope.
 *
 * Screen resolution is deliberately absent, and that absence is load-bearing:
 * PCB-04 spells out that many customers do not know theirs, so asking it
 * either stalls the conversation or collects a wrong answer that then poisons
 * the recommendation. The FPS panel answers the question instead, by showing
 * all three resolutions at once (PCB-10).
 */
export type QuestionKey = "budget" | "usage" | "brand" | "scope";

export type Chip = {
  /** phrasebook key for the button label, and the chip's identity in the list */
  key: string;
  /**
   * An amount of money, when the chip is one — written by `formatDA` at render
   * time rather than spelled out in the phrasebook.
   *
   * The four budget rungs used to carry their own labels: "180 000 DA" in
   * French, "180 000 دج" in Arabic. The Arabic ones were wrong on screen, and
   * wrong in the specific way this codebase already knows about — the space
   * inside a grouped number is bidi-neutral, so the Unicode algorithm resolves
   * it to the paragraph direction and swaps the digit runs either side of it.
   * 800 000 rendered as 000 800. It is the exact failure `formatDA` exists to
   * prevent, and it happened here because these four strings were the only
   * place on the site quoting a price without going through it.
   *
   * So the amount travels as a number and one function writes it, in whichever
   * language is on screen. No money is hardcoded in the phrasebook any more,
   * which is the only version of this fix that stays fixed.
   */
  money?: number;
};

export const QUESTIONS: Record<QuestionKey, { key: string; chips: Chip[] }> = {
  budget: {
    key: "pcb.ask.budget",
    /* Rungs, not a slider. A customer who has not costed a machine before has
       no idea whether 200 000 is a lot; four labelled rungs teach the range
       and answer the question in one tap. */
    chips: [
      { key: "budget.180", money: 180_000 },
      { key: "budget.300", money: 300_000 },
      { key: "budget.500", money: 500_000 },
      { key: "budget.800", money: 800_000 },
    ],
  },
  usage: {
    key: "pcb.ask.usage",
    chips: [
      { key: "pcb.chip.gaming" },
      { key: "pcb.chip.streaming" },
      { key: "pcb.chip.creation" },
      { key: "pcb.chip.office" },
    ],
  },
  brand: {
    key: "pcb.ask.brand",
    chips: [
      { key: "pcb.chip.noPref" },
      { key: "pcb.chip.amd" },
      { key: "pcb.chip.intel" },
      { key: "pcb.chip.nvidia" },
    ],
  },
  scope: {
    key: "pcb.ask.scope",
    chips: [
      { key: "pcb.chip.tower" },
      { key: "pcb.chip.screen" },
      { key: "pcb.chip.full" },
    ],
  },
};

/**
 * The next thing worth asking, or null when there is enough to build.
 *
 * Brand and scope are not blockers. If the customer gave a budget and said
 * what they do with the machine, that is a machine — asking two more questions
 * before showing anything is how a configurator loses someone. They are asked
 * once, after the first proposal is on screen, where they read as refinements
 * rather than a form.
 */
export function nextQuestion(brief: Brief, asked: QuestionKey[] = []): QuestionKey | null {
  if (brief.budget === null) return "budget";
  if (brief.usage === null) return "usage";
  if (!asked.includes("brand") && brief.brand === null) return "brand";
  if (!asked.includes("scope") && brief.scope === null) return "scope";
  return null;
}

/** Whether the brief has the two answers a build actually requires. */
export const canBuild = (brief: Brief): boolean => brief.budget !== null && brief.usage !== null;

/* ── the transcript ──────────────────────────────────────────────────────── */

export type Message = {
  id: string;
  role: "assistant" | "user";
  /** assistant turns are phrasebook keys; user turns carry what they typed */
  key?: string;
  text?: string;
  vars?: Record<string, string | number>;
  chips?: Chip[];
  /** marks the turn that produced the build currently on screen */
  presentsBuild?: boolean;
};

let seq = 0;
export const messageId = () => `m${(seq += 1)}`;

export const say = (key: string, vars?: Record<string, string | number>, chips?: Chip[]): Message => ({
  id: messageId(),
  role: "assistant",
  key,
  vars,
  chips,
});

export const heard = (text: string): Message => ({ id: messageId(), role: "user", text });
