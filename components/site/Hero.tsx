"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/i18n/LocaleLink";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { BrandMarquee } from "./BrandMarquee";
import { Magnetic } from "./Magnetic";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Slide = {
  id: string;
  /** literal, language-neutral pills (RTX 5080, 240 Hz…) */
  specs?: string[];
  /** i18n keys, for copy-driven slides that need translating */
  specKeys?: string[];
  price: string;
  image: string;
  alt: string;
  href: string;
};

const SLIDES: Slide[] = [
  { id: "s0", specKeys: ["hero.s0.spec1", "hero.s0.spec2", "hero.s0.spec3"], price: "149 000 DA", image: "/products/apl-promo.jpg", alt: "PC gamer APL Tech en promotion", href: "/catalogue" },
  { id: "sb", specKeys: ["hero.sb.spec1", "hero.sb.spec2", "hero.sb.spec3"], price: "165 000 DA", image: "/products/ai-builder.jpg", alt: "Assemblage PC automatisé APL TECH", href: "/configurateur" },
  { id: "sd", specKeys: ["hero.sd.spec1", "hero.sd.spec2", "hero.sd.spec3"], price: "800 DA", image: "/products/delivery-dz.jpg", alt: "Livraison APL TECH dans les 58 wilayas", href: "/catalogue" },
];

const imgVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, scale: 1.08, x: dir > 0 ? "5%" : "-5%" }),
  center: { opacity: 1, scale: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, scale: 1.04, x: dir > 0 ? "-3%" : "3%" }),
};
const textWrap: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.02 } },
};
const textItem: Variants = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

const DURATION = 6000;

export function Hero() {
  const { t } = useLocale();
  const [[index, dir], setState] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const len = SLIDES.length;
  const slide = SLIDES[index];

  const go = (next: number, d: number) => setState([(next + len) % len, d]);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => setState(([i]) => [(i + 1) % len, 1]), DURATION);
    return () => clearTimeout(id);
  }, [index, paused, len]);

  return (
    <>
      <section
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="relative h-svh min-h-[660px] w-full overflow-hidden bg-ink"
      >
        <AnimatePresence mode="sync" custom={dir}>
          <motion.img
            key={index}
            src={slide.image}
            alt={slide.alt}
            custom={dir}
            variants={imgVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/45" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1320px] flex-col justify-center px-5 pb-44 pt-28 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              variants={textWrap}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-2xl"
            >
              <motion.div variants={textItem} className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  <Check className="h-3.5 w-3.5 text-accent" strokeWidth={3} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                    {t("c.inStock")}
                  </span>
                </span>
                <span className="font-sans text-[11px] font-semibold uppercase text-white/70">
                  {t(`hero.${slide.id}.tag`)}
                </span>
              </motion.div>

              <motion.h1
                variants={textItem}
                className="mt-5 font-display text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-[0.96] tracking-[-0.02em] text-white"
              >
                {t(`hero.${slide.id}.title`)}
              </motion.h1>

              <motion.p
                variants={textItem}
                className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-white/80"
              >
                {t(`hero.${slide.id}.desc`)}
              </motion.p>

              <motion.ul variants={textItem} className="mt-7 flex flex-wrap gap-2">
                {(slide.specKeys?.map(t) ?? slide.specs ?? []).map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white backdrop-blur"
                  >
                    {s}
                  </li>
                ))}
              </motion.ul>

              <motion.div variants={textItem} className="mt-9 flex flex-wrap items-center gap-6">
                <Magnetic strength={0.25}>
                  <Link
                    href={slide.href}
                    className="btn-accent group flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[0.95rem] font-semibold"
                  >
                    {t("c.seeSelection")}
                    <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </Link>
                </Magnetic>
                <div>
                  <p className="font-sans text-[10px] font-semibold uppercase text-white/60">
                    {t("c.from")}
                  </p>
                  <p className="font-display text-xl font-bold text-white">{slide.price}</p>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* controls */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto max-w-[1320px] px-5 pb-7 lg:px-8">
            <div className="flex items-end justify-between gap-6">
              <div className="flex flex-1 items-center gap-5">
                <div className="flex gap-2">
                  <button
                    aria-label="prev"
                    onClick={() => go(index - 1, -1)}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white backdrop-blur transition-colors hover:bg-white hover:text-ink"
                  >
                    <ArrowLeft className="h-[18px] w-[18px] rtl:rotate-180" />
                  </button>
                  <button
                    aria-label="next"
                    onClick={() => go(index + 1, 1)}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white backdrop-blur transition-colors hover:bg-white hover:text-ink"
                  >
                    <ArrowRight className="h-[18px] w-[18px] rtl:rotate-180" />
                  </button>
                </div>

                <span className="font-display text-sm font-bold text-white">
                  0{index + 1}
                  <span className="text-white/50"> / 0{len}</span>
                </span>

                <div className="hidden h-0.5 max-w-[200px] flex-1 overflow-hidden rounded-full bg-white/25 sm:block">
                  <div
                    key={index}
                    className="h-full origin-left bg-accent-gradient-x rtl:origin-right"
                    style={{
                      animation: `grow ${DURATION}ms linear forwards`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                </div>
              </div>

              <div className="hidden items-center gap-2.5 sm:flex">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => go(i, i > index ? 1 : -1)}
                    aria-label={s.id}
                    className={`relative h-12 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                      i === index ? "border-white opacity-100" : "border-white/40 opacity-55 hover:opacity-90"
                    }`}
                  >
                    <img src={s.image} alt="" className="h-full w-full object-cover" draggable={false} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-line bg-paper py-7">
        <BrandMarquee />
      </div>
    </>
  );
}
