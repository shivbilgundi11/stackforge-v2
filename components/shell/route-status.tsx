import Link from "next/link";
import { AlertTriangleIcon, Loader2Icon, RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The two states every route can be in besides rendering: still arriving, and
 * having failed to.
 *
 * One pair of components rather than one per segment. `loading.tsx` and
 * `error.tsx` are per-segment files by necessity — Next resolves them by
 * position, not by import — but the *contents* are the same three elements
 * every time, and a dozen hand-written copies is a dozen chances for one of
 * them to drift into a different spinner size or a different apology.
 *
 * Deliberately not skeletons. A skeleton is a promise about the shape of what
 * is coming, so a wrong one is worse than none: it reads as the page having
 * loaded badly rather than as the page still loading. Skeletons belong on the
 * few surfaces whose layout is known and stable — the app shell already has
 * one in `AuthGuard` — and a spinner is the honest default everywhere else.
 */
export function RouteSpinner({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex min-h-[50svh] flex-col items-center justify-center gap-3", className)}
    >
      <Loader2Icon className="size-5 animate-spin text-ember" aria-hidden />
      {/* Visible to a screen reader, not on screen: a spinner with the word
          "Loading" printed under it is noise on a surface that is, by
          definition, about to be replaced. */}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

/**
 * The error boundary's body.
 *
 * `reset()` re-renders the segment. It is the right first move for the common
 * case — a request that failed once — and useless for a genuine bug, which is
 * why there is always a way out of the segment beside it.
 *
 * `digest` is the only handle on a server error: the message is replaced with
 * a generic string in production, and this id is what ties what the user saw
 * to a line in the server log. Shown rather than swallowed so a support
 * conversation can start with it.
 */
export function RouteError({
  error,
  reset,
  title = "Something went wrong.",
  description = "This section failed to load. Trying again usually clears it.",
  homeHref = "/",
  homeLabel = "Go home",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center px-5 py-14">
      <div className="flex w-full max-w-[46ch] flex-col items-center text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-warning-quiet text-warning">
          <AlertTriangleIcon className="size-4.5" aria-hidden />
        </span>

        <h1 className="mt-4 text-[15.5px] font-semibold text-balance text-fg">{title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{description}</p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-fg-subtle">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" onClick={reset}>
            <RotateCwIcon className="size-3.5" aria-hidden />
            Try again
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
