"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  isDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/currency/display-currency";

/**
 * Read and set the display currency.
 *
 * `useSyncExternalStore` rather than state in a provider, for the same reason
 * `useAccent` uses it: the value lives in `localStorage`, which is not React
 * state, and mirroring it into state needs a setState-in-an-effect that runs
 * on every mount. It also gets hydration right for free — React renders the
 * server snapshot while hydrating and swaps to the stored one immediately
 * after, so there is no mismatch to suppress.
 *
 * Unlike the accent there is no blocking script and no attribute on `<html>`.
 * The accent needs one because *CSS* reads it before React exists; nothing but
 * JavaScript reads this, and prices are behind a query that has not resolved
 * at first paint anyway.
 */

const CURRENCY_EVENT = "stackforge:currency";

/**
 * Set only where storage is unavailable — a locked-down browser, or private
 * mode with a zero quota. Without it the toggle writes nowhere, reads back the
 * default, and looks broken rather than merely forgetful.
 */
let inMemory: DisplayCurrency | null = null;

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CURRENCY_EVENT, onChange);
  // Cross-tab. `storage` only fires in *other* tabs, which is why the local
  // change also dispatches the custom event above.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CURRENCY_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): DisplayCurrency {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (isDisplayCurrency(stored)) return stored;
  } catch {
    // Storage blocked — a preference is not worth throwing over.
  }
  return inMemory ?? DEFAULT_CURRENCY;
}

function getServerSnapshot(): DisplayCurrency {
  return DEFAULT_CURRENCY;
}

export function useDisplayCurrency(): {
  currency: DisplayCurrency;
  setCurrency: (value: DisplayCurrency) => void;
} {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCurrency = useCallback((value: DisplayCurrency) => {
    inMemory = value;
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, value);
    } catch {
      // The change still applies for this session; it just will not survive a
      // reload, which beats throwing on a preference.
    }
    window.dispatchEvent(new Event(CURRENCY_EVENT));
  }, []);

  return { currency, setCurrency };
}
