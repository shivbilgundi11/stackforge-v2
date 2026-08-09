import { z } from "zod";

import type { ToolSpec } from "@/lib/tools/spec";

/**
 * WF1 — Cost Planner.
 *
 * Four specs. Each page file that renders one is four lines; everything below
 * is what a tool actually *is* in this build.
 */

export const llmPricingSpec: ToolSpec = {
  slug: "llm-pricing",
  group: "cost",
  eyebrow: "WF1",
  title: "LLM Pricing Calculator",
  summary: "What a model actually costs at your volume, with prompt caching accounted for.",
  keywords: ["cost", "price", "tokens", "spend", "caching", "budget"],
  endpoint: "/api/v1/tools/cost/llm-pricing",
  tier: "free",
  input: z.object({
    model_id: z.string().min(1, "Pick a model."),
    input_tokens: z.number().int().min(0).max(10_000_000),
    output_tokens: z.number().int().min(0).max(1_000_000),
    requests_per_day: z.number().int().min(0).max(100_000_000),
    cached_input_ratio: z.number().min(0).max(1).optional(),
  }),
  defaults: {
    model_id: "gpt-4o-mini",
    input_tokens: 2000,
    output_tokens: 500,
    requests_per_day: 1000,
    cached_input_ratio: 0,
  },
  presets: [
    {
      label: "Support chatbot",
      description: "Short prompts, high volume, no caching",
      values: {
        input_tokens: 800,
        output_tokens: 300,
        requests_per_day: 5000,
        cached_input_ratio: 0,
      },
    },
    {
      label: "RAG assistant",
      description: "Large retrieved context, heavily cached system prompt",
      values: {
        input_tokens: 12_000,
        output_tokens: 600,
        requests_per_day: 2000,
        cached_input_ratio: 0.8,
      },
    },
    {
      label: "Coding agent",
      description: "Long context, long output, moderate volume",
      values: {
        input_tokens: 30_000,
        output_tokens: 4000,
        requests_per_day: 300,
        cached_input_ratio: 0.6,
      },
    },
  ],
  fields: [
    { kind: "model-select", name: "model_id", label: "Model", family: "chat" },
    {
      kind: "number",
      name: "input_tokens",
      label: "Input tokens",
      unit: "per req",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "output_tokens",
      label: "Output tokens",
      unit: "per req",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "requests_per_day",
      label: "Requests per day",
      min: 0,
    },
    {
      kind: "slider",
      name: "cached_input_ratio",
      label: "Cached input",
      description:
        "Share of input tokens served from the prompt cache. A stable system prompt or a fixed document set is usually cacheable, and on a RAG workload this is the single largest lever on the bill.",
      min: 0,
      max: 1,
      step: 0.05,
      format: (value) => `${Math.round(value * 100)}%`,
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["cost_per_request", "daily_cost", "monthly_cost", "annual_cost"],
        emphasise: "monthly_cost",
      },
      { kind: "callout" },
      {
        kind: "chart",
        key: "cost_projection",
        chart: "area",
        x: "month",
        y: "cost",
        title: "12-month projection",
        format: "currency",
      },
      {
        kind: "table",
        key: "model_alternatives",
        title: "Models that fit the same context",
        description: "Same workload, priced against every model with a large enough window.",
        limit: 12,
      },
      { kind: "code", artifact: "cost-report", title: "Cost report" },
      { kind: "json" },
    ],
  },
  relatedTools: ["token-calculator", "budget-estimator"],
};

export const tokenCalculatorSpec: ToolSpec = {
  slug: "token-calculator",
  group: "cost",
  eyebrow: "WF1",
  title: "Token Calculator",
  summary: "Count tokens, check context fit, and see what one call costs on every model.",
  keywords: ["tokens", "context", "window", "fit", "count", "tiktoken"],
  endpoint: "/api/v1/tools/cost/token-calculator",
  tier: "free",
  input: z.object({
    text: z.string().min(1, "Paste some text to count.").max(2_000_000),
    model_id: z.string().min(1, "Pick a model."),
    output_tokens: z.number().int().min(0).max(1_000_000).optional(),
  }),
  // No `text` default: blank is the correct initial state for a paste box.
  defaults: { model_id: "gpt-4o-mini", output_tokens: 0 },
  fields: [
    { kind: "model-select", name: "model_id", label: "Model", family: "chat", span: 6 },
    {
      kind: "number",
      name: "output_tokens",
      label: "Expected output",
      unit: "tokens",
      span: 6,
      min: 0,
      description: "Counted against the window alongside the input.",
    },
    {
      kind: "textarea",
      name: "text",
      label: "Text",
      rows: 12,
      placeholder: "Paste a prompt, a document, or a transcript…",
    },
  ],
  submitLabel: "Count tokens",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["tokens", "characters", "words", "context_used_pct"],
        emphasise: "tokens",
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "context_fit",
        title: "Which models fit this input",
        description: "And what a single call costs on each.",
      },
      { kind: "json" },
    ],
  },
  relatedTools: ["llm-pricing", "embedding-cost"],
};

