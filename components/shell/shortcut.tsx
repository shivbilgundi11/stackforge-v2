"use client";

import { useSyncExternalStore } from "react";

/**
 * A keyboard shortcut, labelled for the keyboard the reader is actually using.
 *
 * ## The bug this fixes
 *
 * The bindings were always cross-platform — every handler tests
 * `event.metaKey || event.ctrlKey`, so Ctrl+K and Ctrl+B have worked on
 * Windows and Linux since they were written. What did not work was the
 * *label*: the three places that advertise a shortcut hardcoded `⌘K`, which on
 * a Windows keyboard names a key that is not there. A shortcut nobody can read
 * is a shortcut nobody presses, which costs the same as not having one.
 *
 * So this is not a change of binding. It is the label catching up with what
 * the handlers already accepted.
 *
 * ## Why not just hardcode "Ctrl"
 *
 * It would fix Windows by breaking macOS, where Ctrl+K is a live Emacs-style
 * binding in every text field ("kill to end of line") and ⌘ is the modifier a
 * reader expects. Both audiences get the modifier their platform uses.
 *
 * ## Why `useSyncExternalStore`
 *
 * The platform is not knowable on the server, so a naive read during render
 * produces markup the client disagrees with. This is the primitive for that
 * exact problem, and the one `use-mounted.ts` and `first-run-notice.tsx`
 * already use here: React renders the server snapshot during hydration, then
 * re-renders with the client's answer, with no mismatch to warn about.
 *
 * The server snapshot is the Ctrl form deliberately. It is what a crawler, a
 * failed hydration and the majority of this product's traffic see, and being
 * wrong on a Mac for one frame is cheaper than being wrong on Windows
 * permanently — which is the bug being fixed.
 */

const subscribe = () => () => {};

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;

  // `userAgentData.platform` is the supported reading; `navigator.platform` is
  // deprecated but is still the only one Safari and Firefox provide, and the
  // user agent is the last resort. A wrong answer costs a modifier name, so
  // the cascade is worth more than the precision of any one source.
  //
  // `||` rather than `??` on purpose: the failure mode of these APIs is an
  // empty string, not `null`, and `??` would stop at the first one that
  // answered `""` and never reach the source that knows.
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    "";

  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** `"⌘"` on Apple platforms, `"Ctrl"` everywhere else. */
export function useModifierKey(): string {
  return useSyncExternalStore(
    subscribe,
    () => (detectMac() ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

/**
 * Renders a shortcut as a `<kbd>`, e.g. `⌘K` or `Ctrl K`.
 *
 * The separator differs with the modifier because the conventions do: macOS
 * sets its chords solid (`⌘K`), and a word-shaped modifier needs the gap to
 * stay readable (`Ctrl K`). `aria-label` spells the whole thing out either
 * way — "⌘K" is announced as a glyph name or skipped entirely, and neither is
 * a usable instruction.
 */
export function Shortcut({ keyName, className = "" }: { keyName: string; className?: string }) {
  const modifier = useModifierKey();
  const mac = modifier === "⌘";

  return (
    <kbd aria-label={`${mac ? "Command" : "Control"} ${keyName}`} className={className}>
      {mac ? `${modifier}${keyName}` : `${modifier} ${keyName}`}
    </kbd>
  );
}
