import {
  BadgeDollarSignIcon,
  BotIcon,
  DatabaseIcon,
  ScaleIcon,
  ServerIcon,
  SparklesIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Marketing copy that appears on more than one page (M22).
 *
 * Kept in one place because the home page and `/features` describe the same
 * same surfaces, and two hand-maintained descriptions of one feature drift —
 * which is how a site ends up claiming something the product stopped doing.
 *
 * **Every claim in this file has been checked against the implementation.**
 * That is Q-02, and it is a shipping requirement rather than a nicety: the
 * previous build's marketing promised LLM synthesis over a rule engine that
 * never called a model. If a sentence here cannot be traced to code that
 * runs, it does not belong in the file.
 */

export type MarketingFeature = {
  icon: LucideIcon;
  title: string;
  /** One paragraph, for the home page. */
  body: string;
  /** The specifics, for `/features`. */
  points: string[];
  /** File stem under `public/marketing/`, captured from the running product. */
  shot: string;
  alt: string;
  href: string;
  cta: string;
};

export const FEATURES: MarketingFeature[] = [
  {
    icon: SparklesIcon,
    title: "Stack Architect",
    body: "Describe the system and its constraints. Hard limits eliminate options rather than ranking them down, ten weighted dimensions score what is left, and three ranked stacks come back with the reasoning attached.",
    points: [
      "Hard constraints — data sensitivity, deployment preference — eliminate candidates outright, and the result tells you what was excluded and why.",
      "Ten weighted dimensions, whose contributions sum to the headline score, so the number can be checked rather than trusted.",
      "Three ranked stacks, each with its strongest and weakest dimension named.",
      "Pairwise compatibility across the whole stack, scored on its worst pairing rather than its average.",
      "Exports an architecture document, a diagram, and a roadmap generated from the same result the page renders.",
    ],
    shot: "stack-architect",
    alt: "Stack Architect returning a recommended stack scored 85 out of 100, with eight components, a score breakdown across ten weighted dimensions, and an architecture diagram.",
    href: "/stack-architect/new",
    cta: "Design a stack",
  },
  {
    icon: BadgeDollarSignIcon,
    title: "Cost Planner",
    body: "Real tokenizer counts rather than a characters-over-four estimate, priced against catalogued model rates. Per-request, monthly, and annual, with the tokenizer that produced the count named on the result.",
    points: [
      "Token counts from the real tokenizer for the provider, with the method named on the result — and said plainly when it is an estimate instead.",
      "Per-request, monthly, and annual spend from your own volume assumptions.",
      "Embedding cost split into first ingestion and re-embedding, which are the two figures usually collapsed into one.",
      "A blended monthly budget across every workload line, where the total is the sum of the lines you can see.",
    ],
    shot: "llm-pricing",
    alt: "The LLM pricing calculator showing cost per request, monthly and annual spend, and the token count with the tokenizer named.",
    href: "/cost/llm-pricing",
    cta: "Cost a model",
  },
  {
    icon: ScaleIcon,
    title: "Compare Center",
    body: "Models, vector databases, stack archetypes, and build-versus-buy, side by side. Reweight the criteria and the recommendation recalculates — the weights are inputs, not decoration.",
    points: [
      "Models compared on cost, context window, and task suitability, with a recommendation and its reasoning.",
      "Vector databases across the options people actually shortlist: Pinecone, Qdrant, Weaviate, Milvus, pgvector, and Chroma.",
      "Stack archetypes — MVP against enterprise against open-source — on twelve-month total cost.",
      "Build versus buy, with the assumptions visible so the argument can be had about the inputs.",
    ],
    shot: "compare-models",
    alt: "Model comparison showing several models side by side across cost, context window, and task suitability, with a recommendation.",
    href: "/compare/models",
    cta: "Compare options",
  },
  {
    icon: DatabaseIcon,
    title: "RAG Planner",
    body: "Chunking strategy, vector-database sizing by index type, and end-to-end pipeline cost with ingest, retrieval, reranking, and generation as separate lines. Ends in a diagram you can hand to someone.",
    points: [
      "Chunk counts and overlap efficiency, with a retrieval-quality score rather than a bare number.",
      "Vector storage sized by index type, because HNSW and IVF do not cost the same to hold.",
      "Pipeline cost with ingest, retrieval, reranking, and generation as separate lines.",
      "Upload a PDF and get its real token count, then carry that straight into the pipeline cost.",
      "A recommended architecture with a rendered diagram and a written rationale.",
    ],
    shot: "rag-architecture",
    alt: "The RAG architecture planner showing a recommended pipeline, a rendered diagram, and the reasoning behind each choice.",
    href: "/rag/architecture",
    cta: "Plan a pipeline",
  },
  {
    icon: BotIcon,
    title: "Agent & MCP Builder",
    body: "Define your tools and get a complete MCP server you can actually run, plus agent loop costs that include schema overhead and retries — the two lines that make agent estimates wrong when they are left out.",
    points: [
      "A complete MCP server generated from your tool definitions, downloadable as a bundle.",
      "Agent loop cost with schema overhead and retries shown separately, not folded into a total.",
      "Multi-agent topology as a DAG, with per-node cost and the failure modes named.",
      "Function-calling schemas for OpenAI, Anthropic, or MCP — the output shape actually differs per target.",
      "Rate-limit planning that says which limit binds first, and the backoff that survives it.",
    ],
    shot: "mcp-config",
    alt: "The MCP config generator showing a generated, runnable MCP server with its files listed.",
    href: "/agents/mcp-config",
    cta: "Generate a server",
  },
  {
    icon: ServerIcon,
    title: "Infra Planner",
    body: "VRAM broken into weights, KV cache, and activations across quantisations, GPU economics against managed APIs with the break-even volume, and Compose and Kubernetes files as starter templates.",
    points: [
      "VRAM split into weights, KV cache, and activations, across quantisations.",
      "Self-hosted GPU economics against a managed API, with the break-even request volume.",
      "Cloud cost with egress as its own line, which is the one most estimates forget.",
      "Docker Compose and Kubernetes output as starter templates you will edit, described that way here because that is what they are.",
      "A production-readiness checklist conditioned on the stack you described.",
    ],
    shot: "vram-estimate",
    alt: "The VRAM estimator breaking memory into weights, KV cache, and activations, and listing which GPUs fit.",
    href: "/infra/vram-estimate",
    cta: "Size the hardware",
  },
  {
    icon: TrendingUpIcon,
    title: "ROI Calculator",
    body: "The technical plan turned into a business case: payback period, twelve-month return, and net present value against an adoption ramp rather than a step change on day one.",
    points: [
      "Payback, twelve-month ROI, and NPV, modelled against a realistic adoption ramp.",
      "Build against buy at twelve, twenty-four, and thirty-six months, with sensitivity on the assumptions.",
      "Hours reclaimed priced at fully-loaded cost, not at salary.",
      "Implementation cost with contingency as its own visible line.",
    ],
    shot: "model-roi",
    alt: "The AI model ROI calculator showing payback period, twelve-month return, and net present value against an adoption ramp.",
    href: "/roi/model-roi",
    cta: "Build the case",
  },
];

/**
 * The workflow cards on the home page.
 *
 * These point at the section of `/features` that describes each surface, not
 * at the workflow hub inside the application. A visitor browsing the marketing
 * site who clicks "Cost Planner" wants to read about the Cost Planner; handing
 * them the tool swaps the page chrome for the workbench shell mid-browse.
 * Routes into the product live on the call-to-action buttons instead.
 */
export const WORKFLOWS: { icon: LucideIcon; label: string; href: string; body: string }[] = [
  {
    icon: BadgeDollarSignIcon,
    label: "Cost Planner",
    href: "/features#llm-pricing",
    body: "Token counts, model spend, and a monthly budget you can defend.",
  },
  {
    icon: DatabaseIcon,
    label: "RAG Planner",
    href: "/features#rag-architecture",
    body: "From a pile of documents to a costed, sized retrieval pipeline.",
  },
  {
    icon: BotIcon,
    label: "Agent & MCP",
    href: "/features#mcp-config",
    body: "Design agent systems and generate MCP servers that run.",
  },
  {
    icon: ServerIcon,
    label: "Infra Planner",
    href: "/features#vram-estimate",
    body: "VRAM, GPU economics, and deployment files for self-hosting.",
  },
  {
    icon: TrendingUpIcon,
    label: "ROI Calculator",
    href: "/features#model-roi",
    body: "Turn the technical plan into a business case that survives review.",
  },
];

export type FaqItem = { q: string; a: string };

/** The first four also appear on the home page. Order is load-bearing. */
export const FAQ: FaqItem[] = [
  {
    q: "Do I need an account to use it?",
    a: "No. Every tool runs without one — five runs a day anonymously, twenty-five with a free account. An account is for keeping the work, not for using the product.",
  },
  {
    q: "Where do the numbers come from?",
    a: "Vendor documentation, carried into a catalog and stamped with the date each row was last verified. Every result shows that date, so you can judge how much to trust it rather than taking it on faith.",
  },
  {
    q: "Is this a wrapper around a language model?",
    a: "No. Every figure is computed by a deterministic engine before any model is involved. Where a result is written up in prose by a model, it is badged as such — and if that model is unavailable, you still get the complete computed answer.",
  },
  {
    q: "What do I actually leave with?",
    a: "Markdown on every result, free and without an account. On Pro, the same result as PDF, JSON, YAML, or CSV, plus a bundle with the architecture document, the diagram, a starter Compose file, and .cursorrules.",
  },
  {
    q: "How accurate are the cost estimates?",
    a: "The arithmetic is exact against the inputs you give it and the prices in the catalog. What it cannot know is your real traffic — so treat the output as a defensible model of your assumptions, not a forecast. The assumptions are all visible and editable for exactly that reason.",
  },
  {
    q: "Is the generated infrastructure production-ready?",
    a: "It is a starter template. The Compose and Kubernetes output is correct and runnable as a starting point, and you will edit it before it goes anywhere near production. Anyone who tells you otherwise about generated infrastructure is selling something.",
  },
  {
    q: "What happens to my work if I do not sign up?",
    a: "Runs made anonymously are kept for thirty days and are attached to your browser session. Create an account in the same browser and they move across with you rather than being lost.",
  },
  {
    q: "Can I share a result with my team?",
    a: "Yes. Any saved result can be given a public link that opens without an account, and revoked whenever you like. On the Team plan there is a shared workspace with roles, comments, and approvals instead.",
  },
  {
    q: "Which models and tools are covered?",
    a: "The catalog is visible in the product and the counts on the home page are read from it live, so they cannot drift from what is actually there. If something you depend on is missing, the contact page is the fastest way to get it added.",
  },
  {
    q: "Do you store the documents I upload?",
    a: "The PDF token estimator reads the file to count its tokens and does not keep it. The file is not persisted after the request that produced your result.",
  },
];
