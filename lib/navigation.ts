import {
  BadgeDollarSignIcon,
  BlocksIcon,
  BotIcon,
  DatabaseIcon,
  FolderIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  ScaleIcon,
  ServerIcon,
  SettingsIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * One source of truth for navigation.
 *
 * The sidebar, the command palette, breadcrumbs, hub pages, and the sitemap
 * all read from here. The previous build maintained navigation by hand in
 * several places and had no command palette at all; a new tool now appears
 * everywhere by adding one entry.
 */

export type NavTool = {
  slug: string;
  title: string;
  href: string;
  summary: string;
  /** Extra terms the palette should match on beyond the title. */
  keywords?: string[];
  tier?: "free" | "pro" | "team";
  status?: "ready" | "planned";
};

export type NavGroup = {
  id: string;
  label: string;
  eyebrow?: string;
  href: string;
  icon: LucideIcon;
  summary: string;
  /** Reserved for the intelligent layer, which gets the indigo accent. */
  intelligent?: boolean;
  tools: NavTool[];
};

const planned = { status: "planned" as const };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "architect",
    label: "Stack Architect",
    href: "/stack-architect",
    icon: SparklesIcon,
    summary: "Describe what you are building, get a ranked and scored stack.",
    intelligent: true,
    tools: [
      {
        slug: "architect-new",
        title: "New stack",
        href: "/stack-architect/new",
        summary: "Constraints in, three ranked recommendations out.",
        keywords: ["recommend", "recommendation", "design", "generate"],
        ...planned,
      },
      {
        slug: "compatibility",
        title: "Compatibility checker",
        href: "/stack-architect/compatibility",
        summary: "Score any combination of tools against each other.",
        keywords: ["compatible", "matrix", "pairs"],
        ...planned,
      },
      {
        slug: "my-stacks",
        title: "My stacks",
        href: "/stack-architect/my-stacks",
        summary: "Saved stacks, versions, and diffs.",
        keywords: ["saved", "versions"],
        ...planned,
      },
      {
        slug: "graveyard",
        title: "Tool graveyard",
        href: "/stack-architect/graveyard",
        summary: "Deprecated and not-for-production tools, with alternatives.",
        keywords: ["deprecated", "dead", "eol", "sunset"],
        ...planned,
      },
    ],
  },
  {
    id: "compare",
    label: "Compare Center",
    href: "/compare",
    icon: ScaleIcon,
    summary: "Side-by-side decisions with a recommendation and its reasoning.",
    tools: [
      {
        slug: "compare-models",
        title: "Model compare",
        href: "/compare/models",
        summary: "LLMs on cost, context, speed, and task suitability.",
        keywords: ["llm", "gpt", "claude", "gemini"],
      },
      {
        slug: "compare-vector-db",
        title: "Vector DB compare",
        href: "/compare/vector-db",
        summary: "Pinecone, Qdrant, Weaviate, Milvus, pgvector, Chroma.",
        keywords: ["pinecone", "qdrant", "pgvector", "chroma", "weaviate"],
      },
      {
        slug: "compare-stacks",
        title: "Stack compare",
        href: "/compare/stacks",
        summary: "MVP against enterprise against open-source archetypes.",
      },
      {
        slug: "compare-build-vs-buy",
        title: "Build vs buy",
        href: "/compare/build-vs-buy",
        summary: "Twelve-month cost of building against buying.",
        keywords: ["tco", "vendor"],
      },
    ],
  },
  {
    id: "cost",
    label: "Cost Planner",
    eyebrow: "WF1",
    href: "/cost",
    icon: BadgeDollarSignIcon,
    summary: "Token counts, model spend, and a monthly budget you can defend.",
    tools: [
      {
        slug: "llm-pricing",
        title: "LLM pricing calculator",
        href: "/cost/llm-pricing",
        summary: "Model spend from tokens and daily request volume.",
        keywords: ["price", "cost", "spend", "tokens"],
      },
      {
        slug: "token-calculator",
        title: "Token calculator",
        href: "/cost/token-calculator",
        summary: "Real tokenizer counts, plus which models the input fits.",
        keywords: ["tiktoken", "context", "window", "count"],
      },
      {
        slug: "embedding-cost",
        title: "Embedding cost",
        href: "/cost/embedding-cost",
        summary: "Ingestion and re-embedding cost across providers.",
        keywords: ["embed", "vector", "ingest"],
      },
      {
        slug: "budget-estimator",
        title: "Budget estimator",
        href: "/cost/budget-estimator",
        summary: "Blended monthly cost across every workload line.",
        keywords: ["monthly", "forecast", "projection"],
      },
    ],
  },
  {
    id: "rag",
    label: "RAG Planner",
    eyebrow: "WF2",
    href: "/rag",
    icon: DatabaseIcon,
    summary: "From a pile of documents to a costed, sized retrieval pipeline.",
    tools: [
      {
        slug: "chunk-estimate",
        title: "Chunk estimator",
        href: "/rag/chunk-estimate",
        summary: "Chunk counts, overlap efficiency, retrieval quality score.",
        keywords: ["chunking", "splitter", "overlap"],
        ...planned,
      },
      {
        slug: "vectordb-estimate",
        title: "Vector DB sizing",
        href: "/rag/vectordb-estimate",
        summary: "Storage and index overhead by index type and provider.",
        keywords: ["hnsw", "ivf", "storage", "index"],
        ...planned,
      },
      {
        slug: "pdf-tokens",
        title: "PDF token estimator",
        href: "/rag/pdf-tokens",
        summary: "Upload a document, get tokens, chunks, and ingestion cost.",
        keywords: ["upload", "document", "extract"],
        ...planned,
      },
      {
        slug: "pipeline-cost",
        title: "Pipeline cost",
        href: "/rag/pipeline-cost",
        summary: "End-to-end monthly cost: ingest, retrieve, rerank, generate.",
        ...planned,
      },
      {
        slug: "rag-architecture",
        title: "Architecture generator",
        href: "/rag/architecture",
        summary: "A recommended pipeline with a diagram and a written rationale.",
        keywords: ["diagram", "mermaid", "design"],
        ...planned,
      },
    ],
  },
  {
    id: "agents",
    label: "Agent & MCP",
    eyebrow: "WF3",
    href: "/agents",
    icon: BotIcon,
    summary: "Design agent systems and generate MCP servers that actually run.",
    tools: [
      {
        slug: "mcp-config",
        title: "MCP config generator",
        href: "/agents/mcp-config",
        summary: "A complete, runnable MCP server from tool definitions.",
        keywords: ["mcp", "server", "claude desktop", "tools"],
        ...planned,
      },
      {
        slug: "agent-cost",
        title: "Agent cost calculator",
        href: "/agents/agent-cost",
        summary: "Loop cost including schema overhead and retries.",
        keywords: ["loop", "steps", "retries"],
        ...planned,
      },
      {
        slug: "workflow-plan",
        title: "Workflow planner",
        href: "/agents/workflow-plan",
        summary: "Agent topology as a DAG, with per-node cost and failure modes.",
        keywords: ["multi-agent", "dag", "orchestration"],
        ...planned,
      },
      {
        slug: "function-schema",
        title: "Function schema generator",
        href: "/agents/function-schema",
        summary: "Validated tool schemas for OpenAI, Anthropic, or MCP.",
        keywords: ["json schema", "tool calling"],
        ...planned,
      },
      {
        slug: "rate-limits",
        title: "Rate limit calculator",
        href: "/agents/rate-limits",
        summary: "Which limit binds first, and the backoff that survives it.",
        keywords: ["rpm", "tpm", "throttle", "backoff"],
        ...planned,
      },
    ],
  },
  {
    id: "infra",
    label: "Infra Planner",
    eyebrow: "WF4",
    href: "/infra",
    icon: ServerIcon,
    summary: "VRAM, GPU economics, and deployment files for self-hosting.",
    tools: [
      {
        slug: "vram-estimate",
        title: "VRAM estimator",
        href: "/infra/vram-estimate",
        summary: "Weights, KV cache, and activations across quantisations.",
        keywords: ["gpu", "memory", "quantization", "int4", "gguf", "awq"],
        ...planned,
      },
      {
        slug: "gpu-cost",
        title: "GPU cost calculator",
        href: "/infra/gpu-cost",
        summary: "Self-hosted against managed API, with the break-even volume.",
        keywords: ["a100", "h100", "runpod", "lambda"],
        ...planned,
      },
      {
        slug: "cloud-cost",
        title: "Cloud cost estimator",
        href: "/infra/cloud-cost",
        summary: "Compute, database, cache, storage, and the egress nobody budgets.",
        keywords: ["aws", "gcp", "azure", "egress"],
        ...planned,
      },
      {
        slug: "docker-compose",
        title: "Docker Compose generator",
        href: "/infra/docker-compose",
        summary: "Curated AI stack templates, not generic Compose.",
        keywords: ["docker", "compose", "ollama", "vllm"],
        ...planned,
      },
      {
        slug: "k8s-estimate",
        title: "Kubernetes sizing",
        href: "/infra/k8s-estimate",
        summary: "GPU-aware requests, limits, HPA, and node pools.",
        keywords: ["k8s", "kubernetes", "hpa", "manifest"],
        ...planned,
      },
      {
        slug: "readiness-checklist",
        title: "Production readiness",
        href: "/infra/readiness-checklist",
        summary: "A scored checklist conditioned on the stack you described.",
        keywords: ["checklist", "launch", "audit"],
        ...planned,
      },
    ],
  },
  {
    id: "roi",
    label: "ROI Calculator",
    eyebrow: "WF5",
    href: "/roi",
    icon: TrendingUpIcon,
    summary: "Turn the technical plan into a business case that survives review.",
    tools: [
      {
        slug: "model-roi",
        title: "Model ROI",
        href: "/roi/model-roi",
        summary: "Payback, twelve-month ROI, and NPV with an adoption ramp.",
        keywords: ["payback", "npv", "savings"],
        ...planned,
      },
      {
        slug: "roi-build-vs-buy",
        title: "Build vs buy",
        href: "/roi/build-vs-buy",
        summary: "Full TCO at 12, 24, and 36 months with sensitivity.",
        ...planned,
      },
      {
        slug: "hours-saved",
        title: "Hours saved",
        href: "/roi/hours-saved",
        summary: "Time reclaimed, priced at fully-loaded cost.",
        keywords: ["productivity", "fte"],
        ...planned,
      },
      {
        slug: "implementation-cost",
        title: "Implementation cost",
        href: "/roi/implementation-cost",
        summary: "Effort, infrastructure, and the contingency you will need.",
        ...planned,
      },
    ],
  },
];

