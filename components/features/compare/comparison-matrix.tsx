"use client";

import { ArrowRightIcon, FlagIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { ProvenanceChip } from "@/components/forge/provenance-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { flagCatalogEntry } from "@/lib/api/catalog";
import type { ToolRunResult } from "@/lib/api/tools";
import { cn } from "@/lib/utils";

/**
 * The comparison result.
 *
 * The escape hatch's first real user, and a fair test of it: a comparison
 * matrix is not a table, a chart, or a metric strip, and forcing it into one
 * would have produced something worse than all three. It keeps the form, the
 * mutation, error mapping, quota handling, provenance, and the export slot —
 * only the rendering is bespoke.
 *
 * All four P1 comparisons render through this one component, because they
 * share one output contract.
 */

type MatrixRow = {
  criterion: string;
  label: string;
  description?: string;
  weight: number;
  unit?: string | null;
  [optionId: string]: unknown;
};

type OptionRow = {
  id: string;
  name: string;
  total_score: number;
  rank: number;
  is_winner: boolean;
  status?: string;
  components?: string[];
  last_verified_at?: string;
  provenance_variant?: string;
  [key: string]: unknown;
};

type RationaleRow = { kind: "why" | "tradeoff" | "switch_when"; text: string };

export function ComparisonMatrix({ data }: { data: ToolRunResult }) {
  const options = (data.tables?.["options"] ?? []) as unknown as OptionRow[];
  const matrix = (data.tables?.["matrix"] ?? []) as unknown as MatrixRow[];
  const rationale = (data.tables?.["rationale"] ?? []) as unknown as RationaleRow[];
  const sensitivity = data.tables?.["sensitivity"] as Record<string, unknown>[] | undefined;

  if (options.length === 0) return null;

  const winner = options.find((option) => option.is_winner) ?? options[0];
  const why = rationale.find((row) => row.kind === "why")?.text;
  const tradeoffs = rationale.filter((row) => row.kind === "tradeoff");
  const switchWhen = rationale.filter((row) => row.kind === "switch_when");
  const confidence = String(data.metrics?.["confidence"] ?? "");

  return (
    <div className="flex flex-col gap-4">
      <WinnerBanner winner={winner} confidence={confidence} why={why} />

      <Panel>
        <PanelHeader
          title="Comparison"
          description="Criteria weighted by your stated priority. Cost is computed live, never scored."
          actions={<FlagAction data={data} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="w-[240px] px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
                  Criterion
                </th>
                {options.map((option) => (
                  <th
                    key={option.id}
                    className={cn(
                      "min-w-[150px] px-4 py-2.5 text-left align-bottom",
                      option.is_winner && "bg-ember-quiet/40",
                    )}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-fg">{option.name}</span>
                        {option.is_winner ? (
                          <TrophyIcon className="size-3 text-ember" aria-hidden />
                        ) : null}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {option.status ? (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {String(option.status).replace(/_/g, " ")}
                          </Badge>
                        ) : null}
                        <span className="text-[11px] text-fg-subtle tabular-nums">
                          {option.total_score}/100
                        </span>
                      </span>
                      {option.last_verified_at ? (
                        <ProvenanceChip
                          variant="verified"
                          verifiedAt={option.last_verified_at}
                          className="self-start"
                        />
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.criterion} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 text-left align-top">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-fg">{row.label}</span>
                      <span className="flex items-center gap-1.5">
                        {/* The weight is shown because it is the thing the
                            priority selector actually changes — hiding it
                            makes reweighting feel like magic. */}
                        <WeightBar weight={row.weight} />
                        <span className="text-[10px] text-fg-subtle tabular-nums">
                          {Math.round(row.weight * 100)}%
                        </span>
                      </span>
                      {row.description ? (
                        <span className="text-[11px] leading-relaxed text-fg-subtle">
                          {row.description}
                        </span>
                      ) : null}
                    </span>
                  </th>
                  {options.map((option) => {
                    const cell = row[option.id] as { score: number; value: string } | undefined;
                    return (
                      <td
                        key={option.id}
                        className={cn(
                          "px-4 py-3 align-top",
                          option.is_winner && "bg-ember-quiet/40",
                        )}
                      >
                        <span className="flex flex-col gap-1.5">
                          <span className="text-[13px] text-fg tabular-nums">
                            {cell?.value ?? "—"}
                          </span>
                          <ScoreBar score={cell?.score ?? 0} highlight={option.is_winner} />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {tradeoffs.length ? (
          <Panel>
            <PanelHeader title="What the winner gives up" />
            <PanelBody className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-fg-muted">
              {tradeoffs.map((row, index) => (
                <p key={index}>{row.text}</p>
              ))}
            </PanelBody>
          </Panel>
        ) : null}

        {switchWhen.length ? (
          <Panel className="border-forge-line">
            <PanelHeader
              title="When to choose differently"
              description="The part a leaderboard cannot tell you."
            />
            <PanelBody className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-fg-muted">
              {switchWhen.map((row, index) => (
                <p key={index}>{row.text}</p>
              ))}
            </PanelBody>
          </Panel>
        ) : null}
      </div>

      {sensitivity?.length ? <SensitivityTable rows={sensitivity} /> : null}

      {winner?.components?.length ? <ConvertToStack winner={winner} /> : null}
    </div>
  );
}

function WinnerBanner({
  winner,
  confidence,
  why,
}: {
  winner: OptionRow | undefined;
  confidence: string;
  why: string | undefined;
}) {
  if (!winner) return null;

  return (
    <Panel className="border-ember-line bg-ember-quiet/30">
      <div className="flex flex-col gap-2 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <TrophyIcon className="size-4 text-ember" aria-hidden />
          <span data-testid="comparison-winner" className="text-[15px] font-semibold text-fg">
            {winner.name}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              confidence === "low" && "border-warning-line text-warning",
              confidence === "high" && "border-success-line text-success",
            )}
          >
            {confidence} confidence
          </Badge>
        </div>
        {why ? (
          <p
            data-testid="comparison-rationale"
            className="text-[13px] leading-relaxed text-fg-muted"
          >
            {why}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function WeightBar({ weight }: { weight: number }) {
  return (
    <span className="inline-flex h-1 w-10 overflow-hidden rounded-full bg-surface-2">
      <span
        className="h-full rounded-full bg-fg-subtle"
        style={{ width: `${Math.min(100, weight * 300)}%` }}
      />
    </span>
  );
}

function ScoreBar({ score, highlight }: { score: number; highlight: boolean }) {
  return (
    <span className="inline-flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <span
        className={cn("h-full rounded-full", highlight ? "bg-ember" : "bg-fg-subtle/60")}
        style={{ width: `${Math.max(2, score)}%` }}
      />
    </span>
  );
}

/**
 * Build versus buy only. A single break-even number invites the reader to
 * distrust it; this is what makes the conclusion survive a board meeting.
 */
function SensitivityTable({ rows }: { rows: Record<string, unknown>[] }) {
  const flips = new Set(rows.map((row) => String(row["winner"])));

  return (
    <Panel>
      <PanelHeader
        title="Sensitivity"
        description={
          flips.size > 1
            ? "The answer flips inside the plausible range of hours and rates — treat the recommendation as conditional."
            : "The answer holds across every hour and rate combination below."
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-[0.05em] text-fg-muted uppercase">
              <th className="px-4 py-2 text-left font-medium">Build hours</th>
              <th className="px-4 py-2 text-left font-medium">Rate</th>
              <th className="px-4 py-2 text-right font-medium">Build (36m)</th>
              <th className="px-4 py-2 text-right font-medium">Buy (36m)</th>
              <th className="px-4 py-2 text-left font-medium">Winner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-line last:border-0">
                <td className="px-4 py-2 tabular-nums">{String(row["build_hours"])}</td>
                <td className="px-4 py-2 tabular-nums">${String(row["hourly_rate"])}</td>
                <td className="px-4 py-2 text-right tabular-nums">${String(row["build_36m"])}</td>
                <td className="px-4 py-2 text-right tabular-nums">${String(row["buy_36m"])}</td>
                <td className="px-4 py-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      row["winner"] === "build"
                        ? "border-forge-line text-forge"
                        : "border-ember-line text-ember",
                    )}
                  >
                    {String(row["winner"])}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ConvertToStack({ winner }: { winner: OptionRow }) {
  const components = winner.components ?? [];
  const href = `/stack-architect?components=${encodeURIComponent(components.join(","))}`;

  return (
    <Panel className="border-forge-line">
      <PanelBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">Build this stack</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {components.length} components from {winner.name}, pre-filled in Stack Architect.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={href}>
            Open in Stack Architect
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </PanelBody>
    </Panel>
  );
}

/**
 * Staleness on a comparison damages trust faster than staleness on a
 * calculator — a wrong recommendation is worse than a wrong number.
 */
function FlagAction({ data }: { data: ToolRunResult }) {
  const [sent, setSent] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={sent}
      onClick={async () => {
        try {
          await flagCatalogEntry({
            entity_type: "tool",
            entity_id: String(data.metrics?.["winner"] ?? data.run_id),
            note: `Flagged from ${data.tool_slug} (run ${data.run_id}).`,
          });
          setSent(true);
          toast.success("Flagged for editorial review. Thank you.");
        } catch {
          toast.error("Could not submit the flag. Try again.");
        }
      }}
    >
      <FlagIcon className="size-3.5" aria-hidden />
      {sent ? "Flagged" : "Looks wrong"}
    </Button>
  );
}
