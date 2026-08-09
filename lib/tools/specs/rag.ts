import { z } from "zod";

import type { ToolSpec } from "@/lib/tools/spec";

/**
 * WF2 — RAG Planner.
 *
 * The one genuinely sequential workflow: estimate chunks, size the store,
 * cost the pipeline, then architect it. Each tool's output is the next one's
 * input, which is why the handoffs here carry more than elsewhere.
 */

const QUERY_TYPES = [
  { value: "factoid", label: "Factoid", hint: "short, fact-seeking" },
  { value: "synthesis", label: "Synthesis", hint: "reasoning across sources" },
  { value: "mixed", label: "Mixed", hint: "both" },
];

export const chunkEstimateSpec: ToolSpec = {
  slug: "chunk-estimate",
  group: "rag",
  eyebrow: "WF2",
  title: "Chunk Estimator",
  summary: "Chunk counts, duplication from overlap, and a scored retrieval quality check.",
  keywords: ["chunking", "splitter", "overlap", "retrieval", "recall"],
  endpoint: "/api/v1/tools/rag/chunk-estimate",
  tier: "free",
  input: z
    .object({
      document_count: z.number().int().min(1).max(1_000_000_000),
      avg_tokens_per_document: z.number().int().min(1).max(10_000_000),
      chunk_size: z.number().int().min(16).max(32_000),
      overlap: z.number().int().min(0).max(16_000),
      query_type: z.enum(["factoid", "synthesis", "mixed"]),
      model_id: z.string().optional(),
    })
    // Mirrors the backend rule. A splitter whose window never advances is not
    // a configuration to clamp — catching it here means the user is told
    // before they spend a run on it.
    .refine((value) => value.overlap < value.chunk_size, {
      message: "Overlap must be smaller than the chunk size.",
      path: ["overlap"],
    }),
  defaults: {
    document_count: 10_000,
    avg_tokens_per_document: 1_200,
    chunk_size: 512,
    overlap: 76,
    query_type: "mixed",
    model_id: "text-embedding-3-small",
  },
  presets: [
    {
      label: "Docs site",
      values: { document_count: 2_000, avg_tokens_per_document: 1_200, chunk_size: 512 },
    },
    {
      label: "Support corpus",
      values: { document_count: 50_000, avg_tokens_per_document: 400, chunk_size: 256 },
    },
    {
      label: "Research papers",
      values: {
        document_count: 5_000,
        avg_tokens_per_document: 12_000,
        chunk_size: 1_024,
        query_type: "synthesis",
      },
    },
  ],
  fields: [
    { kind: "number", name: "document_count", label: "Documents", span: 6, min: 1 },
    {
      kind: "number",
      name: "avg_tokens_per_document",
      label: "Average tokens",
      unit: "per doc",
      span: 6,
      min: 1,
    },
    { kind: "number", name: "chunk_size", label: "Chunk size", unit: "tokens", span: 6, min: 16 },
    {
      kind: "number",
      name: "overlap",
      label: "Overlap",
      unit: "tokens",
      span: 6,
      min: 0,
      description: "Under 10% of chunk size loses boundary context; over 30% is index bloat.",
    },
    { kind: "radio-group", name: "query_type", label: "Query type", options: QUERY_TYPES },
    {
      kind: "model-select",
      name: "model_id",
      label: "Embedding model",
      family: "embedding",
      description: "Used to check chunks fit its window, and to size the recommendation.",
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["total_chunks", "retrieval_quality", "duplication_factor", "embedded_tokens"],
        emphasise: "total_chunks",
        labels: {
          retrieval_quality: "Quality / 100",
          duplication_factor: "Duplication",
          embedded_tokens: "Tokens embedded",
        },
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "quality_factors",
        title: "What moved the score",
        description: "Every deduction, with its reason. A score without its basis is an opinion.",
      },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "vectordb-estimate",
      label: "Size the vector store",
      description: "Carry the chunk count over as the vector count.",
      values: ({ metrics }) => ({ vector_count: Number(metrics.total_chunks ?? 0) }),
    },
    {
      to: "pipeline-cost",
      label: "Cost the pipeline",
      values: ({ input }) => ({
        document_count: input.document_count,
        avg_tokens_per_document: input.avg_tokens_per_document,
        chunk_size: input.chunk_size,
        overlap: input.overlap,
      }),
    },
  ],
  relatedTools: ["chunking-strategy", "vectordb-estimate", "embedding-cost"],
};

