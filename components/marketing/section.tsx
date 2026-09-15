import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared section furniture for the marketing pages.
 *
 * Every section is separated by a hairline rather than by a background
 * change, which is the same rule the product's design system follows: the
 * page and a panel are the same colour, and the 1px border is the only thing
 * between them. Marketing that invents its own elevation model stops looking
 * like the product it is selling.
 */

export function Section({
  id,
  className,
  children,
  bleed = false,
  wide = false,
  flush = false,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  /** Drop the hairline — for the hero, which sits under the header already. */
  bleed?: boolean;
  /**
   * 1280px instead of 1120px.
   *
   * The home page puts a figure beside the copy in almost every section, and
   * two columns plus a gutter do not fit in the reading measure the text-only
   * pages are set to. Opt-in rather than a new default, because `/about` and
   * the legal pages are one column of prose and 1120px is already generous
   * for that.
   */
  wide?: boolean;
  /** Drop the vertical padding — for sections that carry their own panel. */
  flush?: boolean;
}) {
  return (
    <section id={id} className={cn(!bleed && "border-t border-line", className)}>
      <div
        className={cn(
          "mx-auto w-full px-5",
          wide ? "max-w-320" : "max-w-280",
          flush ? "py-10" : "py-16 sm:py-20",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-[62ch]", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="font-mono text-[10.5px] tracking-[0.12em] text-ember uppercase">{eyebrow}</p>
      ) : null}
      <h2
        className={cn(
          "font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.02em] text-balance text-fg",
          eyebrow && "mt-3",
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p className="mt-4 text-[15px] leading-relaxed text-pretty text-fg-muted">{lede}</p>
      ) : null}
    </div>
  );
}

/** The closing call to action. One per page, at the bottom. */
export function CtaBand({
  title = "Plan the stack before you build it.",
  lede = "Free to start, no card. Twenty-five runs a day, every tool included.",
  primary = { href: "/signup", label: "Get started free" },
  secondary = { href: "/pricing", label: "See pricing" },
}: {
  title?: string;
  lede?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <Section>
      <div className="rounded-(--radius) border border-line bg-surface-2 px-6 py-12 text-center sm:px-12">
        <h2 className="mx-auto max-w-[24ch] font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.02em] text-balance text-fg">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-pretty text-fg-muted">
          {lede}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-10 bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
          >
            <Link href={primary.href}>{primary.label}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-10">
            <Link href={secondary.href}>{secondary.label}</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
