"use client";

import * as React from "react";
import { motion, useInView, type HTMLMotionProps } from "motion/react";

import { useReducedMotion } from "./use-client-fact";

import { cn } from "@/lib/utils";

/**
 * Typographic motion.
 *
 * Everything here obeys one rule: **motion never decides whether content
 * exists.** Every component renders its full text into the DOM and then
 * animates opacity and transform on top of it. A reader with JavaScript off, a
 * crawler, and anyone with `prefers-reduced-motion` gets the finished page,
 * including every figure — the counters below server-render at their final
 * values and count up only as decoration.
 *
 * ## Reduced motion changes the transition, never the tree
 *
 * The obvious way to honour the preference is to return plain elements instead
 * of animated ones. It is also wrong, and it fails in a way that only shows up
 * for the readers it was meant to help: `useReducedMotion` cannot be known on
 * the server, so it is `false` during SSR and `true` on the client for anyone
 * who set it — two different trees for the same component, which is a
 * hydration mismatch and makes React throw the whole subtree away and rebuild
 * it.
 *
 * So every component below renders the *same* elements either way, and the
 * preference only decides whether there is an `initial` offset to travel from
 * and how long the travel takes. `STILL` is that "no travel" transition.
 */

/** One curve for the whole page. Matches `--h-ease` in `home.css`. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** The transition used when the reader has asked for no motion. */
export const STILL = { duration: 0 } as const;

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * A heading whose lines rise from behind a clipping mask.
 *
 * The caller supplies the lines, rather than the component measuring where the
 * text wraps. That is the important design decision here: automatic line
 * splitting has to render, measure, and re-split on every resize and font
 * swap, and it produces a flash of unsplit text on the way. Display type this
 * large is set by hand anyway — a headline that breaks where the viewport
 * happens to put it is not a headline, it is a paragraph.
 *
 * ## Why the whole heading is observed, and not each line
 *
 * This is the bug this component was written with and had to be fixed for, and
 * it is worth stating plainly because it deadlocks silently.
 *
 * `whileInView` observes the element it is on. Here that element starts
 * translated 115% *down*, inside a parent with `overflow: hidden` — so it
 * begins life entirely outside its parent's clip box. `IntersectionObserver`
 * intersects a target against every clipping ancestor on the way up, so a
 * target clipped out by an ancestor reports an empty intersection and
 * `isIntersecting: false`. The line therefore never enters view, never
 * animates, and never leaves the position that was keeping it out of view. It
 * is invisible forever, on a page that builds and typechecks perfectly.
 *
 * So the observer goes on the heading — which is never clipped and never
 * moves — and its result drives every line inside it. One observer per
 * heading instead of one per line is also simply less work.
 */
export function MaskLines({
  lines,
  className,
  lineClassName,
  as: Tag = "h2",
  delay = 0,
  step = 0.09,
}: {
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  as?: React.ElementType;
  delay?: number;
  step?: number;
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px -8% 0px" });
  const shown = inView || Boolean(reduced);

  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={cn("block overflow-hidden", lineClassName)}>
          <motion.span
            className="block will-change-transform"
            initial={reduced ? false : { y: "115%" }}
            animate={{ y: shown ? "0%" : "115%" }}
            transition={reduced ? STILL : { duration: 1.05, delay: delay + i * step, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

const OFFSETS = {
  up: { y: 30, x: 0 },
  down: { y: -30, x: 0 },
  left: { y: 0, x: -34 },
  right: { y: 0, x: 34 },
  none: { y: 0, x: 0 },
} as const;

export function Reveal({
  children,
  className,
  delay = 0,
  from = "up",
  duration = 0.95,
  ...props
}: Omit<HTMLMotionProps<"div">, "children"> & {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  from?: keyof typeof OFFSETS;
  duration?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, ...OFFSETS[from] }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={reduced ? STILL : { duration, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** A container whose `StaggerItem` children arrive one after another. */
export function Stagger({
  children,
  className,
  step = 0.07,
  delay = 0,
  ...props
}: Omit<HTMLMotionProps<"div">, "children"> & {
  children: React.ReactNode;
  className?: string;
  step?: number;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
      variants={{
        hidden: {},
        shown: {
          transition: reduced ? STILL : { staggerChildren: step, delayChildren: delay },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  from = "up",
  ...props
}: Omit<HTMLMotionProps<"div">, "children"> & {
  children: React.ReactNode;
  className?: string;
  from?: keyof typeof OFFSETS;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? {} : { opacity: 0, ...OFFSETS[from] },
        shown: {
          opacity: 1,
          y: 0,
          x: 0,
          transition: reduced ? STILL : { duration: 0.85, ease: EASE },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * A hairline that draws itself in from the left when the section arrives.
 *
 * The observer is on the wrapper rather than on the line itself for the same
 * class of reason as `MaskLines`: a `scaleX(0)` element has a zero-area
 * bounding box, and a zero-area target is exactly the case where
 * `IntersectionObserver` behaviour stops being something to rely on. The
 * wrapper is full-width and 1px tall, which is unambiguous.
 */
export function Rule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5% 0px" });

  return (
    <span ref={ref} aria-hidden className={cn("block h-px w-full", className)}>
      <motion.span
        className="rule block"
        initial={reduced ? false : { scaleX: 0 }}
        animate={inView || reduced ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1.1, delay, ease: EASE }}
      />
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * A figure that counts up once, when it is first seen.
 *
 * Server-renders at the final value. These are catalog counts and engine
 * results — the number in the HTML is the number the page is claiming, and it
 * should not depend on JavaScript having run. The animation only ever replaces
 * a correct value with the same correct value.
 */
export function Counter({
  value,
  decimals = 0,
  className,
  duration = 1.3,
  format,
}: {
  value: number;
  decimals?: number;
  className?: string;
  duration?: number;
  format?: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  const render = React.useCallback(
    (n: number) =>
      format
        ? format(n)
        : n.toLocaleString("en-GB", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }),
    [format, decimals],
  );

  React.useEffect(() => {
    if (reduced || !inView) return;
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const started = performance.now();
    const ms = duration * 1000;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      // Quint ease-out: quick enough to feel responsive, long enough at the
      // tail that the last digits settle rather than snap.
      node.textContent = render(value * (1 - Math.pow(1 - t, 5)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else node.textContent = render(value);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, value, duration, render]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {render(value)}
    </span>
  );
}
