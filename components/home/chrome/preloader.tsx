"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { EASE } from "@/components/home/fx/type";
import { useIntroShouldRun, useReducedMotion } from "@/components/home/fx/use-client-fact";

/**
 * The opening curtain.
 *
 * ## Why a page like this is allowed one, and most pages are not
 *
 * A preloader is a cost charged to every visitor, and it is usually charged
 * for nothing — the content is already there and the loader is delaying it to
 * look expensive. It earns its place here only under conditions, and all four
 * are enforced rather than intended:
 *
 *   1. **It is capped.** 1.4 seconds, whatever the network is doing. It counts
 *      a timeline, not a resource, because tying it to real load punishes a
 *      slow connection twice.
 *   2. **It runs once per session.** Coming back to the home page from
 *      `/pricing` does not replay it. A curtain you sit through three times is
 *      an obstacle, not an entrance.
 *   3. **It never gates content.** The page is fully rendered underneath from
 *      the first paint; this is an overlay that lifts off it. It is also
 *      client-only, so the server HTML a crawler sees has no curtain in it at
 *      all — and a reader without JavaScript is never left facing a black
 *      screen that nothing will remove.
 *   4. **It does not exist under reduced motion**, or for anyone arriving at a
 *      restored scroll position or a deep link.
 *
 * The exit is a wipe rather than a fade: the panel clears upward, which hands
 * the eye to the hero underneath instead of dissolving into it.
 *
 * ## The decision is a store read, not an effect
 *
 * Conditions 2 and 4 depend on `sessionStorage`, the hash and the scroll
 * position — none of which the server can know. Resolving them with
 * `useState` + `useEffect` would paint one frame of the hero before the
 * curtain dropped over it. `useIntroShouldRun` resolves during the hydration
 * render instead; see `use-client-fact.ts`.
 */

const DURATION = 1400;

export function Preloader() {
  const reduced = useReducedMotion();
  const shouldRun = useIntroShouldRun();
  // The landing page only. `/about` and `/features` now share this shell, and
  // they are pages a reader arrives at from somewhere — a nav item, a link in
  // the middle of the home page, a search result. A curtain reading "loading
  // the workbench" in front of those is the obstacle condition 2 below rules
  // out, not an entrance.
  const landing = usePathname() === "/";
  const [count, setCount] = React.useState(0);
  const [finished, setFinished] = React.useState(false);

  const running = landing && shouldRun && !reduced && !finished;

  React.useEffect(() => {
    if (!running) return;

    document.documentElement.style.overflow = "hidden";

    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / DURATION);
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setFinished(true);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.style.overflow = "";
    };
  }, [running]);

  return (
    <AnimatePresence>
      {running ? (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-90 flex flex-col justify-between bg-[#1a1b1e] px-5 py-6 text-(--h-bone) sm:px-8"
          initial={{ opacity: 1 }}
          exit={{ y: "-100%", transition: { duration: 0.9, ease: EASE } }}
        >
          <div className="flex items-start justify-between">
            <span className="t-mono">Buildtact</span>
            <span className="t-mono">Plan before you build</span>
          </div>

          <div className="flex items-end justify-between gap-6">
            <span className="t-display text-[clamp(4rem,18vw,14rem)] tabular-nums">
              {String(count).padStart(3, "0")}
            </span>
            <span className="t-mono mb-3 hidden sm:block">Loading the workbench</span>
          </div>

          {/* The progress hairline, along the very bottom edge. */}
          <span className="absolute inset-x-0 bottom-0 h-px bg-[color-mix(in_srgb,var(--h-bone)_25%,transparent)]">
            <span
              className="block h-full origin-left bg-(--h-acc)"
              style={{ transform: `scaleX(${count / 100})` }}
            />
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
