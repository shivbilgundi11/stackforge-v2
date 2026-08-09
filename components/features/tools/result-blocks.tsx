"use client";

import {
  ChevronDownIcon,
  CircleAlertIcon,
  DownloadIcon,
  InfoIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

// `Code` is a container that supplies the code via context; the visible
// output comes from the nested `CodeBlock`. Using `Code` alone renders an
// empty panel — which is exactly what it did.
import { Code, CodeBlock as CodeBlockView } from "@/components/animate-ui/components/animate/code";
import { MetricStrip, MetricTile } from "@/components/forge/metric-tile";
import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ToolRunResult } from "@/lib/api/tools";
import { currency, number as formatNumber } from "@/lib/format";
import type { ResultBlock } from "@/lib/tools/spec";
import { cn } from "@/lib/utils";

/**
 * Eight block renderers, driven by the spec.
 *
 * Each one reads from a fixed key of the seven-key response. None of them
 * knows which tool produced the data, which is the property that makes adding
 * tool 29 a spec file rather than a rendering change.
 */

export function ResultBlockRenderer({ block, data }: { block: ResultBlock; data: ToolRunResult }) {
  switch (block.kind) {
    case "metrics":
      return <MetricsBlock block={block} data={data} />;
    case "table":
      return <TableBlock block={block} data={data} />;
    case "chart":
      return <ChartBlock block={block} data={data} />;
    case "code":
      return <CodeBlock block={block} data={data} />;
    case "mermaid":
      return <MermaidBlock block={block} data={data} />;
    case "checklist":
      return <ChecklistBlock block={block} data={data} />;
    case "callout":
      return <CalloutBlock data={data} />;
    case "json":
      return <JsonBlock block={block} data={data} />;
  }
}

// ── metrics ──────────────────────────────────────────────────────────────────

/** Keys that should render as money rather than a bare number. */
const MONEY = /cost|price|spend|saving|revenue|tco|budget|delta/i;
const PERCENT = /_pct$|^pct|percent|ratio|share/i;
const COUNT = /tokens|requests|count|vectors|lines|months?$/i;

