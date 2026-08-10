"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  ClockIcon,
  FolderIcon,
  LayersIcon,
  SkullIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";

import { MetricStrip, MetricTile } from "@/components/forge/metric-tile";
import { EmptyState, Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/api/workspace";
import { useAuth } from "@/lib/auth/auth-provider";
import { relativeAge } from "@/lib/format";
import { qk } from "@/lib/api/query-keys";
import { getTool, TOOL_REGISTRY, toolHref } from "@/lib/tools/registry";

/**
 * The dashboard, with real rows (M17).
 *
 * M05 built the shell and the empty states; this fills them. The panel that
 * earns its place is the stale-data alert: `PRD.md` §24 makes catalog drift a
 * retention mechanic, and a mechanic that exists only as an email is one the
 * user meets in their inbox and never again.
 *
 * Signed out, none of this is fetched. The dashboard for an anonymous visitor
 * is a prompt to sign in, not seven empty panels implying something broke.
 */

const DEFAULT_QUICK_START = [
  "llm-pricing",
  "stack-architect",
  "compare-models",
  "vram-estimate",
  "chunk-estimate",
  "model-roi",
];

function titleOf(slug: string): string {
  return getTool(slug)?.title ?? slug;
}

function hrefOf(slug: string): string {
  const spec = TOOL_REGISTRY[slug];
  return spec ? toolHref(spec) : "/dashboard";
}

export function DashboardPanels() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  const { data, isPending } = useQuery({
    queryKey: qk.workspace.dashboard(),
    queryFn: getDashboard,
    enabled: signedIn,
  });

  if (!signedIn) return <SignedOut />;
  if (isPending || !data) return <Loading />;

  const quickStart = data.quick_start.length ? data.quick_start : DEFAULT_QUICK_START;

  return (
    <div className="flex flex-col gap-5">
      <MetricStrip columns={4}>
        <MetricTile
          label="Runs today"
          value={String(data.usage.today)}
          footnote={`${data.usage.total} all time`}
        />
        <MetricTile label="Saved runs" value={String(data.usage.saved)} />
        <MetricTile
          label="Projects"
          value={String(data.usage.projects)}
          footnote={
            data.usage.project_limit === 0
              ? "Not included on Free"
              : `of ${data.usage.project_limit} on ${data.plan.plan}`
          }
        />
        <MetricTile label="Saved stacks" value={String(data.saved_stacks.length)} />
      </MetricStrip>

      {data.stale_alerts.length > 0 ? (
        <Panel className="border-danger-line">
          <PanelHeader
            icon={<SkullIcon className="size-4" aria-hidden />}
            title={`${data.stale_alerts.length} saved stack${
              data.stale_alerts.length === 1 ? "" : "s"
            } need attention`}
            description="A component in one of your stacks has been deprecated since you saved it."
          />
          <PanelBody className="flex flex-col gap-2">
            {data.stale_alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="rounded-sm border border-danger-line px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{alert.stack_name}</span>
                  <Badge variant="destructive">{alert.tool}</Badge>
                  <Badge variant="outline">{alert.status}</Badge>
                </div>
                <p className="mt-1 leading-relaxed text-fg-muted">{alert.reason}</p>
                {alert.alternatives.length > 0 ? (
                  <p className="mt-1 text-fg-muted">Consider {alert.alternatives.join(", ")}.</p>
                ) : null}
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            icon={<ClockIcon className="size-4" aria-hidden />}
            title="Recent activity"
            description="Click any run to reopen it with its inputs restored."
          />
          <PanelBody className="p-2">
            {data.recent_runs.length === 0 ? (
              <EmptyState
                icon={<ZapIcon className="size-4" aria-hidden />}
                title="Nothing yet"
                description="Every calculation you run shows up here, saved or not."
              />
            ) : (
              <ul className="flex flex-col">
                {data.recent_runs.map((run) => (
                  <li key={run.run_id}>
                    <Link
                      href={`${hrefOf(run.tool_slug)}?run=${run.run_id}`}
                      className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-fg">
                        {titleOf(run.tool_slug)}
                      </span>
                      {run.headline ? (
                        <span className="shrink-0 font-mono text-[11px] text-fg tabular-nums">
                          {run.headline.value}
                        </span>
                      ) : null}
                      {run.saved ? <Badge variant="outline">saved</Badge> : null}
                      <span className="w-16 shrink-0 text-right text-[11px] text-fg-muted">
                        {relativeAge(run.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            icon={<LayersIcon className="size-4" aria-hidden />}
            title="Saved stacks"
            description="Scored against the catalog as it is now, not as it was when you saved."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/stack-architect/my-stacks">
                  All <ArrowRightIcon className="size-3.5" aria-hidden />
                </Link>
              </Button>
            }
          />
          <PanelBody className="p-2">
            {data.saved_stacks.length === 0 ? (
              <EmptyState
                icon={<LayersIcon className="size-4" aria-hidden />}
                title="No saved stacks"
                description="Design one in the Stack Architect and save it here."
                action={
                  <Button asChild size="sm">
                    <Link href="/stack-architect/new">Design a stack</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col">
                {data.saved_stacks.map((stack) => (
                  <li key={stack.id}>
                    <Link
                      href={`/stack-architect/my-stacks?stack=${stack.id}`}
                      className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-fg">{stack.name}</span>
                      <span className="shrink-0 text-[11px] text-fg-muted">
                        {stack.components} components · v{stack.version}
                      </span>
                      {stack.deprecated.length > 0 ? (
                        <Badge variant="destructive">{stack.deprecated.length} flagged</Badge>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            icon={<FolderIcon className="size-4" aria-hidden />}
            title="Projects"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  All <ArrowRightIcon className="size-3.5" aria-hidden />
                </Link>
              </Button>
            }
          />
          <PanelBody className="p-2">
            {data.projects.length === 0 ? (
              <EmptyState
                icon={<FolderIcon className="size-4" aria-hidden />}
                title="No projects"
                description={
                  data.usage.project_limit === 0
                    ? "Projects are available on Pro and above."
                    : "Group related runs and stacks into a project."
                }
                action={
                  data.usage.project_limit > 0 ? (
                    <Button asChild size="sm">
                      <Link href="/projects">Create one</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="flex flex-col">
                {data.projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-fg">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-fg-muted">
                        {project.items} item{project.items === 1 ? "" : "s"}
                      </span>
                      <span className="w-16 shrink-0 text-right text-[11px] text-fg-muted">
                        {relativeAge(project.updated_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            icon={<ZapIcon className="size-4" aria-hidden />}
            title="Quick start"
            description={
              data.quick_start.length ? "What you reach for most." : "A good place to begin."
            }
          />
          <PanelBody className="grid grid-cols-2 gap-2">
            {quickStart.map((slug) => (
              <Button key={slug} asChild variant="outline" size="sm" className="justify-start">
                <Link href={hrefOf(slug)}>{titleOf(slug)}</Link>
              </Button>
            ))}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function SignedOut() {
  return (
    <Panel>
      <PanelBody>
        <EmptyState
          icon={<FolderIcon className="size-4" aria-hidden />}
          title="Sign in to see your work"
          description="Every calculation you run is kept for 30 days. An account keeps the ones you choose, groups them into projects, and carries figures between tools."
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

function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <MetricStrip columns={4}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex flex-col gap-2 px-4 py-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </MetricStrip>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-md" />
        <Skeleton className="h-56 rounded-md" />
      </div>
    </div>
  );
}