export const vectordbEstimateSpec: ToolSpec = {
  slug: "vectordb-estimate",
  group: "rag",
  eyebrow: "WF2",
  title: "Vector DB Sizing",
  summary: "Storage with per-index-type overhead, and what each provider charges for it.",
  keywords: ["vector", "storage", "hnsw", "ivf", "index", "sizing", "pinecone", "qdrant"],
  endpoint: "/api/v1/tools/rag/vectordb-estimate",
  tier: "free",
  input: z.object({
    vector_count: z.number().int().min(1).max(10_000_000_000),
    dimensions: z.number().int().min(1).max(16_384),
    index_type: z.enum(["flat", "ivf", "hnsw"]),
    metadata_bytes_per_vector: z.number().int().min(0).max(1_000_000).optional(),
    replicas: z.number().int().min(1).max(20).optional(),
  }),
  defaults: {
    vector_count: 1_000_000,
    dimensions: 1536,
    index_type: "hnsw",
    metadata_bytes_per_vector: 200,
    replicas: 1,
  },
  fields: [
    { kind: "number", name: "vector_count", label: "Vectors", span: 6, min: 1 },
    { kind: "number", name: "dimensions", label: "Dimensions", span: 6, min: 1 },
    {
      kind: "radio-group",
      name: "index_type",
      label: "Index type",
      options: [
        { value: "hnsw", label: "HNSW", hint: "+50% memory, fast at any size" },
        { value: "ivf", label: "IVF", hint: "+10%, needs tuning" },
        { value: "flat", label: "Flat", hint: "no overhead, scans everything" },
      ],
      description:
        "Overhead is modelled per type. A flat multiplier is wrong across all three by enough to change which provider you pick.",
    },
    {
      kind: "number",
      name: "metadata_bytes_per_vector",
      label: "Metadata",
      unit: "bytes",
      span: 6,
      min: 0,
    },
    { kind: "number", name: "replicas", label: "Replicas", span: 6, min: 1 },
  ],
  submitLabel: "Size it",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["total_gb", "raw_gb", "index_overhead_gb", "bytes_per_vector"],
        emphasise: "total_gb",
        labels: {
          total_gb: "Total (GB)",
          raw_gb: "Vectors (GB)",
          index_overhead_gb: "Index (GB)",
          bytes_per_vector: "Bytes / vector",
        },
      },
      { kind: "callout" },
      { kind: "table", key: "breakdown", title: "Where the space goes" },
      {
        kind: "table",
        key: "providers",
        title: "Monthly cost by provider",
        description: "Computed at your vector count, with each plan's minimum applied.",
      },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "compare-vector-db",
      label: "Compare these databases",
      values: ({ input }) => ({
        vector_count: input.vector_count,
        dimensions: input.dimensions,
      }),
    },
  ],
  relatedTools: ["chunk-estimate", "pipeline-cost", "compare-vector-db"],
};

