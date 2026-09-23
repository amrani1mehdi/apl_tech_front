"use client";

import { useSyncExternalStore } from "react";

/**
 * What the machine on the account pages is showing.
 *
 * The forms and the drawing live in different parts of the tree — the drawing
 * belongs to the shared layout, so it stays lit while the customer moves
 * between signing in and signing up — which puts this state outside React.
 * The forms write it from their event handlers; the drawing subscribes.
 *
 *   idle      nobody at the form: standby, one LED breathing
 *   awake     a field in use: the board is on, the lights follow the form
 *   working   the request is out: every fan up, the strip sweeping
 *   success   in: everything lit, a welcome on the glass
 *   error     refused: the lights flicker out and come back
 */
export type RigMode = "idle" | "awake" | "working" | "success" | "error";

export type RigState = {
  mode: RigMode;
  /** memory sticks lit, 0–4 — how much of "who you are" is filled in */
  ram: number;
  /** front fans lit and turning, 0–3 — how strong the password is */
  fans: number;
  /** bumped on every keystroke */
  pulse: number;
  /** bumped on every refusal, so a second one flickers again */
  failures: number;
  /** the caption, as a phrasebook key — null for the mode's own */
  label: string | null;
  /** first name, once known — for the welcome */
  name: string | null;
};

const INITIAL: RigState = { mode: "idle", ram: 0, fans: 0, pulse: 0, failures: 0, label: null, name: null };

let state = INITIAL;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const rig = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set(patch: Partial<RigState>) {
    state = { ...state, ...patch };
    emit();
  },
  /** a keystroke — and typing again after a refusal clears it */
  key(patch: Partial<RigState> = {}) {
    state = {
      ...state,
      ...patch,
      pulse: state.pulse + 1,
      mode: state.mode === "error" || state.mode === "idle" ? "awake" : state.mode,
      label: state.mode === "error" ? null : (patch.label ?? state.label),
    };
    emit();
  },
  focus(inside: boolean) {
    if (inside && state.mode === "idle") rig.set({ mode: "awake" });
    if (!inside && state.mode === "awake") rig.set({ mode: "idle" });
  },
  fail(label: string, patch: Partial<RigState> = {}) {
    rig.set({ ...patch, mode: "error", label, failures: state.failures + 1 });
  },
  reset(patch: Partial<RigState> = {}) {
    state = { ...INITIAL, pulse: state.pulse, failures: state.failures, ...patch };
    emit();
  },
};

export function useRig(): RigState {
  return useSyncExternalStore(rig.subscribe, rig.get, () => INITIAL);
}

/** Letters and digits typed so far, as sticks of memory: a stick every three. */
export const ramFor = (typed: string, complete: boolean): number =>
  complete ? 4 : Math.min(3, Math.floor(typed.replace(/\s/g, "").length / 3));
