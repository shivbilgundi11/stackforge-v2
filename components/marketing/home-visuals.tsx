import {
  BotIcon,
  BrainIcon,
  CheckIcon,
  CloudIcon,
  CpuIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileTextIcon,
  ImageIcon,
  LayersIcon,
  ListChecksIcon,
  SearchIcon,
  ServerIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The small figures that sit inside the home-page cards.
 *
 * ## What these are, and what they are not
 *
 * Each one is a diagram of the thing the card beside it describes — the
 * constraint list that eliminates options, the four files you leave with, the
 * three stages of a RAG pipeline. They are drawn in DOM rather than captured,
 * so they follow the theme, stay sharp at any density, and cost no image
 * bytes.
 *
 * They are **not** product screenshots and must never be read as one. The
 * page has exactly two places that claim to show real output — the hero shot
 * and the worked example — and both use `ProductShot`, which is a capture of
 * the running app. Everything in this file is an illustration of a mechanism,
 * and it is drawn in a flatter register on purpose so the difference is
 * visible rather than asserted: no window chrome, no cursor, no fake data
 * dense enough to be mistaken for a result.
 *
 * The figures repeat values that appear in the running copy beside them —
 * 1,952 pairs, $2,042, 85.0 — and never introduce a number the copy does not
 * already support. A figure invented for an illustration is a claim, and Q-02
 * applies to it exactly as it applies to a sentence.
 *
 * All of it is `aria-hidden`: the card's own text carries the meaning, and a
 * screen reader walking a decorative bar chart hears a list of numbers with
 * nothing to attach them to.
 */

/* ── shared atoms ──────────────────────────────────────────────────────── */

/** The white panel every figure is drawn on. */
function Frame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-lg border border-line bg-surface/80 p-3.5 shadow-[var(--shadow-panel)] backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A caption above a figure, in the product's own label style. */
function FrameLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <span className="text-[11.5px] font-semibold text-fg">{children}</span>
      {right}
    </div>
  );
}

/** A named chip with an icon — stands in for a vendor mark. */
function Chip({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[11.5px] font-medium text-fg shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      {Icon ? <Icon className="size-3 text-fg-muted" /> : null}
      {children}
    </span>
  );
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
      <span
        className={cn("block h-full rounded-full bg-tone", className)}
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

function Tick() {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-[5px] bg-tone text-white">
      <CheckIcon className="size-2.5" strokeWidth={3} />
    </span>
  );
}

/* ── section 2 · the problem ───────────────────────────────────────────── */