export const pdfTokensSpec: ToolSpec = {
  slug: "pdf-tokens",
  group: "rag",
  eyebrow: "WF2",
  title: "PDF Token Estimator",
  summary: "Upload a document to get its token count, chunk count, and ingestion cost.",
  keywords: ["pdf", "upload", "extract", "document", "ocr", "tokens"],
  endpoint: "/api/v1/tools/rag/pdf-tokens",
  tier: "free",
  input: z.object({
    file: z.instanceof(File, { message: "Choose a PDF to measure." }),
    model_id: z.string().min(1),
    chunk_size: z.number().int().min(16).max(32_000),
  }),
  // No default for `file`: an upload has no sensible initial value.
  defaults: { model_id: "text-embedding-3-small", chunk_size: 512 },
  fields: [
    {
      kind: "file",
      name: "file",
      label: "PDF",
      accept: "application/pdf",
      description:
        "Up to 25 MB. The file is read in memory and discarded — nothing is written to disk and no copy is kept.",
    },
    {
      kind: "model-select",
      name: "model_id",
      label: "Embedding model",
      family: "embedding",
      span: 6,
    },
    { kind: "number", name: "chunk_size", label: "Chunk size", unit: "tokens", span: 6, min: 16 },
  ],
  submitLabel: "Measure",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["tokens", "pages", "estimated_chunks", "ingestion_cost"],
        emphasise: "tokens",
        labels: { estimated_chunks: "Chunks", ingestion_cost: "Ingestion cost" },
      },
      { kind: "callout" },
      { kind: "table", key: "pages", title: "Per page", limit: 50 },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "chunk-estimate",
      label: "Model the whole corpus",
      description: "Use this document's length as the average across your corpus.",
      values: ({ metrics, input }) => ({
        avg_tokens_per_document: Number(metrics.tokens ?? 0),
        chunk_size: input.chunk_size,
      }),
    },
  ],
  relatedTools: ["chunk-estimate", "pipeline-cost"],
};

export const pipelineCostSpec: ToolSpec = {
  slug: "pipeline-cost",
  group: "rag",
  eyebrow: "WF2",
  title: "RAG Pipeline Cost",
  summary: "Ingestion, retrieval, reranking, and generation — every rate pulled from the catalog.",
  keywords: ["rag", "pipeline", "cost", "monthly", "rerank", "generation"],
  endpoint: "/api/v1/tools/rag/pipeline-cost",
  tier: "free",
  input: z
    .object({
      document_count: z.number().int().min(1).max(1_000_000_000),
      avg_tokens_per_document: z.number().int().min(1).max(10_000_000),
      chunk_size: z.number().int().min(16).max(32_000),
      overlap: z.number().int().min(0).max(16_000),
      reindex_per_month: z.number().min(0).max(100),
      queries_per_day: z.number().int().min(1).max(100_000_000),
      chunks_retrieved: z.number().int().min(1).max(200),
      embedding_model_id: z.string().min(1),
      generation_model_id: z.string().min(1),
      rerank_model_id: z.string().optional(),
      output_tokens: z.number().int().min(0).max(200_000).optional(),
      vector_store_monthly: z.number().min(0).optional(),
    })
    .refine((value) => value.overlap < value.chunk_size, {
      message: "Overlap must be smaller than the chunk size.",
      path: ["overlap"],
    }),
  defaults: {
    document_count: 10_000,
    avg_tokens_per_document: 1_200,
    chunk_size: 512,
    overlap: 76,
    reindex_per_month: 1,
    queries_per_day: 500,
    chunks_retrieved: 5,
    embedding_model_id: "text-embedding-3-small",
    generation_model_id: "gpt-4o-mini",
    output_tokens: 500,
    vector_store_monthly: 0,
  },
  fields: [
    { kind: "number", name: "document_count", label: "Documents", span: 6, min: 1 },
    {
      kind: "number",
      name: "avg_tokens_per_document",
      label: "Average tokens",
      unit: "per doc",
      span: 6,
      min: 1,
    },
    { kind: "number", name: "chunk_size", label: "Chunk size", span: 6, min: 16 },
    { kind: "number", name: "overlap", label: "Overlap", span: 6, min: 0 },
    { kind: "number", name: "queries_per_day", label: "Queries per day", span: 6, min: 1 },
    {
      kind: "number",
      name: "chunks_retrieved",
      label: "Chunks retrieved",
      unit: "per query",
      span: 6,
      min: 1,
    },
    {
      kind: "model-select",
      name: "embedding_model_id",
      label: "Embedding model",
      family: "embedding",
    },
    {
      kind: "model-select",
      name: "generation_model_id",
      label: "Generation model",
      family: "chat",
    },
    {
      kind: "model-select",
      name: "rerank_model_id",
      label: "Reranker",
      family: "rerank",
      description:
        "Optional. Priced in the provider's own unit — per search for Cohere, per token for Voyage and Jina.",
    },
    {
      kind: "number",
      name: "reindex_per_month",
      label: "Re-index",
      unit: "/mo",
      span: 6,
      min: 0,
      description: "How often the whole corpus is rebuilt.",
    },
    {
      kind: "currency",
      name: "vector_store_monthly",
      label: "Vector store",
      unit: "/mo",
      span: 6,
      min: 0,
      description: "From the sizing tool.",
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["monthly_cost", "cost_per_query", "ingestion_cost", "dominant_cost"],
        emphasise: "monthly_cost",
        labels: {
          cost_per_query: "Per query",
          ingestion_cost: "Ingestion (one-off)",
          dominant_cost: "Biggest line",
        },
      },
      { kind: "callout" },
      {
        kind: "chart",
        key: "composition",
        chart: "bar",
        x: "line",
        y: "cost",
        title: "Where the money goes",
        format: "currency",
      },
      { kind: "table", key: "breakdown", title: "Monthly breakdown" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "model-roi",
      label: "Build the ROI case",
      values: ({ metrics }) => ({ ai_monthly_cost: Number(metrics.monthly_cost ?? 0) }),
    },
  ],
  relatedTools: ["chunk-estimate", "vectordb-estimate", "rag-architecture"],
};

