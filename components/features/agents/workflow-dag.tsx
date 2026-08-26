"use client";

import { ArrowDownIcon, DownloadIcon, ShieldAlertIcon, WorkflowIcon } from "lucide-react";
import { useState } from "react";

import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { CalloutBlock, ProseBlock } from "@/components/features/tools/result-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolRunResult } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

/**
 * The multi-agent plan.
 *
 * Drawn from the topology tables rather than by rendering the Mermaid source,
 * for two reasons. Mermaid rendering is M18's, so a Mermaid-only result would
 * show a code block today; and a rendered diagram cannot be clicked into. The
 * nodes here open their role, model, cost, and — the part people skip — the
 * contracts on their edges. An agent system fails at its edges far more often
 * than inside its agents.
 *
 * The `.mmd` artifact still ships, so the diagram exports and drops into any
 * Markdown renderer.
 */

type NodeRow = {
  node: string;
  role: string;
  model: string;
  steps: number | string;
  tools: string;
  cost_per_task: string;
  responsibility: string;
};

type ContractRow = { from: string; to: string; contract: string };
type FailureRow = { mode: string; likelihood: string; mitigation: string };

/**
 * Assign each node a layer: one past the deepest node pointing at it.
 *
 * Iterative relaxation rather than a topological sort, bounded by the node
 * count. The topologies here are small DAGs, and a cycle — which a future
 * coordination style could introduce — settles instead of looping forever.
 */
function layerNodes(nodes: NodeRow[], edges: ContractRow[]): NodeRow[][] {
  const depth = new Map<string, number>(nodes.map((node) => [node.node, 0]));

  for (let pass = 0; pass < nodes.length; pass += 1) {
    let moved = false;
    for (const edge of edges) {
      const from = depth.get(edge.from);
      const to = depth.get(edge.to);
      if (from === undefined || to === undefined) continue;
      if (to < from + 1) {
        depth.set(edge.to, from + 1);
        moved = true;
      }
    }
    if (!moved) break;
  }

  const layers: NodeRow[][] = [];
  for (const node of nodes) {
    const level = depth.get(node.node) ?? 0;
    (layers[level] ??= []).push(node);
  }
  return layers.filter((layer) => layer && layer.length > 0);
}

export function WorkflowDag({ data }: { data: ToolRunResult }) {
  const nodes = (data.tables?.["nodes"] ?? []) as unknown as NodeRow[];
  const contracts = (data.tables?.["contracts"] ?? []) as unknown as ContractRow[];
  const failures = (data.tables?.["failure_modes"] ?? []) as unknown as FailureRow[];
  const diagram = data.artifacts?.find((artifact) => artifact.format === "mermaid");

  // Not memoised: these topologies are under a dozen nodes, and the fallbacks
  // above allocate a new array each render, so a `useMemo` here would recompute
  // every time anyway while looking like it did not.
  const layers = layerNodes(nodes, contracts);
  const [selected, setSelected] = useState<string | null>(null);

  if (nodes.length === 0) return null;

  const active = nodes.find((node) => node.node === selected) ?? null;
  const inbound = active ? contracts.filter((edge) => edge.to === active.node) : [];
  const outbound = active ? contracts.filter((edge) => edge.from === active.node) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* A bespoke result component replaces the block list wholesale, so the
          two things every other tool gets for free — its warnings and its
          written analysis — have to be asked for by name here. Leaving them
          out is how a run that paid for synthesis renders as if it never had
          any. */}
      <CalloutBlock data={data} />
      <ProseBlock
        block={{
          kind: "prose",
          keys: ["summary", "rationale", "weakest_link"],
          title: "Analysis",
          description: "The topology, costs, and contracts above are the engine's.",
        }}
        data={data}
      />
      <Panel>
        <PanelHeader
          icon={<WorkflowIcon className="size-4" aria-hidden />}
          title={`${String(data.metrics?.["topology"] ?? "")} topology`}
          description={`${nodes.length} agents · ${contracts.length} handoffs · ${String(
            data.metrics?.["cost_per_task"] ?? "",
          )} per task. Select an agent for its role, cost, and contracts.`}
          actions={
            diagram ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([diagram.content], { type: "text/plain" }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = diagram.filename;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <DownloadIcon className="size-3.5" aria-hidden />
                Diagram
              </Button>
            ) : null
          }
        />

        <PanelBody className="flex flex-col items-center gap-1 overflow-x-auto">
          {layers.map((layer, index) => (
            <div key={index} className="flex w-full flex-col items-center gap-1">
              {index > 0 ? <ArrowDownIcon className="size-3.5 text-fg-muted" aria-hidden /> : null}
              <div className="flex flex-wrap justify-center gap-2">
                {layer.map((node) => (
                  <button
                    key={node.node}
                    type="button"
                    onClick={() => setSelected(node.node === selected ? null : node.node)}
                    aria-pressed={node.node === selected}
                    className={cn(
                      "min-w-[9.5rem] rounded-md border px-3 py-2 text-left transition-colors",
                      node.node === selected
                        ? "border-fg/40 bg-surface-2"
                        : "border-line bg-surface hover:border-fg/20 hover:bg-surface-2/60",
                    )}
                  >
                    <span className="block text-xs font-medium text-fg">{node.node}</span>
                    <span className="mt-0.5 block text-[11px] text-fg-muted">{node.role}</span>
                    <span className="mt-1 block font-mono text-[11px] text-fg-muted">
                      {node.cost_per_task}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </PanelBody>
      </Panel>

      {active ? (
        <Panel>
          <PanelHeader
            title={active.node}
            description={active.responsibility}
            actions={<Badge variant="outline">{active.role}</Badge>}
          />
          <PanelBody className="flex flex-col gap-3">
            <dl className="grid gap-3 sm:grid-cols-4">
              {[
                ["Model", active.model],
                ["Steps per task", String(active.steps)],
                ["Cost per task", active.cost_per_task],
                ["Tools", active.tools],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] tracking-[0.05em] text-fg-muted uppercase">{label}</dt>
                  <dd className="mt-0.5 text-xs text-fg">{value}</dd>
                </div>
              ))}
            </dl>

            {inbound.length > 0 ? (
              <ContractList title="Receives" edges={inbound} peer={(edge) => edge.from} />
            ) : null}
            {outbound.length > 0 ? (
              <ContractList title="Sends" edges={outbound} peer={(edge) => edge.to} />
            ) : null}
          </PanelBody>
        </Panel>
      ) : null}

      {failures.length > 0 ? (
        <Panel>
          <PanelHeader
            icon={<ShieldAlertIcon className="size-4" aria-hidden />}
            title="Failure modes"
            description="Specific to this topology. A fan-out fails differently from a hierarchy, and the mitigation differs with it."
          />
          <PanelBody className="flex flex-col gap-2">
            {failures.map((failure) => (
              <div key={failure.mode} className="rounded-sm border border-line px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-fg">{failure.mode}</span>
                  <Badge variant={failure.likelihood === "high" ? "secondary" : "outline"}>
                    {failure.likelihood}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{failure.mitigation}</p>
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}

function ContractList({
  title,
  edges,
  peer,
}: {
  title: string;
  edges: ContractRow[];
  peer: (edge: ContractRow) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] tracking-[0.05em] text-fg-muted uppercase">{title}</span>
      {edges.map((edge, index) => (
        <div
          key={`${edge.from}-${edge.to}-${index}`}
          className="rounded-sm bg-surface-2/50 px-3 py-2"
        >
          <span className="text-[11px] font-medium text-fg">{peer(edge)}</span>
          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{edge.contract}</p>
        </div>
      ))}
    </div>
  );
}
