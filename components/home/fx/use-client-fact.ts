"use client";

import * as React from "react";

/**
 * Reading a browser fact that the server cannot know.
 *
 * ## Why not `useState` plus `useEffect`
 *
 * Because "render nothing, then set state on mount" is the pattern
 * `react-hooks/set-state-in-effect` exists to catch, and the rule is right:
 * it costs a second render pass, and on anything that paints — a full-screen
 * curtain, a cursor — it can show a frame of the wrong thing first.
 *
 * `useSyncExternalStore` is the primitive for exactly this. It resolves during
 * the hydration render rather than after it, it takes an explicit server
 * snapshot so there is no mismatch, and it subscribes properly to facts that
 * can change.
 *
 * The one rule it imposes is that `getSnapshot` must be referentially stable —
 * React calls it more than once per render and re-renders if the value
 * differs. Both hooks below satisfy that by returning a cached primitive
 * rather than computing a fresh one per call.
 */

/**
 * A media query, as a boolean that tracks changes.
 *
 * Returns `false` on the server, which is the right default for every use here:
 * hover affordances and motion are things a page adds once it knows it can,
 * never things it assumes and then takes away.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);

  // `matchMedia(...).matches` is a boolean, so it is stable by value even
  // though a fresh `MediaQueryList` is created each call.
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Whether the home page honours `prefers-reduced-motion`.
 *
 * ## This is a deliberate, documented override
 *
 * Set to `false`, the home page animates for everyone — including readers whose
 * operating system asks for less motion. That is a product decision taken
 * knowingly, not an oversight: the brief for this page is that it is a designed
 * artifact, and on Windows the preference is driven by a single "Animation
 * effects" toggle that is off on a great many laptops by default, which was
 * turning the page completely inert for a large share of visitors who never
 * asked for that.
 *
 * It is worth being plain about the cost, because it is a real one. The
 * preference exists primarily for readers with vestibular disorders, for whom
 * large-travel motion — parallax, pinned horizontal scrubbing, full-screen
 * curtains — can cause genuine nausea and dizziness. Overriding it means this
 * page can do that to someone who explicitly asked it not to.
 *
 * Every gate on the page reads this one constant, so restoring the accessible
 * behaviour is a one-line change here rather than an archaeology exercise
 * across nine files. Flip it to `true` and the page respects the preference
 * again, everywhere, with no other edit.
 *
 * A middle position also exists and is probably the right eventual answer:
 * keep short opacity-only reveals under the preference and drop only the
 * things that actually travel (`Parallax`, `PinnedTrack`, `SmoothScroll`, the
 * preloader). That needs per-effect gates rather than one constant, so it is
 * not what this is.
 */
export const RESPECT_REDUCED_MOTION = false;

/**
 * The page's single source of truth for the reduced-motion preference.
 *
 * A drop-in replacement for `useReducedMotion` from `motion/react`, which every
 * component on this page imports from here instead. While
 * {@link RESPECT_REDUCED_MOTION} is `false` this returns a constant `false`,
 * which is also strictly safer for hydration than the library hook: a constant
 * cannot differ between the server render and the client one.
 */
export function useReducedMotion(): boolean {
  const system = useMediaQuery("(prefers-reduced-motion: reduce)");
  return RESPECT_REDUCED_MOTION ? system : false;
}

/**
 * The media query that GSAP's `matchMedia` contexts are registered under.
 *
 * `gsap.matchMedia()` gates a scroll effect by query string rather than by
 * boolean, so the constant above has to reach it as a query that is either the
 * real preference check or one that always matches. `"all"` is the latter.
 *
 * @param and An extra clause the effect needs regardless of motion preference,
 *   such as the `min-width` under which pinning a horizontal track is sane.
 */
export function motionQuery(and?: string): string {
  if (!RESPECT_REDUCED_MOTION) return and ?? "all";
  const base = "(prefers-reduced-motion: no-preference)";
  return and ? `${base} and ${and}` : base;
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Whether the opening curtain should run, decided once per page load.
 *
 * Cached in a module variable rather than recomputed, for two reasons. The
 * obvious one is `getSnapshot` stability. The load-bearing one is that the
 * inputs are *destroyed by reading them*: the check writes the session key, and
 * it reads `scrollY`, which is zero at mount and is not zero a moment later. A
 * second evaluation would answer differently and the curtain would tear down
 * mid-animation.
 */
let introDecision: boolean | null = null;

function decideIntro(): boolean {
  if (introDecision !== null) return introDecision;

  // A restored scroll position, a deep link, or a second visit within the
  // session all mean the reader is heading somewhere specific, and a
  // full-screen panel over it is pure obstruction.
  const returning =
    window.scrollY > 0 ||
    window.location.hash.length > 1 ||
    sessionStorage.getItem("aiveda:home-intro") === "1";

  introDecision = !returning;
  if (introDecision) sessionStorage.setItem("aiveda:home-intro", "1");
  return introDecision;
}

export function useIntroShouldRun(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    decideIntro,
    () => false,
  );
}