export const chunkingStrategySpec: ToolSpec = {
  slug: "chunking-strategy",
  group: "rag",
  eyebrow: "WF2",
  title: "Chunking Strategy",
  summary: "Which splitter suits your documents, and what each alternative trades away.",
  keywords: ["chunking", "strategy", "semantic", "recursive", "markdown", "splitter"],
  endpoint: "/api/v1/tools/rag/chunking-strategy",
  tier: "free",
  input: z.object({
    document_type: z.enum([
      "articles",
      "docs",
      "code",
      "support",
      "logs",
      "policy",
      "research",
      "mixed",
    ]),
    avg_tokens_per_document: z.number().int().min(1).max(10_000_000),
    query_pattern: z.enum(["factoid", "synthesis", "mixed"]),
    model_id: z.string().optional(),
  }),
  defaults: {
    document_type: "mixed",
    avg_tokens_per_document: 1_200,
    query_pattern: "mixed",
    model_id: "text-embedding-3-small",
  },
  fields: [
    {
      kind: "select",
      name: "document_type",
      label: "Document type",
      span: 6,
      options: [
        { value: "articles", label: "Articles" },
        { value: "docs", label: "Documentation" },
        { value: "code", label: "Code" },
        { value: "support", label: "Support tickets" },
        { value: "logs", label: "Logs" },
        { value: "policy", label: "Policy / legal" },
        { value: "research", label: "Research papers" },
        { value: "mixed", label: "Mixed" },
      ],
    },
    {
      kind: "number",
      name: "avg_tokens_per_document",
      label: "Average length",
      unit: "tokens",
      span: 6,
      min: 1,
    },
    { kind: "radio-group", name: "query_pattern", label: "Query pattern", options: QUERY_TYPES },
    {
      kind: "model-select",
      name: "model_id",
      label: "Embedding model",
      family: "embedding",
    },
  ],
  submitLabel: "Recommend",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["strategy", "chunk_size", "overlap", "score"],
        emphasise: "strategy",
        labels: { strategy: "Strategy", score: "Fit / 100" },
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "alternatives",
        title: "The alternatives",
        description: "What each one buys, and what it costs.",
      },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "chunk-estimate",
      label: "Estimate with these settings",
      values: ({ metrics, input }) => ({
        chunk_size: Number(metrics.chunk_size ?? 512),
        overlap: Number(metrics.overlap ?? 76),
        avg_tokens_per_document: input.avg_tokens_per_document,
      }),
    },
  ],
  relatedTools: ["chunk-estimate", "rag-architecture"],
};