export const WORKSPACE_NAV = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    summary: "Recent activity, saved work, and usage.",
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderIcon,
    summary: "Group related runs, stacks, and artifacts.",
    status: "planned" as const,
  },
  {
    label: "Resources",
    href: "/resources",
    icon: LibraryIcon,
    summary: "Templates, blueprints, starters, and checklists.",
    status: "planned" as const,
  },
  {
    label: "Team",
    href: "/team",
    icon: UsersIcon,
    summary: "Members, invitations, and shared work.",
    status: "planned" as const,
  },
];

export const FOOTER_NAV = [
  { label: "Settings", href: "/settings", icon: SettingsIcon, status: "planned" as const },
];

/** Flattened for the command palette and the sitemap. */
export type PaletteEntry = NavTool & {
  groupId: string;
  groupLabel: string;
  eyebrow?: string;
  icon: LucideIcon;
};

export const ALL_TOOLS: PaletteEntry[] = NAV_GROUPS.flatMap((group) =>
  group.tools.map((tool) => ({
    ...tool,
    groupId: group.id,
    groupLabel: group.label,
    eyebrow: group.eyebrow,
    icon: group.icon,
  })),
);

export function findGroupByHref(pathname: string): NavGroup | undefined {
  return NAV_GROUPS.find(
    (group) => pathname === group.href || pathname.startsWith(`${group.href}/`),
  );
}

export function findToolByHref(pathname: string): PaletteEntry | undefined {
  return ALL_TOOLS.find((tool) => tool.href === pathname);
}

export const HUB_ICONS = { BlocksIcon, GaugeIcon };