function humanise(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetric(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const raw = String(value);
  if (PERCENT.test(key) && !Number.isNaN(Number(raw))) return `${Number(raw).toFixed(1)}%`;
  if (MONEY.test(key) && !Number.isNaN(Number(raw))) {
    return currency(raw, { precise: Math.abs(Number(raw)) < 0.01 && Number(raw) !== 0 });
  }
  if (COUNT.test(key) && !Number.isNaN(Number(raw))) return formatNumber(raw);
  return raw;
}

function MetricsBlock({
  block,
  data,
}: {
  block: Extract<ResultBlock, { kind: "metrics" }>;
  data: ToolRunResult;
}) {
  const entries = Object.entries(data.metrics ?? {});
  const chosen = block.keys
    ? block.keys
        .map((key) => [key, data.metrics?.[key]] as const)
        .filter(([, v]) => v !== undefined)
    : entries;

  if (chosen.length === 0) return null;

  return (
    <MetricStrip columns={block.columns ?? 4}>
      {chosen.map(([key, value]) => (
        <MetricTile
          key={key}
          label={block.labels?.[key] ?? humanise(key)}
          value={formatMetric(key, value)}
          emphasis={block.emphasise === key}
        />
      ))}
    </MetricStrip>
  );
}

// ── table ────────────────────────────────────────────────────────────────────

function TableBlock({
  block,
  data,
}: {
  block: Extract<ResultBlock, { kind: "table" }>;
  data: ToolRunResult;
}) {
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null);
  const rows = useMemo(
    () => (data.tables?.[block.key] ?? []) as Record<string, unknown>[],
    [data.tables, block.key],
  );

  const columns = useMemo(
    () => (rows[0] ? Object.keys(rows[0]).filter((key) => !key.startsWith("_")) : []),
    [rows],
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const leftNum = Number(left);
      const rightNum = Number(right);
      const comparison =
        !Number.isNaN(leftNum) && !Number.isNaN(rightNum)
          ? leftNum - rightNum
          : String(left).localeCompare(String(right));
      return sort.desc ? -comparison : comparison;
    });
  }, [rows, sort]);

  const visible = block.limit ? sorted.slice(0, block.limit) : sorted;

  if (rows.length === 0) return null;

  return (
    <Panel>
      {block.title ? <PanelHeader title={block.title} description={block.description} /> : null}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-fg"
                    onClick={() =>
                      setSort((current) =>
                        current?.key === column
                          ? { key: column, desc: !current.desc }
                          : { key: column, desc: false },
                      )
                    }
                  >
                    {humanise(column)}
                    {sort?.key === column ? (
                      <ChevronDownIcon
                        className={cn("size-3", sort.desc && "rotate-180")}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => (
              <TableRow key={index} data-winner={row["is_winner"] ? "" : undefined}>
                {columns.map((column) => (
                  <TableCell
                    key={column}
                    className={cn(
                      typeof row[column] === "number" && "tabular-nums",
                      row["is_winner"] ? "font-medium" : undefined,
                    )}
                  >
                    <Cell value={row[column]} column={column} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {block.limit && rows.length > block.limit ? (
        <div className="border-t border-line px-4 py-2 text-xs text-fg-subtle">
          Showing {block.limit} of {rows.length}.
        </div>
      ) : null}
    </Panel>
  );
}

function Cell({ value, column }: { value: unknown; column: string }) {
  if (value === null || value === undefined || value === "") return <span>—</span>;
  if (typeof value === "boolean") {
    return (
      <Badge variant="outline" className={value ? "border-success-line text-success" : undefined}>
        {value ? "yes" : "no"}
      </Badge>
    );
  }
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-1">
        {value.slice(0, 6).map((item) => (
          <Badge key={String(item)} variant="secondary" className="font-normal">
            {String(item)}
          </Badge>
        ))}
      </span>
    );
  }
  const raw = String(value);
  if (PERCENT.test(column) && !Number.isNaN(Number(raw))) {
    return <span className="tabular-nums">{Number(raw).toFixed(1)}%</span>;
  }
  if (MONEY.test(column) && !Number.isNaN(Number(raw))) {
    return <span className="tabular-nums">{currency(raw)}</span>;
  }
  if (!Number.isNaN(Number(raw)) && raw.trim() !== "") {
    return <span className="tabular-nums">{formatNumber(raw)}</span>;
  }
  return <span>{raw}</span>;
}

// ── chart ────────────────────────────────────────────────────────────────────

// Design-system tokens, not shadcn aliases: `--color-accent` maps to a
// near-invisible neutral surface, which drew a chart nobody could see.
const CHART_COLORS = [
  "var(--color-ember)",
  "var(--color-forge)",
  "var(--color-success)",
  "var(--color-warning)",
];

function ChartBlock({
  block,
  data,
}: {
  block: Extract<ResultBlock, { kind: "chart" }>;
  data: ToolRunResult;
}) {
  const series = useMemo(
    () => (data.series?.[block.key] ?? []) as Record<string, unknown>[],
    [data.series, block.key],
  );
  const keys = useMemo(() => (Array.isArray(block.y) ? block.y : [block.y]), [block.y]);

  const rows = useMemo(
    () =>
      series.map((point) => {
        const next: Record<string, unknown> = { [block.x]: point[block.x] };
        for (const key of keys) next[key] = Number(point[key]);
        return next;
      }),
    [series, block.x, keys],
  );

  if (rows.length === 0) return null;

  const tick = { fill: "var(--color-fg-subtle)", fontSize: 11 };
  const formatValue = (value: number) =>
    block.format === "currency" ? currency(value) : formatNumber(value);

  const Chart = block.chart === "bar" ? BarChart : block.chart === "area" ? AreaChart : LineChart;

  return (
    <Panel>
      {block.title ? <PanelHeader title={block.title} /> : null}
      <PanelBody className="pt-4 pr-4 pl-0">
        <ResponsiveContainer width="100%" height={220}>
          <Chart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            <XAxis dataKey={block.x} tick={tick} tickLine={false} axisLine={false} />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(value: number) => formatValue(value)}
            />
            <ChartTooltip
              formatter={(value) => formatValue(Number(value))}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            {keys.length > 1 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
            {keys.map((key, index) => {
              const color = CHART_COLORS[index % CHART_COLORS.length];
              if (block.chart === "bar") {
                return <Bar key={key} dataKey={key} fill={color} radius={[3, 3, 0, 0]} />;
              }
              if (block.chart === "area") {
                return (
                  <Area
                    key={key}
                    dataKey={key}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                );
              }
              return <Line key={key} dataKey={key} stroke={color} strokeWidth={2} dot={false} />;
            })}
          </Chart>
        </ResponsiveContainer>
      </PanelBody>
    </Panel>
  );
}

// ── code / mermaid ───────────────────────────────────────────────────────────

/** Artifact format to a Shiki language id. */
function languageFor(format: string): string {
  switch (format) {
    case "markdown":
      return "markdown";
    case "json":
      return "json";
    case "yaml":
      return "yaml";
    case "csv":
      return "csv";
    case "mermaid":
      return "mermaid";
    default:
      return "text";
  }
}

function findArtifact(data: ToolRunResult, type: string) {
  return data.artifacts?.find((artifact) => artifact.type === type);
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function CodeBlock({
  block,
  data,
}: {
  block: Extract<ResultBlock, { kind: "code" }>;
  data: ToolRunResult;
}) {
  const artifact = findArtifact(data, block.artifact);
  if (!artifact) return null;

  return (
    <Panel>
      <PanelHeader
        title={block.title ?? artifact.filename}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => download(artifact.filename, artifact.content)}
          >
            <DownloadIcon className="size-3.5" aria-hidden />
            Download
          </Button>
        }
      />
      <Code code={artifact.content} className="rounded-none border-0 bg-transparent">
        <CodeBlockView
          lang={artifact.language ?? languageFor(artifact.format)}
          className="max-h-[420px]"
          writing={false}
          duration={0}
        />
      </Code>
    </Panel>
  );
}

function MermaidBlock({
  block,
  data,
}: {
  block: Extract<ResultBlock, { kind: "mermaid" }>;
  data: ToolRunResult;
}) {
  const artifact = findArtifact(data, block.artifact);
  if (!artifact) return null;

  return (
    <Panel>
      <PanelHeader
        title={block.title ?? "Diagram"}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => download(artifact.filename, artifact.content)}
          >
            <DownloadIcon className="size-3.5" aria-hidden />
            Download
          </Button>
        }
      />
      {/* Rendering is deferred to M18, which owns diagram export. Until then
          the source is shown rather than a placeholder box — a developer can
          paste it somewhere useful, which an empty frame does not allow. */}
      <Code code={artifact.content} className="rounded-none border-0 bg-transparent">
        <CodeBlockView lang="mermaid" className="max-h-[420px]" writing={false} duration={0} />
      </Code>
    </Panel>
  );
}

