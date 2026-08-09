"use client";

import { HistoryIcon } from "lucide-react";
import Link from "next/link";

import { Panel, PanelHeader } from "@/components/forge/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentRuns } from "@/lib/api/hooks";
import { duration, relativeAge } from "@/lib/format";
import { getTool, toolHref } from "@/lib/tools/registry";

/**
 * The caller's recent runs for one workflow.
 *
 * Each entry links back to the tool with `?run=<id>`, which rehydrates both
 * the inputs and the result. Without that the feed would be a list of things
 * you did with no way to see any of them — which is why the previous build's
 * history was ignored.
 *
 * Anonymous callers have history too: runs are attributed to the anonymous
 * session cookie, so this is populated before anyone signs in.
 */
export function RecentRuns({ workflow, limit = 5 }: { workflow: string; limit?: number }) {
  const { data, isPending, isError } = useRecentRuns({ workflow, limit });

  // An empty feed is the normal first-visit state, and a panel saying "no
  // history" above a grid of tools the user has not run yet is noise. Errors
  // are silent for the same reason: this is a convenience, and a red box here
  // would imply the hub itself is broken.
  if (isError || (!isPending && !data?.length)) return null;

  return (
    <Panel className="mt-5" data-testid="recent-runs">
      <PanelHeader
        title="Your recent runs"
        icon={<HistoryIcon className="size-3.5" aria-hidden />}
      />

      {isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-8" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {data?.map((run) => {
            const spec = getTool(run.tool_slug);
            // A run of a tool no longer in the registry still happened. Show
            // it, unlinked, rather than dropping it and quietly shrinking the
            // user's history.
            const label = spec?.title ?? run.tool_slug;

            const body = (
              <>
                <span className="truncate text-[13px] text-fg">{label}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-fg-subtle">
                  {duration(run.duration_ms)}
                </span>
                <span className="w-16 shrink-0 text-right text-[11px] text-fg-muted">
                  {relativeAge(run.created_at)}
                </span>
              </>
            );

            return (
              <li key={run.id}>
                {spec ? (
                  <Link
                    href={`${toolHref(spec)}?run=${run.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/60"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 opacity-70">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
