"use client";

import { CircleDotIcon, ClockIcon, SigmaIcon, SparklesIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ageInDays, relativeAge } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The trust primitive.
 *
 * Stale pricing is the highest-likelihood, highest-impact risk in this product,
 * and a process document does not reach the user. Putting the age and the
 * source at the point of the number is how that risk gets designed against
 * rather than mitigated in a changelog.
 *
 * Three variants, and every generated or looked-up value on screen carries
 * exactly one:
 *   verified     — catalog data, with source and age
 *   computed     — deterministic formula output
 *   synthesised  — model-authored analysis
 */

type BaseProps = { className?: string };

type VerifiedProps = BaseProps & {
  variant: "verified";
  verifiedAt: string | Date;
  source?: { name: string; url?: string };
};

type ComputedProps = BaseProps & {
  variant: "computed";
};

type SynthesisedProps = BaseProps & {
  variant: "synthesised";
  model: string;
  promptVersion?: string;
};

export type ProvenanceChipProps = VerifiedProps | ComputedProps | SynthesisedProps;

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap";

/** 7 and 30 days are the boundaries. Past 30, the chip actively warns. */
function staleness(days: number) {
  if (days <= 7) return "fresh" as const;
  if (days <= 30) return "aging" as const;
  return "stale" as const;
}

export function ProvenanceChip(props: ProvenanceChipProps) {
  if (props.variant === "computed") {
    return (
      <span
        className={cn(chipBase, "border-line bg-surface-2 text-fg-muted", props.className)}
        title="Calculated deterministically from catalog data"
      >
        <SigmaIcon className="size-3" aria-hidden />
        rule-based
      </span>
    );
  }

  if (props.variant === "synthesised") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              chipBase,
              "cursor-default border-forge-line bg-forge-quiet text-forge",
              props.className,
            )}
          >
            <SparklesIcon className="size-3" aria-hidden />
            AI · {props.model}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Model-authored analysis, grounded in the calculated result.
          {props.promptVersion ? ` Prompt ${props.promptVersion}.` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  const days = ageInDays(props.verifiedAt);
  const state = staleness(days);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            chipBase,
            "cursor-default",
            state === "fresh" && "border-line bg-surface-2 text-fg-muted",
            state === "aging" && "border-warning-line bg-warning-quiet text-warning",
            state === "stale" && "border-danger-line bg-danger-quiet text-danger",
            props.className,
          )}
        >
          {state === "fresh" ? (
            <ClockIcon className="size-3" aria-hidden />
          ) : (
            <CircleDotIcon className="size-3" aria-hidden />
          )}
          verified {relativeAge(props.verifiedAt)}
          {props.source ? (
            <>
              <span className="text-fg-subtle" aria-hidden>
                ·
              </span>
              <span className="max-w-[14ch] truncate font-normal">{props.source.name}</span>
            </>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {state === "stale"
          ? `This figure has not been re-verified in ${days} days. Treat it as indicative.`
          : `Pricing last confirmed against the provider ${relativeAge(props.verifiedAt)}.`}
        {props.source?.url ? ` Source: ${props.source.url}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}
