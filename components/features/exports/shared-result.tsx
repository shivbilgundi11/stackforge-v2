import { InfoIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";

import { MetricStrip, MetricTile } from "@/components/forge/metric-tile";
import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { ProvenanceChip } from "@/components/forge/provenance-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SharePayload } from "@/lib/api/exports";
import { cn } from "@/lib/utils";

/**
 * The body of a shared result.
 *
 * A server component with no interactivity at all — no copy buttons, no
 * re-run, no drill-in. The reader is not the owner and every affordance that
 * suggests otherwise is a dead end for them.
 *
 * Provenance and warnings are both rendered. That is the point of sharing
 * through the product rather than pasting a screenshot: the figures arrive
 * with the dates their sources were verified, and a deprecated component is
 * still flagged for the person who will actually implement it.
 */

const WARNING_STYLES = {
  critical: { icon: OctagonAlertIcon, className: "border-danger/40 bg-danger-quiet text-danger" },
  warning: {
    icon: TriangleAlertIcon,
    className: "border-warning/40 bg-warning-quiet text-warning",
  },
  info: { icon: InfoIcon, className: "border-line bg-surface-2 text-fg-muted" },
} as const;

type ProvenanceSource = {
  name: string;
  url: string;
  last_verified_at: string;
};

export function SharedResult({ payload }: { payload: SharePayload }) {
  // Every block below has a server-side default, so the generated types make
  // them optional. Defaulted rather than asserted: a stack has no `tables` and
  // an artifact share has no `metrics`, and both are ordinary.
  const allMetrics = payload.metrics ?? {};
  const tables = payload.tables ?? {};
  const artifacts = payload.artifacts ?? [];
  const warnings = payload.warnings ?? [];

  const metrics = Object.entries(allMetrics).filter(
    ([key]) => !["summary", "rationale", "confidence"].includes(key),
  );
  const prose = ["summary", "rationale"]
    .map((key) => allMetrics[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const sources = (payload.provenance?.["sources"] ?? []) as ProvenanceSource[];

  return (
    <div className="flex flex-col gap-5">
      {prose.length > 0 ? (
        <div className="flex flex-col gap-3">
          {prose.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-fg">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <MetricStrip columns={metrics.length >= 4 ? 4 : 3}>
          {metrics.slice(0, 8).map(([key, value]) => (
            <MetricTile key={key} label={humanise(key)} value={String(value)} />
          ))}
        </MetricStrip>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {warnings.map((warning, index) => {
            const level = String(warning["level"] ?? "info") as keyof typeof WARNING_STYLES;
            const style = WARNING_STYLES[level] ?? WARNING_STYLES.info;
            const Icon = style.icon;
            return (
              <li
                key={index}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs leading-relaxed",
                  style.className,
                )}
              >
                <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>{String(warning["message"] ?? "")}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {Object.entries(tables).map(([name, rows]) =>
        rows.length === 0 ? null : (
          <Panel key={name}>
            <PanelHeader title={humanise(name)} />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(rows[0]!).map((column) => (
                      <TableHead key={column}>{humanise(column)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      {Object.keys(rows[0]!).map((column) => (
                        <TableCell key={column}>{String(row[column] ?? "—")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        ),
      )}

      {artifacts.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Generated files"
            description="The files this result produced, exactly as the author saw them."
          />
          <PanelBody className="flex flex-col gap-4">
            {artifacts.map((artifact, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <p className="font-mono text-[11px] text-fg-muted">
                  {String(artifact["filename"] ?? "file")}
                </p>
                <pre className="overflow-x-auto rounded-md border border-line bg-surface-2/60 p-3 font-mono text-[11px] leading-relaxed text-fg">
                  {String(artifact["content"] ?? "")}
                </pre>
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      {sources.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <ProvenanceChip variant="computed" />
          {sources.map((source) => (
            <ProvenanceChip
              key={source.url}
              variant="verified"
              verifiedAt={source.last_verified_at}
              source={{ name: source.name, url: source.url }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function humanise(key: string): string {
  const spaced = key.replaceAll("_", " ").replaceAll("-", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