/** An invoice landing after the fact, with the total that was the surprise. */
export function InvoiceVisual({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <Frame className="rotate-[-3deg]">
        <FrameLabel>Cloud invoice</FrameLabel>
        <div className="flex flex-col gap-2">
          {[70, 55, 62].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-surface-3" />
              <span className="h-1.5 rounded-full bg-surface-3" style={{ width: `${w}%` }} />
              <span className="ml-auto text-[10px] text-fg-subtle">$</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md bg-danger-quiet px-2.5 py-2">
          <span className="font-mono text-[17px] font-semibold text-danger tabular-nums">
            $4,870
          </span>
          <TriangleAlertIcon className="size-4 text-danger" />
        </div>
      </Frame>
      <div className="absolute -top-2 -right-1 flex gap-1.5">
        {[CloudIcon, ServerIcon, DatabaseIcon].map((Icon, i) => (
          <span
            key={i}
            className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted shadow-[var(--shadow-panel)]"
          >
            <Icon className="size-3.5" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** The turnover: more names than anyone is tracking by hand. */
export function LandscapeVisual({ className }: { className?: string }) {
  const names = ["OpenAI", "Anthropic", "Llama", "LangChain", "Pinecone", "Qdrant"];
  return (
    <div aria-hidden className={cn("relative flex flex-wrap gap-1.5", className)}>
      {names.map((name, i) => (
        <Chip
          key={name}
          className={cn(i % 3 === 1 && "ml-4", i % 3 === 2 && "ml-2")}
          icon={i % 2 === 0 ? SparklesIcon : DatabaseIcon}
        >
          {name}
        </Chip>
      ))}
      <span className="mt-1 w-full rounded-md bg-info-quiet px-2 py-1 text-center text-[11px] font-medium text-info">
        New models every week
      </span>
    </div>
  );
}

/** Decisions scattered across tools, with nothing to hand anyone. */
export function ScatteredVisual({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <div className="mb-2 flex justify-end gap-1.5">
        {[FileTextIcon, ListChecksIcon, ImageIcon].map((Icon, i) => (
          <span
            key={i}
            className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted shadow-[var(--shadow-panel)]"
          >
            <Icon className="size-4" />
          </span>
        ))}
      </div>
      <Frame className="rotate-[2deg]">
        <FrameLabel>Architecture?</FrameLabel>
        <div className="flex flex-col gap-1.5">
          {[100, 82, 90, 60].map((w, i) => (
            <span key={i} className="h-1.5 rounded-full bg-surface-3" style={{ width: `${w}%` }} />
          ))}
        </div>
      </Frame>
    </div>
  );
}

/* ── section 3 · how it works ──────────────────────────────────────────── */

export function DescribeVisual() {
  return (
    <Frame>
      <FrameLabel>Describe your AI system</FrameLabel>
      <p className="rounded-md border border-line bg-surface-inset p-2.5 text-[11.5px] leading-relaxed text-fg-muted">
        Build a RAG system for internal documents with 10K users, under $2,000/month, low latency,
        and deploy on AWS.
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {["RAG", "Production", "AWS"].map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-surface-2 px-1.5 py-1 text-[10.5px] font-medium text-fg-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </Frame>
  );
}

/** Four hard limits, and the count they take the field down to. */
export function ConstraintsVisual({ pairs }: { pairs: string }) {
  return (
    <Frame>
      <FrameLabel>Set your constraints</FrameLabel>
      <ul className="flex flex-col gap-1.5">
        {[
          ["Budget ≤ $2,000/month", true],
          ["Deploy on AWS", true],
          ["No data leaves region", true],
          ["Low latency (< 500ms)", true],
          ["Preferred tools", false],
        ].map(([label, on]) => (
          <li key={label as string} className="flex items-center gap-2 text-[11.5px]">
            {on ? (
              <Tick />
            ) : (
              <span className="size-4 shrink-0 rounded-[5px] border border-line-strong" />
            )}
            <span className={on ? "text-fg" : "text-fg-subtle"}>{label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-md border border-line bg-surface-2 px-2.5 py-2 text-center">
        <span className="font-mono text-[15px] font-semibold text-fg tabular-nums">{pairs}</span>
        <span className="mt-0.5 block text-[10.5px] text-fg-subtle">→ 312 options</span>
      </div>
    </Frame>
  );
}

/** What survives, ranked — the same three stacks the engine returns. */
export function TopOptionsVisual() {
  return (
    <Frame>
      <FrameLabel right={<span className="text-[10.5px] text-tone">See all</span>}>
        Top options
      </FrameLabel>
      <ul className="flex flex-col gap-2.5">
        {[
          ["Anthropic + LangChain", 85, "bg-success"],
          ["OpenAI + LlamaIndex", 78, "bg-info"],
          ["Mistral + Haystack", 72, "bg-forge"],
        ].map(([label, score, bar]) => (
          <li key={label as string} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg">{label}</span>
            <Bar value={score as number} className={bar as string} />
            <span className="w-5 text-right font-mono text-[11px] text-fg tabular-nums">
              {score}
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** The five files, with the format each one comes out as. */
export function ArtifactsVisual() {
  return (
    <Frame>
      <FrameLabel>Generated artifacts</FrameLabel>
      <ul className="flex flex-col gap-2">
        {(
          [
            [FileTextIcon, "Architecture document", "PDF"],
            [ImageIcon, "System diagram", "PNG"],
            [ListChecksIcon, "Implementation roadmap", "PDF"],
            [LayersIcon, "docker-compose.yml", "YAML"],
            [FileCodeIcon, ".cursorrules", "TXT"],
          ] satisfies [LucideIcon, string, string][]
        ).map(([Icon, name, format]) => (
          <li key={name} className="flex items-center gap-2 text-[11.5px]">
            <Icon className="size-3.5 shrink-0 text-tone" />
            <span className="min-w-0 flex-1 truncate text-fg">{name}</span>
            <span className="font-mono text-[10px] text-fg-subtle">{format}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/* ── section 4 · why it is built this way ──────────────────────────────── */

/** Compute first, prose second — the order that lets the answer ship. */
export function RuleEngineVisual() {
  const steps: [LucideIcon, string, string][] = [
    [FileTextIcon, "Inputs", "your requirements"],
    [CpuIcon, "Rule engine", "compute"],
    [SparklesIcon, "LLM", "write explanation"],
  ];
  return (
    <div aria-hidden className="flex flex-col items-center gap-1">
      {steps.map(([Icon, title, note], i) => (
        <div key={title} className="flex w-full flex-col items-center gap-1">
          <Frame className="flex w-full items-center gap-2.5 p-2.5">
            <Icon className={cn("size-4 shrink-0", i === 1 ? "text-tone" : "text-fg-muted")} />
            <span className="text-[11.5px] font-medium text-fg">{title}</span>
            <span className="ml-auto text-[10.5px] text-fg-subtle">({note})</span>
          </Frame>
          {i < steps.length - 1 ? <span className="h-3 w-px bg-line-strong" /> : null}
        </div>
      ))}
    </div>
  );
}

/** Every price with the date it was last checked against the vendor. */
export function PriceSourceVisual({ rows }: { rows: [string, string][] }) {
  return (
    <Frame>
      <FrameLabel
        right={
          <span className="inline-flex items-center gap-1 rounded-full bg-success-quiet px-1.5 py-0.5 text-[10px] font-medium text-success">
            <CheckIcon className="size-2.5" strokeWidth={3} />
            Verified
          </span>
        }
      >
        Price source
      </FrameLabel>
      <ul className="flex flex-col gap-2">
        {rows.map(([name, date]) => (
          <li key={name} className="flex items-center gap-2 text-[11.5px]">
            <span className="flex size-5 items-center justify-center rounded border border-line bg-surface-2 text-[9px] font-semibold text-fg-muted">
              {name.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 text-fg">{name}</span>
            <span className="text-[10.5px] text-fg-subtle">Verified {date}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** Pairings, drawn as a graph — the point being that the edges are data. */
export function CompatibilityVisual() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-2">
      {["OpenAI", "Anthropic", "LangChain", "Qdrant"].map((name) => (
        <Frame key={name} className="flex items-center gap-1.5 p-2">
          <span className="size-1.5 rounded-full bg-tone" />
          <span className="truncate text-[11px] font-medium text-fg">{name}</span>
        </Frame>
      ))}
      <div className="col-span-2 rounded-md border border-dashed border-tone-line px-2 py-1.5 text-center text-[10.5px] text-fg-muted">
        scored on the worst pairing
      </div>
    </div>
  );
}

/** What a hard constraint actually did to the field. */
export function EliminationVisual() {
  return (
    <Frame>
      <FrameLabel>Your constraints</FrameLabel>
      <ul className="flex flex-col gap-1.5">
        {["Data stays in region", "Latency < 500ms", "Budget < $2,000", "No managed services"].map(
          (label) => (
            <li key={label} className="flex items-center gap-2 text-[11.5px] text-fg">
              <Tick />
              {label}
            </li>
          ),
        )}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-tone-line bg-tone-quiet px-2.5 py-2">
        <TriangleAlertIcon className="size-3.5 shrink-0 text-tone" />
        <span className="text-[10.5px] leading-tight text-fg-muted">
          27 options removed due to your constraints
        </span>
      </div>
    </Frame>
  );
}

/** A starter file, shown as a starter file. */
export function ComposeVisual() {
  const lines = [
    "services:",
    "  app:",
    "    image: buildtact/app:latest",
    "    ports:",
    '      - "8000:8000"',
    "    environment:",
    "      - MODE=production",
    "      - LOG_LEVEL=info",
  ];
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border border-line bg-surface-inset shadow-[var(--shadow-panel)]"
    >
      <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-1.5">
        <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-fg">
          docker-compose.yml
        </span>
        <span className="font-mono text-[10px] text-fg-subtle">k8s.yaml</span>
      </div>
      <pre className="overflow-hidden px-2.5 py-2 font-mono text-[10px] leading-[1.6] text-fg-muted">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-3 shrink-0 text-right text-fg-subtle/60">{i + 1}</span>
            <span className="truncate">{line}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/* ── section 6 · the stack it returned ─────────────────────────────────── */

/**
 * The headline score as a dial.
 *
 * The arc is drawn from the same number the copy states, so the two cannot
 * disagree: `value` sets both the stroke offset and the printed figure.
 */
export function ScoreDial({ value, className }: { value: number; className?: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <span aria-hidden className={cn("relative inline-flex", className)}>
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="5.5"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--success)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono text-[17px] font-semibold text-fg tabular-nums">
          {Math.round(value)}
        </span>
        <span className="mt-0.5 text-[8.5px] text-fg-subtle">/ 100</span>
      </span>
    </span>
  );
}

/* ── section 7 · workflows ─────────────────────────────────────────────── */

/** Spend, with the shape of the month under it. */
export function CostVisual() {
  const bars = [40, 30, 55, 48, 72, 45, 38, 62, 90];
  return (
    <Frame>
      <div className="flex items-baseline gap-2">
        <span className="text-[10.5px] text-fg-muted">Estimated monthly cost</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-[19px] font-semibold text-fg tabular-nums">$2,042</span>
        <span className="rounded bg-success-quiet px-1 py-px text-[10px] font-medium text-success">
          −12%
        </span>
      </div>
      <div className="mt-2.5 flex h-10 items-end gap-1">
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-sm", i % 3 === 1 ? "bg-tone-line" : "bg-surface-3")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </Frame>
  );
}

/** Three stages, which is the whole shape of a retrieval pipeline. */
export function PipelineVisual() {
  const steps: [LucideIcon, string][] = [
    [FileTextIcon, "Ingest"],
    [DatabaseIcon, "Store"],
    [SearchIcon, "Retrieve"],
  ];
  return (
    <Frame>
      <FrameLabel>RAG pipeline</FrameLabel>
      <div className="flex items-center justify-between gap-1">
        {steps.map(([Icon, label], i) => (
          <div key={label} className="flex items-center gap-1">
            <span className="flex flex-col items-center gap-1">
              <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface-2 text-tone">
                <Icon className="size-3.5" />
              </span>
              <span className="text-[10px] text-fg-muted">{label}</span>
            </span>
            {i < steps.length - 1 ? <span className="mb-4 h-px w-4 bg-line-strong" /> : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** A loop with tools hanging off it. */
export function AgentVisual() {
  return (
    <Frame>
      <div className="flex items-center gap-2">
        <span className="flex flex-col items-center gap-1">
          <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-muted">
            <UserIcon className="size-3.5" />
          </span>
          <span className="text-[10px] text-fg-muted">User</span>
        </span>
        <span className="mb-4 h-px w-3 bg-line-strong" />
        <span className="flex flex-col items-center gap-1">
          <span className="flex size-8 items-center justify-center rounded-lg border border-tone-line bg-tone-quiet text-tone">
            <BotIcon className="size-3.5" />
          </span>
          <span className="text-[10px] text-fg-muted">Agent</span>
        </span>
        <span className="mb-4 h-px w-3 bg-line-strong" />
        <span className="flex flex-1 flex-col gap-1">
          {(
            [
              [WrenchIcon, "Tools"],
              [DatabaseIcon, "MCP"],
              [ServerIcon, "Services"],
            ] satisfies [LucideIcon, string][]
          ).map(([Icon, label]) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-1 text-[10px] text-fg"
            >
              <Icon className="size-2.5 text-fg-muted" />
              {label}
            </span>
          ))}
        </span>
      </div>
    </Frame>
  );
}

/** The same workload priced three ways. */
export function DeploymentVisual() {
  return (
    <Frame>
      <FrameLabel>Deployment options</FrameLabel>
      <ul className="flex flex-col gap-2">
        {[
          ["AWS", 62, "$1,230"],
          ["GCP", 78, "$1,410"],
          ["Azure", 70, "$1,350"],
        ].map(([name, width, price]) => (
          <li key={name as string} className="flex items-center gap-2 text-[10.5px]">
            <span className="w-9 text-fg">{name}</span>
            <Bar value={width as number} />
            <span className="w-16 text-right font-mono text-fg-muted tabular-nums">
              {price} / mo
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** A curve going up and to the right, with the figure that shape produces. */
export function RoiVisual() {
  return (
    <Frame>
      <FrameLabel>3-year ROI projection</FrameLabel>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 44" className="h-11 flex-1" fill="none">
          <path
            d="M2 41 C 22 38, 38 30, 54 22 S 82 8, 98 4"
            stroke="var(--tone)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 41 C 22 38, 38 30, 54 22 S 82 8, 98 4 L98 44 L2 44 Z"
            fill="var(--tone-quiet)"
          />
          {[
            [26, 34],
            [54, 22],
            [82, 9],
          ].map(([cx, cy]) => (
            <circle key={cx} cx={cx} cy={cy} r="2.4" fill="var(--tone)" />
          ))}
        </svg>
        <span className="rounded-md bg-tone-quiet px-2 py-1.5 text-center">
          <span className="block font-mono text-[13px] font-semibold text-tone tabular-nums">
            +240%
          </span>
          <span className="block text-[9px] text-fg-muted">ROI</span>
        </span>
      </div>
    </Frame>
  );
}

/* ── shared · the layer diagram ────────────────────────────────────────── */

/**
 * Stacked planes, most abstract on top.
 *
 * Used twice — once for the three layers of the product, once for the four
 * things a stack is made of — so the shape is parameterised rather than
 * duplicated. Order is top-down as given.
 */
export function LayerStack({
  layers,
  className,
}: {
  layers: { label: string; tone: string; icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex flex-col items-center", className)}>
      {layers.map(({ label, tone, icon: Icon }, i) => (
        <div
          key={label}
          data-tone={tone}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[18px] border border-tone-line/70 bg-tone-quiet/70 px-6 py-5",
            // Each plane sits partly under the one above it. Negative margin
            // rather than absolute positioning, so the stack still has a
            // height and the annotation below it lands in the right place.
            i > 0 && "-mt-3",
          )}
          style={{
            // The planes are drawn flat and tipped back, which is what makes
            // them read as layers of one thing rather than a list of pills.
            // Skew rather than a real 3D rotation: rotateX would foreshorten
            // the label along with the plane and leave it unreadable at 12px.
            transform: `skewX(-22deg) skewY(-6deg) translateX(${i * 10}px) scaleY(0.72)`,
            width: `${100 - i * 3}%`,
          }}
        >
          <span
            className="flex items-center gap-2"
            // Undo the plane's skew on the contents only, so the label sits
            // upright on a tilted surface instead of leaning with it.
            style={{ transform: "skewY(6deg) skewX(22deg) scaleY(1.39)" }}
          >
            {Icon ? <Icon className="size-4 shrink-0 text-tone" /> : null}
            <span className="text-[12.5px] font-semibold whitespace-nowrap text-tone">{label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** A four-row checklist in a window — "your stack, resolved". */
export function StackChecklistVisual({ className }: { className?: string }) {
  const rows = [
    [BrainIcon, "forge", "72%"],
    [DatabaseIcon, "ember", "58%"],
    [LayersIcon, "success", "80%"],
    [CloudIcon, "info", "64%"],
  ] satisfies [LucideIcon, string, string][];
  return (
    <div
      aria-hidden
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-surface shadow-overlay",
        className,
      )}
    >
      <div className="flex h-7 items-center gap-1.5 border-b border-line bg-surface-2 px-3">
        <span className="size-2 rounded-full bg-danger/60" />
        <span className="size-2 rounded-full bg-warning/60" />
        <span className="size-2 rounded-full bg-success/60" />
      </div>
      <div className="p-3.5">
        <p className="mb-2.5 text-[12px] font-semibold text-fg">Your AI stack</p>
        <ul className="flex flex-col gap-2">
          {rows.map(([Icon, tone, width]) => (
            <li key={tone} data-tone={tone} className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-tone-quiet text-tone">
                <Icon className="size-3.5" />
              </span>
              <span className="h-1.5 rounded-full bg-surface-3" style={{ width }} />
              <CheckIcon className="ml-auto size-3.5 text-success" strokeWidth={3} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
