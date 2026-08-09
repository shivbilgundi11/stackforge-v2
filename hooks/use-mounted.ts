"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during SSR and the hydration pass, `true` afterwards.
 *
 * Used where the server cannot know the answer — resolved theme being the main
 * case. `useSyncExternalStore` is the right primitive here rather than
 * `useEffect(() => setMounted(true))`: it reports the value React already
 * knows instead of triggering a second render to discover it.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
