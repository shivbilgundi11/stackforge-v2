import Link from "next/link";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The tinted card, and the two pieces that always sit inside it.
 *
 * ## Why the marketing cards are tinted and the product's are not
 *
 * Inside the workbench a card is white with a hairline, and a colour on it
 * means something — indigo is model-authored, amber is aging data, red is a
 * figure you should not trust. Adding a decorative tint there would spend a
 * signal the product needs.
 *
 * The home page has the opposite problem. It is ten sections of the same
 * shape, and a visitor scrolling it needs to know they have moved before they
 * have read anything. Tint is the cheapest way to say that, and out here it
 * costs nothing because nothing on this page is claiming a status.
 *
 * So the tone is set on the card and resolved by `[data-tone]` in
 * `globals.css` into `--tone`, `--tone-quiet`, and `--tone-line`. Everything
 * below reads those three and has no per-colour branch of its own.
 */

export type Tone = "ember" | "info" | "forge" | "success" | "rose" | "neutral";

export function TintedCard({
  tone = "neutral",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { tone?: Tone }) {
  return (
    <div
      data-tone={tone}
      className={cn(
        "tone-wash relative overflow-hidden rounded-lg border border-tone-line/60 p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** The same card as a link: the whole surface is the target, not just the cue. */
export function TintedCardLink({
  tone = "neutral",
  href,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { tone?: Tone; href: string }) {
  return (
    <Link
      href={href}
      data-tone={tone}
      className={cn(
        "tone-wash group relative flex flex-col overflow-hidden rounded-lg border border-tone-line/60 p-5 transition-colors",
        "hover:border-tone-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * The rounded square that opens every card.
 *
 * Sized in one place because a grid of these is read as a row of equal things,
 * and one tile a pixel taller than its neighbours is the sort of detail that
 * makes an otherwise finished page feel unfinished.
 */
export function IconTile({
  icon: Icon,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-tone-quiet text-tone",
        size === "md" ? "size-11" : "size-9",
        className,
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} aria-hidden />
    </span>
  );
}

/**
 * The cue at the foot of a card, in the card's own tone.
 *
 * Rendered as a span rather than an anchor when the card itself is the link —
 * a link inside a link is invalid HTML, and a screen reader announcing the
 * same destination twice is the user-visible half of that bug.
 */
export function CardCue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mt-auto inline-flex items-center gap-1.5 pt-5 text-[13px] font-medium text-tone",
        className,
      )}
    >
      {children}
      <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}
