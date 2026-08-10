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

// The `planned` spread that used to mark unbuilt tools is gone: as of M17
// every entry in NAV_GROUPS resolves to a live page. `status` stays on the
// type — WORKSPACE_NAV still uses it, and the next unbuilt surface will too.

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
        slug: "stack-architect",
        title: "Stack Architect",
        href: "/stack-architect/new",
        summary: "Constraints in, three ranked and scored recommendations out.",
        keywords: ["recommend", "recommendation", "design", "generate", "new stack"],
      },
      {
        slug: "stack-score",
        title: "Compatibility Checker",
        href: "/stack-architect/compatibility",
        summary: "Score any combination of tools against each other.",
        keywords: ["compatible", "matrix", "pairs"],
      },
      {
        slug: "my-stacks",
        title: "My stacks",
        href: "/stack-architect/my-stacks",
        summary: "Saved stacks, versions, and diffs.",
        keywords: ["saved", "versions"],
      },
      {
        slug: "graveyard",
        title: "Tool graveyard",
        href: "/stack-architect/graveyard",
        summary: "Deprecated and not-for-production tools, with alternatives.",
        keywords: ["deprecated", "dead", "eol", "sunset"],
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
        title: "Chunk Estimator",
        href: "/rag/chunk-estimate",
        summary: "Chunk counts, overlap efficiency, retrieval quality score.",
        keywords: ["chunking", "splitter", "overlap"],
      },
      {
        slug: "chunking-strategy",
        title: "Chunking Strategy",
        href: "/rag/chunking-strategy",
        summary: "Which splitter suits your documents, and what each costs.",
        keywords: ["semantic", "recursive", "markdown"],
      },
      {
        slug: "vectordb-estimate",
        title: "Vector DB Sizing",
        href: "/rag/vectordb-estimate",
        summary: "Storage and index overhead by index type and provider.",
        keywords: ["hnsw", "ivf", "storage", "index"],
      },
      {
        slug: "pdf-tokens",
        title: "PDF Token Estimator",
        href: "/rag/pdf-tokens",
        summary: "Upload a document, get tokens, chunks, and ingestion cost.",
        keywords: ["upload", "document", "extract"],
      },
      {
        slug: "pipeline-cost",
        title: "RAG Pipeline Cost",
        href: "/rag/pipeline-cost",
        summary: "End-to-end monthly cost: ingest, retrieve, rerank, generate.",
      },
      {
        slug: "rag-architecture",
        title: "RAG Architecture",
        href: "/rag/architecture",
        summary: "A recommended pipeline with a diagram and a written rationale.",
        keywords: ["diagram", "mermaid", "design"],
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
        title: "MCP Config Generator",
        href: "/agents/mcp-config",
        summary: "A complete, runnable MCP server from tool definitions.",
        keywords: ["mcp", "server", "claude desktop", "tools", "stdio"],
      },
      {
        slug: "agent-cost",
        title: "Agent Cost Calculator",
        href: "/agents/agent-cost",
        summary: "Loop cost including schema overhead and retries.",
        keywords: ["loop", "steps", "retries", "tokens"],
      },
      {
        slug: "workflow-plan",
        title: "Multi-Agent Workflow Planner",
        href: "/agents/workflow-plan",
        summary: "Agent topology as a DAG, with per-node cost and failure modes.",
        keywords: ["multi-agent", "dag", "orchestration", "supervisor", "handoff"],
      },
      {
        slug: "function-schema",
        title: "Function Schema Generator",
        href: "/agents/function-schema",
        summary: "Validated tool schemas for OpenAI, Anthropic, or MCP.",
        keywords: ["json schema", "tool calling", "function calling"],
      },
      {
        slug: "rate-limits",
        title: "API Rate Limit Calculator",
        href: "/agents/rate-limits",
        summary: "Which limit binds first, and the backoff that survives it.",
        keywords: ["rpm", "tpm", "throttle", "backoff", "429"],
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
        title: "VRAM Estimator",
        href: "/infra/vram-estimate",
        summary: "Weights, KV cache, and activations across quantisations.",
        keywords: ["gpu", "memory", "quantization", "int4", "gguf", "awq", "gqa"],
      },
      {
        slug: "gpu-cost",
        title: "GPU Cost Calculator",
        href: "/infra/gpu-cost",
        summary: "Self-hosted against managed API, with the break-even volume.",
        keywords: ["a100", "h100", "runpod", "lambda", "break-even"],
      },
      {
        slug: "cloud-cost",
        title: "Cloud Cost Estimator",
        href: "/infra/cloud-cost",
        summary: "Compute, database, cache, storage, and the egress nobody budgets.",
        keywords: ["aws", "gcp", "azure", "egress"],
      },
      {
        slug: "docker-compose",
        title: "Docker Compose Generator",
        href: "/infra/docker-compose",
        summary: "Curated AI stack templates, not generic Compose.",
        keywords: ["docker", "compose", "ollama", "vllm"],
      },
      {
        slug: "k8s-estimate",
        title: "Kubernetes Sizing",
        href: "/infra/k8s-estimate",
        summary: "GPU-aware requests, limits, HPA, and node pools.",
        keywords: ["k8s", "kubernetes", "hpa", "manifest"],
      },
      {
        slug: "readiness-checklist",
        title: "Production Readiness",
        href: "/infra/readiness-checklist",
        summary: "A scored checklist conditioned on the stack you described.",
        keywords: ["checklist", "launch", "audit"],
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
        title: "AI Model ROI",
        href: "/roi/model-roi",
        summary: "Payback, twelve-month ROI, and NPV with an adoption ramp.",
        keywords: ["payback", "npv", "savings"],
      },
      {
        slug: "roi-build-vs-buy",
        title: "Build vs Buy TCO",
        href: "/roi/build-vs-buy",
        summary: "Full TCO at 12, 24, and 36 months with sensitivity.",
        keywords: ["tco", "vendor", "escalation"],
      },
      {
        slug: "hours-saved",
        title: "Hours Saved Calculator",
        href: "/roi/hours-saved",
        summary: "Time reclaimed, priced at fully-loaded cost.",
        keywords: ["productivity", "fte"],
      },
      {
        slug: "implementation-cost",
        title: "Implementation Cost",
        href: "/roi/implementation-cost",
        summary: "Effort, infrastructure, and the contingency you will need.",
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

export const FOOTER_NAV = [{ label: "Settings", href: "/settings", icon: SettingsIcon }];

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

/**
 * Routes that genuinely need an account.
 *
 * Everything else in the shell — every tool, every hub, the catalog, the
 * graveyard — is open to anonymous visitors, because the product is built
 * around that: the backend mints an anonymous session per caller and grants
 * it 5 runs a day, tool runs are attributed to it, and the quota dialog's
 * whole anonymous branch offers "create a free account" at the point the
 * allowance runs out. Gating the tools behind a login makes all of that
 * unreachable and turns the front door into a signup wall.
 *
 * What is listed here is work that belongs to *a person*: saved projects,
 * team membership, settings, billing. There is nothing to show an anonymous
 * visitor on those pages.
 */
const ACCOUNT_ONLY_PREFIXES = [
  "/dashboard",
  "/projects",
  "/resources",
  "/team",
  // `/settings` itself is deliberately absent. Appearance is a preference
  // stored in the visitor's own browser, so gating it behind sign-in gates
  // something the account does not own — and the page already renders its
  // account sections only when there is an account. Billing is the sub-page
  // that genuinely belongs to a person.
  "/settings/billing",
] as const;

export function requiresAccount(pathname: string): boolean {
  return ACCOUNT_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function findGroupByHref(pathname: string): NavGroup | undefined {
  return NAV_GROUPS.find(
    (group) => pathname === group.href || pathname.startsWith(`${group.href}/`),
  );
}

export function findToolByHref(pathname: string): PaletteEntry | undefined {
  return ALL_TOOLS.find((tool) => tool.href === pathname);
}

export const HUB_ICONS = { BlocksIcon, GaugeIcon };
