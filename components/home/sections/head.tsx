"use client";

import { MaskLines, Reveal, Rule } from "@/components/home/fx/type";
import { cn } from "@/lib/utils";

/**
 * Section furniture.
 *
 * Every chapter opens the same way — a drawn rule, a numbered label on the
 * left, the title on the right — and that repetition is the point. It is the
 * only thing telling a reader how far through a page this long they are, and
 * it does it without a sticky progress widget.
 *
 * `title` is an array because these are display lines, not a sentence: the
 * breaks are set by hand so each chapter head is a balanced block rather than
 * whatever the viewport happens to do to it.
 */

export function SectionHead({
  index,
  label,
  title,
  lede,
  className,
  align = "split",
}: {
  /** The chapter number, e.g. "02". */
  index: string;
  label: string;
  title: React.ReactNode[];
  lede?: string;
  className?: string;
  /** `split` puts the label opposite the title; `stack` sets them in a column. */
  align?: "split" | "stack";
}) {
  return (
    <div className={cn("relative", className)}>
      <Rule />

      <div
        className={cn(
          "pt-7",
          align === "split" && "grid gap-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16",
        )}
      >
        <Reveal from="none" duration={0.6}>
          <p className="t-mono flex items-baseline gap-3 text-[var(--h-fg-45)]">
            <span className="text-[var(--h-acc)]">{index}</span>
            {label}
          </p>
        </Reveal>

        <div>
          <MaskLines
            as="h2"
            lines={title}
            className="t-head max-w-[18ch] text-[clamp(2rem,5.6vw,4.4rem)]"
          />
          {lede ? (
            <Reveal delay={0.18}>
              <p className="t-body mt-7 max-w-[52ch]">{lede}</p>
            </Reveal>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The page's standard section box: full-bleed ground, content on the measure. */
export function Section({
  id,
  chapter,
  className,
  children,
}: {
  id?: string;
  /** `ink` flips the whole colour system for this section — see `home.css`. */
  chapter?: "ink";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-chapter={chapter} className={cn("relative", className)}>
      <div className="mx-auto w-full max-w-[110rem] px-5 py-20 sm:px-8 sm:py-26">{children}</div>
    </section>
  );
}
