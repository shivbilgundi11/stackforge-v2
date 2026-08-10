"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * What a synthesis run shows while it thinks.
 *
 * A tool that returns in 200 ms needs nothing. A tool that spends eight to
 * twelve seconds on a model call needs to say what it is doing, because a
 * spinner held that long reads as broken rather than as busy — and the user
 * abandons it before the answer arrives.
 *
 * The stages are the real ones, in order, and they are time-driven because
 * that is the only signal a non-streaming request offers. The last stage does
 * not complete on its own: it holds until the response lands, so the component
 * never claims to have finished something it cannot observe.
 */

const STAGES = [
  "Applying constraints…",
  "Scoring candidates…",
  "Checking compatibility…",
  "Writing the rationale…",
] as const;

/** Nothing appears before this — a fast run should not flash a status line. */
const QUIET_MS = 3_000;
const STAGE_MS = 3_500;

export function SynthesisProgress({ className }: { className?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 500);
    return () => window.clearInterval(timer);
  }, []);

  if (elapsed < QUIET_MS) return null;

  const index = Math.min(STAGES.length - 1, Math.floor((elapsed - QUIET_MS) / STAGE_MS));

  return (
    <div
      className={cn("flex items-center gap-2.5 px-1", className)}
      role="status"
      aria-live="polite"
    >
      <span className="flex gap-1" aria-hidden>
        {STAGES.map((stage, position) => (
          <span
            key={stage}
            className={cn(
              "h-1 w-6 rounded-full transition-colors",
              position < index && "bg-fg-muted",
              position === index && "animate-pulse bg-forge",
              position > index && "bg-line",
            )}
          />
        ))}
      </span>
      <span className="text-xs text-fg-muted">{STAGES[index]}</span>
    </div>
  );
}
