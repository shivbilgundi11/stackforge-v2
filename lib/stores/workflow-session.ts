"use client";

import { create } from "zustand";

/**
 * Cross-workflow handoff.
 *
 * The five workflows are not five products. Pricing a model and then budgeting
 * for it are two halves of one thought, and the old build made the user retype
 * the second half — which is how a "suite" turns back into a folder of
 * calculators. A handoff carries the figures across.
 *
 * Deliberately in-memory rather than persisted. A handoff exists for the
 * moment between clicking "use this" and landing on the target tool, and App
 * Router navigation is client-side, so module state survives exactly as long
 * as the handoff needs to. Persisting it to storage would buy nothing and cost
 * an SSR hydration mismatch plus a stale prefill waiting in a tab opened
 * yesterday. Durable state is saved runs (M17), which is a different feature
 * with a different lifetime.
 */

export type Handoff = {
  /** Slug of the tool the values came from, for the "carried from" note. */
  from: string;
  /** Human label of the source tool, so the target need not resolve it. */
  fromTitle: string;
  values: Record<string, unknown>;
};

type WorkflowSessionState = {
  /** Keyed by target slug. At most one pending handoff per destination. */
  pending: Record<string, Handoff>;
  send: (to: string, handoff: Handoff) => void;
  /**
   * Read and clear in one step.
   *
   * A handoff is consumed, not observed: leaving it in the store would
   * re-apply it and silently discard the user's edits the next time the
   * target tool mounted.
   */
  take: (to: string) => Handoff | undefined;
  clear: () => void;
};

export const useWorkflowSession = create<WorkflowSessionState>((set, get) => ({
  pending: {},

  send: (to, handoff) => set((state) => ({ pending: { ...state.pending, [to]: handoff } })),

  take: (to) => {
    const handoff = get().pending[to];
    if (!handoff) return undefined;
    set((state) => {
      const { [to]: _taken, ...rest } = state.pending;
      return { pending: rest };
    });
    return handoff;
  },

  clear: () => set({ pending: {} }),
}));