export const ragArchitectureSpec: ToolSpec = {
  slug: "rag-architecture",
  path: "architecture",
  group: "rag",
  eyebrow: "WF2",
  title: "RAG Architecture",
  summary: "A costed pipeline design filtered by your real constraints, with a diagram.",
  keywords: ["architecture", "design", "pipeline", "diagram", "mermaid", "rag"],
  endpoint: "/api/v1/tools/rag/architecture",
  tier: "free",
  input: z.object({
    use_case: z.enum(["docs", "support", "code", "research", "policy", "mixed"]),
    corpus_documents: z.number().int().min(1).max(1_000_000_000),
    sensitivity: z.enum(["public", "internal", "internal-only", "restricted"]),
    latency_target_ms: z.number().int().min(50).max(60_000),
    scale: z.enum(["small", "medium", "large", "xlarge"]),
    team_skill: z.enum(["beginner", "intermediate", "advanced"]),
  }),
  defaults: {
    use_case: "docs",
    corpus_documents: 10_000,
    sensitivity: "internal",
    latency_target_ms: 2_000,
    scale: "medium",
    team_skill: "intermediate",
  },
  presets: [
    {
      label: "Internal docs bot",
      values: { use_case: "docs", corpus_documents: 5_000, sensitivity: "internal" },
    },
    {
      label: "Regulated corpus",
      description: "Nothing leaves the network",
      values: { use_case: "policy", sensitivity: "restricted", corpus_documents: 100_000 },
    },
    {
      label: "Low-latency support",
      values: { use_case: "support", latency_target_ms: 300, scale: "large" },
    },
  ],
  fields: [
    {
      kind: "select",
      name: "use_case",
      label: "Use case",
      span: 6,
      options: [
        { value: "docs", label: "Documentation search" },
        { value: "support", label: "Support assistant" },
        { value: "code", label: "Code search" },
        { value: "research", label: "Research" },
        { value: "policy", label: "Policy / legal" },
        { value: "mixed", label: "Mixed" },
      ],
    },
    { kind: "number", name: "corpus_documents", label: "Documents", span: 6, min: 1 },
    {
      kind: "radio-group",
      name: "sensitivity",
      label: "Data sensitivity",
      options: [
        { value: "public", label: "Public" },
        { value: "internal", label: "Internal" },
        { value: "internal-only", label: "Internal only", hint: "no third-party hosting" },
        { value: "restricted", label: "Restricted", hint: "nothing leaves the network" },
      ],
      description:
        "Internal-only and above are hard filters, not preferences. Managed stores are excluded outright.",
    },
    {
      kind: "slider",
      name: "latency_target_ms",
      label: "Latency budget",
      min: 100,
      max: 5_000,
      step: 100,
      span: 6,
      format: (value) => `${value} ms`,
      description: "Under 500 ms leaves no room for cross-encoder reranking.",
    },
    {
      kind: "select",
      name: "scale",
      label: "Scale",
      span: 6,
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
        { value: "xlarge", label: "Very large" },
      ],
    },
    {
      kind: "radio-group",
      name: "team_skill",
      label: "Team experience",
      options: [
        { value: "beginner", label: "New to RAG" },
        { value: "intermediate", label: "Some experience" },
        { value: "advanced", label: "Experienced" },
      ],
    },
  ],
  submitLabel: "Design the pipeline",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["store", "reranking", "self_hosted", "stages"],
        columns: 4,
        labels: {
          store: "Vector store",
          reranking: "Reranking",
          self_hosted: "Self-hosted",
          stages: "Stages",
        },
      },
      { kind: "callout" },
      { kind: "mermaid", artifact: "diagram", title: "Pipeline" },
      {
        kind: "table",
        key: "components",
        title: "Components",
        description: "Every choice is traceable to a constraint you stated.",
      },
      { kind: "code", artifact: "architecture", title: "Architecture document" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "pipeline-cost",
      label: "Cost this pipeline",
      values: ({ input }) => ({ document_count: input.corpus_documents }),
    },
  ],
  relatedTools: ["pipeline-cost", "chunking-strategy", "compare-vector-db"],
};

export const RAG_SPECS = [
  chunkEstimateSpec,
  vectordbEstimateSpec,
  pdfTokensSpec,
  pipelineCostSpec,
  ragArchitectureSpec,
  chunkingStrategySpec,
];
