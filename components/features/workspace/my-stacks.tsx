"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, GitCompareIcon, LayersIcon, SkullIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { useState } from "react";
import toast from "react-hot-toast";

import { EmptyState, Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-provider";
import { relativeAge } from "@/lib/format";
import type { components } from "@/types/api";

/**
 * Saved stacks, their versions, and the diff between two of them.
 *
 * The score beside each stack is computed on read against today's catalog
 * (D-27), so a stack whose component was deprecated last week shows the lower
 * score and the flag here without anyone running a backfill. The diff
 * re-scores *both* versions the same way, so the delta is the user's edit
 * rather than a month of catalog drift.
 */

type Schemas = components["schemas"];
type Stack = Schemas["StackOut"];
type StackVersion = Schemas["StackVersionOut"];
type StackDiff = Schemas["StackDiffOut"];

const listStacks = () => apiFetch<Stack[]>("/api/v1/stacks");
const listVersions = (id: string) => apiFetch<StackVersion[]>(`/api/v1/stacks/${id}/versions`);
const diffVersions = (id: string, from: number, to: number) =>
  apiFetch<StackDiff>(`/api/v1/stacks/${id}/diff`, { query: { from, to } });

export function MyStacks() {
  const { status } = useAuth();
  const client = useQueryClient();
  // In the URL, not in local state: the dashboard links here as
  // `?stack=<id>`, and a deep link that lands on the list without opening the
  // stack it named is a link that does not work.
  const [selected, setSelected] = useQueryState("stack");

  const stacks = useQuery({
    queryKey: ["stacks", "list"],
    queryFn: listStacks,
    enabled: status === "authenticated",
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/v1/stacks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Stack deleted");
      void setSelected(null);
      void client.invalidateQueries({ queryKey: ["stacks", "list"] });
      void client.invalidateQueries({ queryKey: qk.workspace.dashboard() });
    },
  });

  const clone = useMutation({
    mutationFn: (id: string) => apiFetch<Stack>(`/api/v1/stacks/${id}/clone`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Cloned — the copy starts its own version history");
      void client.invalidateQueries({ queryKey: ["stacks", "list"] });
    },
  });

  if (status !== "authenticated") {
    return (
      <Panel>
        <PanelBody>
          <EmptyState
            icon={<LayersIcon className="size-4" aria-hidden />}
            title="Sign in to see your stacks"
            description="Design a stack without an account; keeping it needs one."
            action={
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            }
          />
        </PanelBody>
      </Panel>
    );
  }

  if (stacks.isPending) return <Skeleton className="h-64 rounded-md" />;

  const rows = stacks.data ?? [];
  if (rows.length === 0) {
    return (
      <Panel>
        <PanelBody>
          <EmptyState
            icon={<LayersIcon className="size-4" aria-hidden />}
            title="No saved stacks"
            description="The Stack Architect designs one from your constraints. Saving it puts it here, with a version history."
            action={
              <Button asChild size="sm">
                <Link href="/stack-architect/new">Design a stack</Link>
              </Button>
            }
          />
        </PanelBody>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          title={`${rows.length} saved stack${rows.length === 1 ? "" : "s"}`}
          description="Scores are computed against the catalog as it is now, not as it was when you saved."
        />
        <PanelBody className="flex flex-col gap-2 p-3">
          {rows.map((stack) => (
            <div
              key={stack.id}
              className={
                stack.deprecated_components.length > 0
                  ? "rounded-md border border-danger-line bg-danger-quiet/30 px-3 py-2.5"
                  : "rounded-md border border-line px-3 py-2.5"
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-fg">{stack.name}</span>
                <Badge variant="outline">v{stack.current_version}</Badge>
                <span className="font-mono text-xs text-fg tabular-nums">{stack.score}</span>
                {stack.deprecated_components.length > 0 ? (
                  <Badge variant="destructive">
                    <SkullIcon className="size-3" aria-hidden />
                    {stack.deprecated_components.join(", ")}
                  </Badge>
                ) : null}
                <span className="ml-auto text-[11px] text-fg-muted">
                  {relativeAge(stack.updated_at)}
                </span>
              </div>

              <p className="mt-1 text-xs text-fg-muted">{stack.component_slugs.join(" · ")}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void setSelected(selected === stack.id ? null : stack.id)}
                  aria-expanded={selected === stack.id}
                >
                  <GitCompareIcon className="size-3.5" aria-hidden />
                  Versions
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={clone.isPending}
                  onClick={() => clone.mutate(stack.id)}
                >
                  <CopyIcon className="size-3.5" aria-hidden />
                  Clone
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(stack.id)}
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </PanelBody>
      </Panel>

      {selected ? <VersionHistory stackId={selected} /> : null}
    </div>
  );
}

function VersionHistory({ stackId }: { stackId: string }) {
  const [pair, setPair] = useState<{ from: number; to: number } | null>(null);

  const versions = useQuery({
    queryKey: ["stacks", stackId, "versions"],
    queryFn: () => listVersions(stackId),
  });

  const diff = useQuery({
    queryKey: ["stacks", stackId, "diff", pair?.from, pair?.to],
    queryFn: () => diffVersions(stackId, pair!.from, pair!.to),
    enabled: pair !== null,
  });

  const rows = versions.data ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Version history"
        description="Every save creates a version — including a rename, so the history does not lie by omission."
        actions={
          rows.length >= 2 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setPair({ from: rows[rows.length - 1]!.version, to: rows[0]!.version })
              }
            >
              Compare first and latest
            </Button>
          ) : null
        }
      />
      <PanelBody className="flex flex-col gap-2">
        {rows.map((version) => (
          <div key={version.version} className="flex items-center gap-3 text-xs">
            <Badge variant="outline">v{version.version}</Badge>
            <span className="min-w-0 flex-1 truncate text-fg-muted">
              {version.change_summary || version.name}
            </span>
            <span className="shrink-0 text-[11px] text-fg-muted">
              {relativeAge(version.created_at)}
            </span>
          </div>
        ))}

        {diff.data ? (
          <div className="mt-2 rounded-sm border border-line px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-fg">
                v{diff.data.from_version} → v{diff.data.to_version}
              </span>
              <span className="font-mono text-fg tabular-nums">
                {diff.data.score_from} → {diff.data.score_to}
              </span>
              <Badge variant={Number(diff.data.score_delta) >= 0 ? "outline" : "destructive"}>
                {Number(diff.data.score_delta) >= 0 ? "+" : ""}
                {diff.data.score_delta}
              </Badge>
            </div>
            {diff.data.added.length > 0 ? (
              <p className="mt-1 text-fg-muted">Added: {diff.data.added.join(", ")}</p>
            ) : null}
            {diff.data.removed.length > 0 ? (
              <p className="mt-0.5 text-fg-muted">Removed: {diff.data.removed.join(", ")}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-fg-subtle">
              Both versions re-scored against today&apos;s catalog, so the delta is your edit rather
              than catalog drift.
            </p>
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