export const embeddingCostSpec: ToolSpec = {
  slug: "embedding-cost",
  group: "cost",
  eyebrow: "WF1 · WF2",
  title: "Embedding Cost Calculator",
  summary: "Ingestion and re-embedding cost for a corpus, with dimensions carried through.",
  keywords: ["embedding", "vectors", "ingestion", "rag", "corpus", "dimensions"],
  endpoint: "/api/v1/tools/cost/embedding-cost",
  tier: "free",
  input: z.object({
    model_id: z.string().min(1, "Pick an embedding model."),
    document_count: z.number().int().min(1).max(1_000_000_000),
    avg_tokens_per_document: z.number().int().min(1).max(10_000_000),
    reembeds_per_month: z.number().int().min(0).max(1000).optional(),
    chunk_overlap_pct: z.number().min(0).max(90).optional(),
  }),
  defaults: {
    model_id: "text-embedding-3-small",
    document_count: 10_000,
    avg_tokens_per_document: 800,
    reembeds_per_month: 1,
    chunk_overlap_pct: 0,
  },
  presets: [
    {
      label: "Docs site",
      values: { document_count: 2000, avg_tokens_per_document: 1200, reembeds_per_month: 4 },
    },
    {
      label: "Support corpus",
      values: { document_count: 50_000, avg_tokens_per_document: 400, reembeds_per_month: 1 },
    },
    {
      label: "Code index",
      values: {
        document_count: 200_000,
        avg_tokens_per_document: 600,
        reembeds_per_month: 30,
        chunk_overlap_pct: 15,
      },
    },
  ],
  fields: [
    {
      kind: "model-select",
      name: "model_id",
      label: "Embedding model",
      family: "embedding",
    },
    {
      kind: "number",
      name: "document_count",
      label: "Documents",
      span: 6,
      min: 1,
    },
    {
      kind: "number",
      name: "avg_tokens_per_document",
      label: "Average tokens",
      unit: "per doc",
      span: 6,
      min: 1,
    },
    {
      kind: "number",
      name: "reembeds_per_month",
      label: "Re-embeds per month",
      span: 6,
      min: 0,
      description: "How often the whole corpus is rebuilt.",
    },
    {
      kind: "slider",
      name: "chunk_overlap_pct",
      label: "Chunk overlap",
      span: 6,
      min: 0,
      max: 50,
      step: 5,
      unit: "%",
      description: "Overlapping windows embed the same text twice, and the bill reflects it.",
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["total_tokens", "ingestion_cost", "monthly_cost", "dimensions"],
        emphasise: "monthly_cost",
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "provider_comparison",
        title: "Provider comparison",
        description:
          "Dimensions matter downstream — vector storage cost scales with them, not just embedding cost.",
      },
      { kind: "json" },
    ],
  },
  relatedTools: ["llm-pricing", "budget-estimator"],
};

export const budgetEstimatorSpec: ToolSpec = {
  slug: "budget-estimator",
  group: "cost",
  eyebrow: "WF1",
  title: "Monthly Budget Estimator",
  summary: "Several workloads, one monthly figure, and a twelve-month projection with growth.",
  keywords: ["budget", "forecast", "growth", "monthly", "projection", "spend"],
  endpoint: "/api/v1/tools/cost/budget-estimator",
  tier: "free",
  input: z.object({
    lines: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          model_id: z.string().min(1),
          requests_per_day: z.number().int().min(0),
          input_tokens: z.number().int().min(0),
          output_tokens: z.number().int().min(0),
        }),
      )
      .min(1, "Add at least one workload.")
      .max(25),
    monthly_growth_pct: z.number().min(-50).max(200).optional(),
    infrastructure_monthly: z.number().min(0).optional(),
    embedding_monthly: z.number().min(0).optional(),
    user_count: z.number().int().min(1).optional(),
  }),
  defaults: {
    lines: [
      {
        name: "Chat",
        model_id: "gpt-4o-mini",
        requests_per_day: 2000,
        input_tokens: 1500,
        output_tokens: 400,
      },
    ],
    monthly_growth_pct: 10,
    infrastructure_monthly: 0,
    embedding_monthly: 0,
  },
  fields: [
    {
      kind: "repeater",
      name: "lines",
      label: "Workloads",
      itemLabel: "Workload",
      min: 1,
      max: 10,
      newItem: () => ({
        name: "",
        model_id: "gpt-4o-mini",
        requests_per_day: 1000,
        input_tokens: 1000,
        output_tokens: 300,
      }),
      fields: [
        { kind: "text", name: "name", label: "Name", span: 12, placeholder: "Summarisation" },
        { kind: "model-select", name: "model_id", label: "Model", family: "chat", span: 12 },
        { kind: "number", name: "requests_per_day", label: "Req/day", span: 4, min: 0 },
        { kind: "number", name: "input_tokens", label: "In", span: 4, min: 0 },
        { kind: "number", name: "output_tokens", label: "Out", span: 4, min: 0 },
      ],
    },
    {
      kind: "slider",
      name: "monthly_growth_pct",
      label: "Monthly growth",
      min: -20,
      max: 50,
      step: 1,
      unit: "%",
      span: 12,
      description: "Compounds from month two. Check it against your actual funnel.",
    },
    {
      kind: "currency",
      name: "infrastructure_monthly",
      label: "Infrastructure",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "currency",
      name: "embedding_monthly",
      label: "Embeddings",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "user_count",
      label: "Users",
      span: 6,
      min: 1,
      description: "Optional. Produces a cost-per-user figure.",
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["monthly_cost", "month_12_cost", "year_1_total", "cost_per_user"],
        emphasise: "monthly_cost",
      },
      { kind: "callout" },
      {
        kind: "chart",
        key: "growth_projection",
        chart: "area",
        x: "month",
        y: "cost",
        title: "12-month projection",
        format: "currency",
      },
      { kind: "table", key: "breakdown", title: "Per-workload breakdown" },
      {
        kind: "table",
        key: "recommendations",
        title: "Optimisations",
        description: "Costed, not generic.",
      },
      { kind: "json" },
    ],
  },
  relatedTools: ["llm-pricing", "embedding-cost"],
};

export const COST_SPECS = [
  llmPricingSpec,
  tokenCalculatorSpec,
  embeddingCostSpec,
  budgetEstimatorSpec,
];
