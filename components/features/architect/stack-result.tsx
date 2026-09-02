"use client";

import { AlertTriangleIcon, DownloadIcon, SkullIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";

import { MermaidDiagram } from "@/components/forge/mermaid-diagram";
import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolRunResult } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

/**
 * The payoff screen.
 *
 * The one place in the product with a genuine reveal: the system spent eight
 * to twelve seconds deciding, and the result page is where that becomes
 * visible. The ring sweeps, then the panels stagger in.
 *
 * Every component row carries its graveyard status inline. A stack that
 * silently recommends a dead tool destroys the trust the whole product runs
 * on, and a footnote is where a warning goes to be unread (FR-20).
 */

type ComponentRow = {
  role: string;
  slug: string;
  name: string;
  status: string;
  status_reason: string;
  alternatives: string;
  why: string;
  self_hostable: string;
  pricing_model: string;
  docs_url: string;
};

type ScoreRow = {
  dimension: string;
  key: string;
  score: string;
  weight_pct: string;
  contribution: string;
  description: string;
};

const BURIED = new Set(["deprecated", "not_for_production", "caution"]);

/**
 * The arc sweeps from zero on mount — see the panel note above.
 *
 * The headline is printed at the engine's own precision rather than rounded.
 * The summary underneath, the breakdown rows and the alternatives all quote
 * one decimal, so rounding here is how an 84.5 stack comes to announce itself
 * as an 85 directly above its own explanation of why it scored 84.5.
 */
function ScoreRing({ score }: { score: number }) {
  const shown = Number.isInteger(score) ? String(score) : score.toFixed(1);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.min(1, Math.max(0, score / 100));

  return (
    <div className="relative size-[7.5rem] shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="size-full -rotate-90"
        role="img"
        aria-label={`Stack score ${shown} out of 100`}
      >
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="8" className="stroke-line" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-forge"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-fg tabular-nums">{shown}</span>
        <span className="text-[11px] text-fg-muted">/ 100</span>
      </div>
    </div>
  );
}

