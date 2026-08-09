import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon, FolderIcon, LayersIcon, SparklesIcon } from "lucide-react";

import { MetricStrip, MetricTile } from "@/components/forge/metric-tile";
import { PageHeader } from "@/components/forge/page-header";
import { EmptyState, Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { ProvenanceChip } from "@/components/forge/provenance-chip";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS } from "@/lib/navigation";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder until M07/M17 land. Shaped exactly like the real payload so the
// swap is a data source change, not a rewrite.
const CATALOG_VERIFIED_AT = "2026-08-06T00:00:00Z";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Recent work, saved stacks, and what today's usage looks like."
        actions={
          <Button asChild size="sm" className="bg-ember text-ember-fg hover:bg-ember-hover">
            <Link href="/stack-architect/new">
              <SparklesIcon className="size-4" />
              New stack
            </Link>
          </Button>
        }
      />

      <MetricStrip columns={4} className="mb-5">
        <MetricTile label="Tool runs today" value="0" footnote="2 of 5 remaining on Free" />
        <MetricTile label="Saved stacks" value="0" />
        <MetricTile label="Projects" value="0" footnote="Requires an account" />
        <MetricTile
          label="Models priced"
          value="47"
          footnote={
            <ProvenanceChip
              variant="verified"
              verifiedAt={CATALOG_VERIFIED_AT}
              source={{ name: "provider pricing" }}
            />
          }
        />
      </MetricStrip>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader
              title="Recent activity"
              description="Every run is logged, saved or not. Unsaved runs are kept for 30 days."
              icon={<ClockIcon className="size-4" />}
            />
            <EmptyState
              icon={<ClockIcon className="size-4" />}
              title="Nothing here yet"
              description="Run any calculator and it will appear here with its result, so you can reopen it with the inputs restored."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/cost">
                    Open Cost Planner
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </Button>
              }
            />
          </Panel>

          <Panel>
            <PanelHeader
              title="Start a workflow"
              description="Seven groups, twenty-eight tools. ⌘K reaches all of them."
              icon={<LayersIcon className="size-4" />}
            />
            <PanelBody className="grid gap-2 sm:grid-cols-2">
              {NAV_GROUPS.map((group) => (
                <Link
                  key={group.id}
                  href={group.href}
                  className="group flex items-start gap-3 rounded-md border border-line p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <span
                    className={
                      group.intelligent
                        ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-forge-quiet text-forge"
                        : "flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-muted transition-colors group-hover:bg-surface-3"
                    }
                  >
                    <group.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-fg">{group.label}</span>
                      {group.eyebrow ? (
                        <span className="font-mono text-[10px] text-fg-subtle">
                          {group.eyebrow}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-pretty text-fg-muted">
                      {group.summary}
                    </span>
                  </span>
                </Link>
              ))}
            </PanelBody>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader
              title="Saved stacks"
              icon={<LayersIcon className="size-4" />}
              actions={
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-fg-muted">
                  <Link href="/stack-architect/my-stacks">View all</Link>
                </Button>
              }
            />
            <EmptyState
              icon={<SparklesIcon className="size-4" />}
              title="No saved stacks"
              description="Describe what you are building and Stack Architect returns three ranked options with a score, a diagram, and a roadmap."
              action={
                <Button asChild size="sm" className="bg-forge text-white hover:opacity-90">
                  <Link href="/stack-architect/new">Open Stack Architect</Link>
                </Button>
              }
            />
          </Panel>

          <Panel>
            <PanelHeader title="Projects" icon={<FolderIcon className="size-4" />} />
            <EmptyState
              icon={<FolderIcon className="size-4" />}
              title="Projects need an account"
              description="Group runs, stacks, and artifacts into a project so a planning session survives the tab closing."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/signup">Create an account</Link>
                </Button>
              }
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
