"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  isAccent,
  type AccentValue,
} from "@/lib/theme/accents";

/**
 * Read and set the accent.
 *
 * The accent is not React state — it is an attribute on `<html>`, written
 * before React exists by the blocking script and read by CSS. So this
 * subscribes to it rather than mirroring it: `useSyncExternalStore` is the
 * primitive for exactly this shape, and it avoids the setState-in-an-effect
 * that mirroring requires.
 *
 * Two things fall out for free. Hydration is correct without a `mounted`
 * flag, because React uses the server snapshot during hydration and the live
 * one immediately after. And a change in one tab reaches the others, because
 * `storage` fires there.
 *
 * Not a context provider: the accent is applied by CSS, so no component
 * re-renders when it changes. A provider would exist only to re-render a tree
 * that does not read the value.
 */

const ACCENT_EVENT = "stackforge:accent";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(ACCENT_EVENT, onChange);
  // Cross-tab. `storage` only fires in *other* tabs, which is why the local
  // change also dispatches the custom event above.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ACCENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): AccentValue {
  // From the DOM, not from storage: the blocking script has already resolved
  // which one wins, and reading storage here would re-implement that decision
  // in a second place where it could disagree.
  const applied = document.documentElement.getAttribute("data-accent");
  return isAccent(applied) ? applied : DEFAULT_ACCENT;
}

function getServerSnapshot(): AccentValue {
  return DEFAULT_ACCENT;
}

export function useAccent(): {
  accent: AccentValue;
  setAccent: (value: AccentValue) => void;
} {
  const accent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setAccent = useCallback((value: AccentValue) => {
    if (value === DEFAULT_ACCENT) {
      // The default is the absence of an override, so the attribute comes off
      // rather than being set to "ember". Otherwise the CSS carries a block
      // that restates what `:root` already says.
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", value);
    }

    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, value);
    } catch {
      // Storage blocked. The accent still applies for this session; it just
      // will not survive a reload, which beats throwing on a preference.
    }

    window.dispatchEvent(new Event(ACCENT_EVENT));
  }, []);

  return { accent, setAccent };
}
