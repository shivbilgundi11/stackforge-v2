"use client";

import { XIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Disclaimer } from "@/components/legal/disclaimer";
import { FIRST_RUN } from "@/lib/legal/disclaimers";

/**
 * The once-per-tool notice, on the two surfaces with the most at stake.
 *
 * The checklist is explicit that this must not be a click-through gate — the
 * point-of-use disclaimers do the real work, and a modal in front of the
 * product buys nothing legally while costing every returning user a click. So
 * it is an inline callout that dismisses and stays dismissed.
 *
 * ## Why `localStorage` and not the account
 *
 * A dismissal is a fact about a browser, not about a person: the notice exists
 * to be met once by someone opening the tool for the first time, and storing
 * it server-side would mean a column, a migration and an endpoint to make one
 * sentence disappear slightly more thoroughly.
 *
 * Every access is wrapped. A private window, cleared site data or a browser
 * set to block storage throws on read, and the honest failure is to show the
 * notice again rather than to break the page it sits on.
 *
 * ## Why a store rather than an effect
 *
 * `localStorage` does not exist during the server render, so the value has to
 * be read after hydration — but reading it into state inside an effect is a
 * cascading render, and the lint rule that forbids it is right. `useSync-
 * ExternalStore` is the API for exactly this: the server snapshot says
 * "dismissed", so nothing renders until the client has actually looked.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dismissedIn(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    // Storage unavailable. Showing the notice is the safe direction — the cost
    // is one sentence somebody may have read before.
    return false;
  }
}

function dismiss(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // It stays dismissed for this view either way, and comes back next time.
    // A toast about browser storage is not something the reader can act on.
  }
  for (const listener of listeners) listener();
}

export function FirstRunNotice({ tool }: { tool: string }) {
  const key = `stackforge.first-run.${tool}`;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => dismissedIn(key),
    // Server and first client render agree on "already dismissed", so the
    // notice never flashes for the people who have seen it.
    () => true,
  );

  if (dismissed) return null;

  return (
    <div
      data-testid="first-run-notice"
      className="flex items-start gap-2 rounded-md border border-line bg-surface-2/50 px-3 py-2.5"
    >
      <Disclaimer className="flex-1 px-0">{FIRST_RUN}</Disclaimer>
      <button
        type="button"
        aria-label="Dismiss"
        className="-mt-0.5 shrink-0 rounded-xs p-0.5 text-fg-subtle transition-colors hover:text-fg"
        onClick={() => dismiss(key)}
      >
        <XIcon className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
