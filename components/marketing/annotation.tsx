import { cn } from "@/lib/utils";

/**
 * The margin note — the line a designer would pencil next to a diagram, with
 * an arrow pointing at the thing it is about.
 *
 * ## Why it is `aria-hidden`
 *
 * Every annotation on this page restates something the running copy already
 * says: "Good ideas deserve better planning" sits beside a heading about
 * planning, "From idea to implementation" beside the four steps that do it.
 * They are pacing, not content. Announcing them would read as a stutter —
 * the same claim twice, once in a voice that cannot carry handwriting.
 *
 * That is also the test for adding one: if a note carries information the
 * section does not, it is not an annotation, it is copy in the wrong place.
 *
 * They are hidden below `lg` for the same reason they exist — they live in
 * the white space beside a column, and at phone width there is none.
 */

const DIRECTIONS = {
  /** Sweeps right and down — a note above-left of its subject. */
  "down-right": "M4 6C26 4 52 12 63 30c6 10 7 20 6 30M69 60l-7-9M69 60l6-10",
  /** Sweeps left and down — a note above-right of its subject. */
  "down-left": "M76 6C54 4 28 12 17 30c-6 10-7 20-6 30M11 60l7-9M11 60l-6-10",
  /** Short hook up and right — a note below-left of its subject. */
  "up-right": "M4 56C22 54 44 44 56 22M56 22l-11 3M56 22l2 11",
  /** Short hook up and left — a note below-right of its subject. */
  "up-left": "M76 56C58 54 36 44 24 22M24 22l11 3M24 22l-2 11",
} as const;

export type AnnotationDirection = keyof typeof DIRECTIONS;

export function Annotation({
  children,
  direction = "down-right",
  className,
  arrowClassName,
}: {
  children: React.ReactNode;
  direction?: AnnotationDirection;
  className?: string;
  /** Position and size of the arrow relative to the note. */
  arrowClassName?: string;
}) {
  const below = direction.startsWith("up");

  return (
    <div aria-hidden className={cn("pointer-events-none hidden lg:block", className)}>
      {below ? <Arrow d={DIRECTIONS[direction]} className={arrowClassName} /> : null}
      <p className="font-hand text-[19px] leading-tight text-fg-muted">{children}</p>
      {below ? null : <Arrow d={DIRECTIONS[direction]} className={arrowClassName} />}
    </div>
  );
}

function Arrow({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 80 66"
      fill="none"
      aria-hidden
      className={cn("h-14 w-20 text-fg-subtle", className)}
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The floating callout pills around the hero shot.
 *
 * Absolutely positioned by the caller, which is deliberate: there is no
 * layout that places these well in general, only one that places them well
 * against this particular screenshot. They go with the image.
 */
export function FloatPill({
  icon: Icon,
  tone = "neutral",
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ember" | "info" | "forge" | "success" | "rose" | "neutral";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      data-tone={tone}
      className={cn(
        "pointer-events-none absolute hidden items-center gap-2.5 rounded-xl border border-tone-line/60 bg-surface/85 px-3.5 py-2.5 shadow-overlay backdrop-blur-sm lg:flex",
        className,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tone-quiet text-tone">
        <Icon className="size-4" />
      </span>
      <span className="text-[12.5px] leading-[1.35] font-medium text-balance text-fg">
        {children}
      </span>
    </div>
  );
}