// ── checklist ────────────────────────────────────────────────────────────────

function ChecklistBlock({
  block,
  data,
}: {
  block: Extract<ResultBlock, { kind: "checklist" }>;
  data: ToolRunResult;
}) {
  const items = (data.tables?.[block.key] ?? []) as Record<string, unknown>[];
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (items.length === 0) return null;
  const score = Math.round((checked.size / items.length) * 100);

  return (
    <Panel>
      <PanelHeader
        title={block.title ?? "Checklist"}
        actions={
          <span className="text-xs text-fg-muted tabular-nums">
            {checked.size}/{items.length} · {score}%
          </span>
        }
      />
      <ul className="divide-y divide-line">
        {items.map((item, index) => (
          <li key={index}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 text-[13px] hover:bg-surface-2/60">
              <input
                type="checkbox"
                checked={checked.has(index)}
                className="mt-0.5 accent-[var(--color-ember)]"
                onChange={() =>
                  setChecked((current) => {
                    const next = new Set(current);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
              />
              <span className={cn("min-w-0", checked.has(index) && "text-fg-subtle line-through")}>
                {String(item["label"] ?? item["text"] ?? item["detail"] ?? "")}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── callout ──────────────────────────────────────────────────────────────────

const WARNING_STYLE = {
  info: { icon: InfoIcon, className: "border-line bg-surface-2 text-fg-muted" },
  warning: {
    icon: TriangleAlertIcon,
    className: "border-warning-line bg-warning-quiet text-warning",
  },
  critical: {
    icon: OctagonAlertIcon,
    className: "border-danger-line bg-danger-quiet text-danger",
  },
} as const;

export function CalloutBlock({ data }: { data: ToolRunResult }) {
  const warnings = data.warnings ?? [];
  if (warnings.length === 0) return null;

  // Most severe first: a critical warning under three info notes gets missed.
  const order = { critical: 0, warning: 1, info: 2 } as const;
  const sorted = [...warnings].sort(
    (a, b) => order[a.level ?? "warning"] - order[b.level ?? "warning"],
  );

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((warning, index) => {
        const style = WARNING_STYLE[warning.level ?? "warning"];
        const Icon = style.icon;
        return (
          <div
            key={index}
            role={warning.level === "critical" ? "alert" : undefined}
            className={cn(
              "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed",
              style.className,
            )}
          >
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">{warning.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── json ─────────────────────────────────────────────────────────────────────

function JsonBlock({
  block,
  data,
}: {
  block: Extract<ResultBlock, { kind: "json" }>;
  data: ToolRunResult;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Panel>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-fg-muted hover:text-fg"
        aria-expanded={open}
      >
        {block.title ?? "Raw response"}
        <span className="flex items-center gap-2 text-xs font-normal text-fg-subtle">
          <CircleAlertIcon className="size-3" aria-hidden />
          always available
          <ChevronDownIcon className={cn("size-3.5", open && "rotate-180")} aria-hidden />
        </span>
      </button>
      {open ? (
        <Code
          code={JSON.stringify(data, null, 2)}
          className="rounded-none border-0 border-t border-line bg-transparent"
        >
          <CodeBlockView lang="json" className="max-h-[420px]" writing={false} duration={0} />
        </Code>
      ) : null}
    </Panel>
  );
}
