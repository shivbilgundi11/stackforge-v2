"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The atom of the product.
 *
 * Uppercase label, monospace tabular value, optional signed delta, optional
 * provenance line. Not a shadowed card — a hairline-bounded cell inside a
 * strip, because the comparison between adjacent figures is the point.
 */

const deltaVariants = cva(
  "inline-flex items-center gap-0.5 rounded-xs px-1 py-px text-[11px] font-medium tabular-nums",
  {
    variants: {
      tone: {
        positive: "bg-success-quiet text-success",
        negative: "bg-danger-quiet text-danger",
        neutral: "bg-surface-2 text-fg-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type MetricDelta = {
  value: string;
  /** `positive` is green regardless of direction — the caller decides whether
   *  a cost going *down* is the good outcome. */
  tone?: VariantProps<typeof deltaVariants>["tone"];
  direction?: "up" | "down";
  label?: string;
};

export type MetricTileProps = {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: MetricDelta;
  footnote?: React.ReactNode;
  emphasis?: boolean;
  className?: string;
};

export function MetricTile({
  label,
  value,
  unit,
  delta,
  footnote,
  emphasis = false,
  className,
}: MetricTileProps) {
  const DirectionIcon = delta?.direction === "up" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 px-4 py-3.5", className)}>
      <span className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
        {label}
      </span>

      <div className="flex items-baseline gap-1.5">
        <span
          data-slot="metric-value"
          className={cn(
            "truncate leading-none font-medium text-fg",
            emphasis ? "text-[30px]" : "text-[22px]",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-xs font-medium text-fg-subtle">{unit}</span> : null}
      </div>

      {(delta || footnote) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta ? (
            <span className={cn(deltaVariants({ tone: delta.tone }))}>
              {delta.direction ? <DirectionIcon className="size-2.5" aria-hidden /> : null}
              {delta.value}
              {delta.label ? (
                <span className="ml-0.5 font-normal text-fg-subtle">{delta.label}</span>
              ) : null}
            </span>
          ) : null}
          {footnote ? <span className="text-[11px] text-fg-subtle">{footnote}</span> : null}
        </div>
      )}
    </div>
  );
}

/**
 * Tiles laid out edge to edge, divided by hairlines rather than gaps. Columns
 * collapse to two, then one — a three-across strip at 360px is unreadable.
 */
export function MetricStrip({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid divide-y divide-line overflow-hidden rounded-md border border-line bg-surface",
        "sm:divide-x sm:divide-y-0",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
