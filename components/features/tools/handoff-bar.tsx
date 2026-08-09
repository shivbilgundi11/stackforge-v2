"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

import { Panel, PanelHeader } from "@/components/forge/panel";
import type { ToolRunResult } from "@/lib/api/tools";
import { useWorkflowSession, type Handoff } from "@/lib/stores/workflow-session";
import { omitUndefined } from "@/lib/tools/handoff";
import { getTool, toolHref } from "@/lib/tools/registry";
import type { ToolSpec } from "@/lib/tools/spec";

/**
 * The row of "use this result in…" actions under a finished run.
 *
 * Prefills the destination and navigates; it deliberately does not run it.
 * Auto-running would spend a quota unit the user did not ask to spend, and
 * would hide the prefilled inputs behind a result — exactly the numbers they
 * most need to check, since they did not type them.
 */
export function HandoffBar({
  spec,
  result,
  input,
}: {
  spec: ToolSpec;
  result: ToolRunResult;
  input: Record<string, unknown>;
}) {
  const router = useRouter();
  const send = useWorkflowSession((state) => state.send);

  const handoffs = (spec.handoffs ?? []).flatMap((handoff) => {
    const target = getTool(handoff.to);
    return target ? [{ handoff, target }] : [];
  });

  if (!handoffs.length) return null;

  return (
    <Panel>
      <PanelHeader
        title="Use this result"
        icon={<ArrowUpRightIcon className="size-3.5" aria-hidden />}
      />
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {handoffs.map(({ handoff, target }) => (
          <button
            key={handoff.to}
            type="button"
            title={handoff.description}
            onClick={() => {
              send(target.slug, {
                from: spec.slug,
                fromTitle: spec.title,
                values: omitUndefined(
                  handoff.values({
                    metrics: result.metrics ?? {},
                    input,
                    targetDefaults: target.defaults ?? {},
                  }),
                ),
              });
              router.push(toolHref(target));
            }}
            className="group flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-ember/40 hover:text-fg"
          >
            {handoff.label}
            <ArrowUpRightIcon
              className="size-3.5 text-fg-subtle transition-colors group-hover:text-ember"
              aria-hidden
            />
          </button>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Read a pending handoff without consuming it.
 *
 * The destination needs these values during its first render, because they
 * are the form's `defaultValues` — resetting afterwards would flash the
 * defaults first. That makes this a render-phase call, so it must not mutate:
 * clearing the store here notifies subscribers mid-render, and firing the
 * toast here is a `setState` on the toaster while another component renders.
 * Both are React errors, and both were. Consumption happens in
 * `useHandoffConsumed` once the render has committed.
 */
export function peekHandoff(slug: string): Handoff | undefined {
  return useWorkflowSession.getState().pending[slug];
}

/**
 * Clear the handoff and tell the user where the numbers came from.
 *
 * Arriving at a form that silently disagrees with its defaults is
 * disorienting, so every tool announces it the same way. The toast carries a
 * stable id so a double-invoked effect shows one, not two.
 */
export function useHandoffConsumed(slug: string, handoff: Handoff | undefined): void {
  useEffect(() => {
    if (!handoff) return;
    useWorkflowSession.getState().take(slug);
    toast.success(`Carried over from ${handoff.fromTitle}`, { id: `handoff-${slug}` });
  }, [slug, handoff]);
}