export function StackResult({ data }: { data: ToolRunResult }) {
  const components = (data.tables?.["components"] ?? []) as unknown as ComponentRow[];
  const breakdown = (data.tables?.["score_breakdown"] ?? []) as unknown as ScoreRow[];
  const alternatives = data.tables?.["alternatives"] ?? [];
  const compatibility = data.tables?.["compatibility"] ?? [];
  const exclusions = data.tables?.["exclusions"] ?? [];
  const rationale = data.tables?.["rationale"] ?? [];
  const roadmap = data.tables?.["roadmap"] ?? [];

  const [showExclusions, setShowExclusions] = useState(false);
  const diagram = data.artifacts?.find((artifact) => artifact.format === "mermaid");
  const document = data.artifacts?.find((artifact) => artifact.type === "architecture");

  if (components.length === 0) {
    return (
      <Panel>
        <PanelHeader
          icon={<AlertTriangleIcon className="size-4" aria-hidden />}
          title="No stack satisfies every constraint"
          description="Hard constraints eliminate rather than rank down, so an over-tight set leaves nothing standing. The exclusions below show which constraint removed what."
        />
        <PanelBody>
          <ExclusionTable rows={exclusions as Record<string, unknown>[]} />
        </PanelBody>
      </Panel>
    );
  }

  const score = Number(data.metrics?.["score"] ?? 0);
  const buried = components.filter((row) => BURIED.has(row.status));

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <ScoreRing score={score} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
                Recommended stack
              </span>
              {data.metrics?.["confidence"] ? (
                <Badge variant="outline">{String(data.metrics["confidence"])} confidence</Badge>
              ) : null}
              {data.ai ? (
                <Badge variant="outline">
                  <SparklesIcon className="size-3" aria-hidden /> analysed
                </Badge>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-fg">
              {String(data.metrics?.["summary"] ?? "")}
            </p>
            {data.metrics?.["rationale"] ? (
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                {String(data.metrics["rationale"])}
              </p>
            ) : null}
          </div>
        </div>
      </Panel>

      {buried.length > 0 ? (
        <Panel className="border-danger-line bg-danger-quiet/40">
          <PanelHeader
            icon={<SkullIcon className="size-4" aria-hidden />}
            title={`${buried.length} component${buried.length === 1 ? "" : "s"} flagged`}
            description="Shown on the component row, not in a footnote."
          />
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Components"
          description="One per role, with why it was chosen and its catalog status."
        />
        <PanelBody className="flex flex-col gap-2 p-3">
          {components.map((row) => (
            <div
              key={row.slug}
              className={cn(
                "rounded-md border px-3 py-2.5",
                BURIED.has(row.status) ? "border-danger-line bg-danger-quiet/30" : "border-line",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] tracking-[0.05em] text-fg-muted uppercase">
                  {row.role}
                </span>
                <span className="text-sm font-medium text-fg">{row.name}</span>
                <Badge variant={BURIED.has(row.status) ? "destructive" : "outline"}>
                  {row.status}
                </Badge>
                <span className="ml-auto text-[11px] text-fg-muted">
                  {row.self_hostable === "yes" ? "self-hostable" : "managed only"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{row.why}</p>
              {BURIED.has(row.status) && row.status_reason ? (
                <p className="mt-1.5 text-xs leading-relaxed text-danger">
                  {row.status_reason}
                  {row.alternatives ? ` Consider ${row.alternatives}.` : ""}
                </p>
              ) : null}
            </div>
          ))}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Score breakdown"
          description="Ten weighted dimensions. The contributions sum to the headline, so the number is checkable."
        />
        <PanelBody className="flex flex-col gap-2">
          {breakdown.map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="w-44 shrink-0 truncate text-xs text-fg" title={row.description}>
                {row.dimension}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-forge"
                  style={{ width: `${Math.min(100, Number(row.score) * 10)}%` }}
                />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] text-fg tabular-nums">
                {row.score}
              </span>
              <span className="w-12 shrink-0 text-right text-[11px] text-fg-muted tabular-nums">
                {row.weight_pct}%
              </span>
            </div>
          ))}
        </PanelBody>
      </Panel>

      {diagram ? (
        <Panel>
          <PanelHeader
            title="Architecture"
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => downloadText(diagram.filename, diagram.content)}
              >
                <DownloadIcon className="size-3.5" aria-hidden />
                Diagram
              </Button>
            }
          />
          {/*
            Rendered rather than shown as source. The stack's shape is the one
            thing on this page a reader takes in at a glance, and Mermaid
            source is the one thing on it they cannot. The component keeps the
            source in the DOM and brings it back if the parse fails, so a
            broken diagram still leaves something to paste elsewhere — and the
            download button hands over the `.mmd` either way.
          */}
          <PanelBody className="p-0">
            <MermaidDiagram chart={diagram.content} />
          </PanelBody>
        </Panel>
      ) : null}

      {compatibility.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Compatibility"
            description="Scored pairwise. The stack is only as compatible as its worst pairing, so that is what the dimension above uses."
          />
          <PanelBody className="flex flex-col gap-1.5">
            {(compatibility as Record<string, unknown>[]).map((row, index) => (
              <div key={index} className="flex items-center gap-3 text-xs">
                <span className="flex-1 truncate text-fg">{String(row["pair"])}</span>
                {/* Value plus word, never colour alone (M04). */}
                <span className="font-mono text-fg tabular-nums">{String(row["score"])}</span>
                <Badge variant="outline">{String(row["status"])}</Badge>
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      {rationale.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Trade-offs"
            description="What this choice costs, and when to switch."
          />
          <PanelBody className="flex flex-col gap-2">
            {(rationale as Record<string, unknown>[]).map((row, index) => (
              <div key={index} className="flex gap-2 text-xs leading-relaxed">
                <Badge variant="outline" className="h-fit shrink-0">
                  {String(row["kind"]) === "switch_when" ? "switch when" : "trade-off"}
                </Badge>
                <span className="text-fg-muted">{String(row["text"])}</span>
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      {roadmap.length > 0 ? (
        <Panel>
          <PanelHeader title="Implementation roadmap" description="Ordered by dependency." />
          <PanelBody className="flex flex-col gap-2">
            {(roadmap as Record<string, unknown>[]).map((step, index) => (
              <div key={index} className="rounded-sm border border-line px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-fg-muted">{index + 1}</span>
                  <span className="text-xs font-medium text-fg">{String(step["title"])}</span>
                  <span className="ml-auto text-[11px] text-fg-muted">
                    {String(step["effort"] ?? "")}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  {String(step["detail"] ?? "")}
                </p>
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      {alternatives.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Alternatives"
            description="Ranks two and three, and what each one trades for the points it gives up."
          />
          <PanelBody className="flex flex-col gap-2">
            {(alternatives as Record<string, unknown>[]).map((row, index) => (
              <div key={index} className="rounded-sm border border-line px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">rank {String(row["rank"])}</Badge>
                  <span className="font-mono text-fg tabular-nums">{String(row["score"])}</span>
                  <span className="ml-auto text-fg-muted">
                    strongest: {String(row["strongest"])}
                  </span>
                </div>
                <p className="mt-1 text-fg-muted">{String(row["components"])}</p>
                <p className="mt-1 text-fg-muted">Weakest: {String(row["weakest"])}</p>
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title={`${exclusions.length} tools excluded`}
          description="Hard constraints eliminate rather than rank down. A recommendation missing the tool you expected reads as broken unless it says why."
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowExclusions((open) => !open)}
              aria-expanded={showExclusions}
            >
              {showExclusions ? "Hide" : "Show"}
            </Button>
          }
        />
        {showExclusions ? (
          <PanelBody>
            <ExclusionTable rows={exclusions as Record<string, unknown>[]} />
          </PanelBody>
        ) : null}
      </Panel>

      {document ? (
        <Panel>
          <PanelHeader
            title="Architecture document"
            description="Everything above, in one file. Generated from the same rows this page renders."
            actions={
              <Button
                type="button"
                size="sm"
                onClick={() => downloadText(document.filename, document.content)}
              >
                <DownloadIcon className="size-3.5" aria-hidden />
                Download
              </Button>
            }
          />
        </Panel>
      ) : null}
    </div>
  );
}

function ExclusionTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-fg-muted">Nothing was excluded by a constraint.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {rows.slice(0, 60).map((row, index) => (
        <div key={index} className="flex gap-2 text-xs">
          <Badge variant="outline" className="h-fit shrink-0">
            {String(row["constraint"])}
          </Badge>
          <span className="text-fg">{String(row["tool"])}</span>
          <span className="text-fg-muted">— {String(row["reason"])}</span>
        </div>
      ))}
    </div>
  );
}

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
