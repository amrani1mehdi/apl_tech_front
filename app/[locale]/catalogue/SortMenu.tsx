"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Check } from "lucide-react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export type SortOption<T extends string> = { value: T; label: string };

/**
 * The sort control, as a listbox rather than a native <select>.
 *
 * A native select cannot be animated — the option list is drawn by the
 * operating system — so this rebuilds it, and then owes everything the native
 * one gave away for free: it opens on Enter, Space or either arrow, walks with
 * the arrows, jumps with Home and End, commits on Enter and abandons on
 * Escape, and closes on a click elsewhere or on blur.
 *
 * Focus stays on the button the whole time and the active option is named by
 * aria-activedescendant, so nothing has to be moved into the popup and moved
 * back out again — which is the part of a hand-built listbox that usually
 * breaks.
 */
export function SortMenu<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly SortOption<T>[];
  onChange: (next: T) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => options.findIndex((o) => o.value === value));
  const root = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const reduced = useReducedMotion();

  const selected = options.find((o) => o.value === value) ?? options[0];

  // a click anywhere else is a dismissal, not a selection
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const commit = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const current = options.findIndex((o) => o.value === value);

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAt(current < 0 ? 0 : current);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openAt(options.findIndex((o) => o.value === value)))}
        onKeyDown={onKeyDown}
        onBlur={(e) => {
          if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className={`sort-trigger flex items-center gap-2 rounded-full border bg-cloud py-2 ps-4 pe-3 text-sm font-medium text-ink ${
          open ? "border-accent/45" : "border-line hover:border-ink/25"
        }`}
      >
        {selected.label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
          className="grid place-items-center"
        >
          <ChevronDown className={`h-4 w-4 ${open ? "text-accent" : "text-faint"}`} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduced ? 0.12 : 0.24, ease: EASE_OUT }}
            /* Pressing an option must not pull focus off the trigger: the
               blur would close the menu and unmount the row before its click
               ever fired, and the choice would be swallowed. Holding focus on
               the button is also what keeps aria-activedescendant valid. */
            onMouseDown={(e) => e.preventDefault()}
            /* anchored to the trigger's end edge so it never leaves the
               viewport on a narrow screen, and mirrored under RTL by the
               logical property rather than by a second rule */
            className="absolute end-0 top-[calc(100%+0.5rem)] z-40 min-w-[13rem] origin-top overflow-hidden rounded-2xl border border-line bg-cloud p-1.5 shadow-[0_24px_48px_-28px_rgb(23_22_15/0.45)]"
          >
            {options.map((o, i) => {
              const on = o.value === value;
              return (
                <motion.li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={on}
                  initial={reduced ? false : { opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: EASE_OUT,
                    delay: reduced ? 0 : 0.03 + i * 0.035,
                  }}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(i)}
                  className={`relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    on ? "font-semibold text-ink" : "text-mute"
                  }`}
                >
                  {/* the hover mark is one element travelling between rows,
                      so moving down the list reads as a single highlight
                      following the cursor rather than five fading in turn */}
                  {i === active && (
                    <motion.span
                      layoutId={`${id}-hover`}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 520, damping: 40 }
                      }
                      className="absolute inset-0 rounded-xl bg-white"
                    />
                  )}
                  <span className="relative flex-1">{o.label}</span>
                  <motion.span
                    initial={false}
                    animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
                    transition={
                      reduced ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 28 }
                    }
                    className="relative text-accent"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </motion.span>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
