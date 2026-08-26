import { z } from "zod";

import { ComparisonMatrix } from "@/components/features/compare/comparison-matrix";
import type { ResultSpec, SelectOption, ToolSpec } from "@/lib/tools/spec";

/**
 * Compare Center.
 *
 * Four specs, one shared result component. The old build had a single
 * 523-line file holding four unrelated implementations; the difference is
 * entirely that these four agree on an output contract.
 */

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "balanced", label: "Balanced", hint: "no axis favoured" },
  { value: "cost", label: "Cost", hint: "accept more work to save money" },
  { value: "scale", label: "Scale", hint: "assume 10x growth" },
  { value: "speed", label: "Speed", hint: "latency and time to ship" },
  { value: "simplicity", label: "Simplicity", hint: "prefer managed" },
  { value: "control", label: "Control", hint: "avoid lock-in" },
];

const priority = z.enum(["balanced", "cost", "scale", "speed", "simplicity", "control"]);

/**
 * Every comparison uses the same bespoke renderer.
 *
 * `blocks: []` is deliberate: the escape hatch replaces the rendering, and
 * listing blocks that will never run would be a lie in the spec.
 */
const matrixResult: ResultSpec = { blocks: [], component: ComparisonMatrix };

export const compareModelsSpec: ToolSpec = {
  slug: "compare-models",
  path: "models",
  group: "compare",
  title: "Model Compare",
  summary:
    "Two to four models scored against your actual usage profile — cost computed, not asserted.",
  keywords: ["compare", "models", "llm", "versus", "benchmark"],
  endpoint: "/api/v1/tools/compare/models",
  tier: "free",
  synthesises: true,
  input: z.object({
    model_ids: z
      .array(z.string().min(1))
      .min(2, "Pick at least two models.")
      .max(4, "Compare at most four at once."),
    input_tokens: z.number().int().min(0),
    output_tokens: z.number().int().min(0),
    requests_per_day: z.number().int().min(0),
    cached_input_ratio: z.number().min(0).max(1).optional(),
    priority,
  }),
  defaults: {
    model_ids: ["gpt-4o-mini", "claude-sonnet-5"],
    input_tokens: 2000,
    output_tokens: 500,
    requests_per_day: 1000,
    cached_input_ratio: 0,
    priority: "balanced",
  },
  fields: [
    {
      kind: "model-select",
      name: "model_ids",
      label: "Models",
      family: "chat",
      multiple: true,
      max: 4,
      description: "Order sets the column order in the matrix.",
    },
    {
      kind: "radio-group",
      name: "priority",
      label: "Priority",
      description:
        "Reweights every criterion. The winner genuinely changes — this is the difference between a comparison and a leaderboard.",
      options: PRIORITY_OPTIONS,
    },
    { kind: "number", name: "input_tokens", label: "Input tokens", span: 6, min: 0 },
    { kind: "number", name: "output_tokens", label: "Output tokens", span: 6, min: 0 },
    { kind: "number", name: "requests_per_day", label: "Requests per day", min: 0 },
    {
      kind: "slider",
      name: "cached_input_ratio",
      label: "Cached input",
      min: 0,
      max: 1,
      step: 0.05,
      format: (value) => `${Math.round(value * 100)}%`,
    },
  ],
  submitLabel: "Compare",
  result: matrixResult,
  handoffs: [
    {
      to: "llm-pricing",
      label: "Price the winner",
      description: "Full projection for the recommended model at this workload.",
      values: ({ metrics, input }) => ({
        model_id: metrics.winner,
        input_tokens: input.input_tokens,
        output_tokens: input.output_tokens,
        requests_per_day: input.requests_per_day,
        cached_input_ratio: input.cached_input_ratio,
      }),
    },
    {
      to: "budget-estimator",
      label: "Budget for the winner",
      description: "Open a budget with the recommended model as its first workload.",
      values: ({ metrics, input }) => ({
        lines: [
          {
            name: String(metrics.winner_name ?? "Workload"),
            model_id: metrics.winner,
            requests_per_day: input.requests_per_day,
            input_tokens: input.input_tokens,
            output_tokens: input.output_tokens,
          },
        ],
      }),
    },
  ],
  relatedTools: ["compare-vector-db", "compare-stacks"],
};

export const compareVectorDbSpec: ToolSpec = {
  slug: "compare-vector-db",
  path: "vector-db",
  group: "compare",
  title: "Vector DB Compare",
  summary: "Vector databases scored at your corpus size, with cost computed from it.",
  keywords: ["vector", "database", "pinecone", "qdrant", "pgvector", "weaviate", "milvus"],
  endpoint: "/api/v1/tools/compare/vector-db",
  tier: "free",
  synthesises: true,
  input: z.object({
    tool_slugs: z.array(z.string().min(1)).min(2, "Pick at least two databases.").max(6),
    vector_count: z.number().int().min(1),
    dimensions: z.number().int().min(1).max(16_384),
    priority,
  }),
  defaults: {
    tool_slugs: ["pinecone", "qdrant", "pgvector"],
    vector_count: 1_000_000,
    dimensions: 1536,
    priority: "balanced",
  },
  presets: [
    { label: "Prototype", values: { vector_count: 100_000, dimensions: 1536 } },
    { label: "Production", values: { vector_count: 10_000_000, dimensions: 1536 } },
    { label: "Large corpus", values: { vector_count: 100_000_000, dimensions: 3072 } },
  ],
  fields: [
    {
      kind: "tool-select",
      name: "tool_slugs",
      label: "Databases",
      category: "vector-db",
      multiple: true,
      max: 6,
    },
    {
      kind: "radio-group",
      name: "priority",
      label: "Priority",
      options: PRIORITY_OPTIONS,
    },
    {
      kind: "number",
      name: "vector_count",
      label: "Vectors",
      span: 6,
      min: 1,
      description: "Cost scales linearly with this.",
    },
    {
      kind: "number",
      name: "dimensions",
      label: "Dimensions",
      span: 6,
      min: 1,
      description: "3072-dim costs roughly twice 1536-dim at the same count.",
    },
  ],
  submitLabel: "Compare",
  result: matrixResult,
  relatedTools: ["compare-models", "embedding-cost"],
};

export const compareStacksSpec: ToolSpec = {
  slug: "compare-stacks",
  path: "stacks",
  group: "compare",
  title: "Stack Compare",
  summary:
    "Archetypes compared on twelve-month TCO — including the engineering time budgets forget.",
  keywords: ["stack", "architecture", "tco", "mvp", "enterprise", "serverless"],
  endpoint: "/api/v1/tools/compare/stacks",
  tier: "free",
  synthesises: true,
  input: z.object({
    archetypes: z.array(z.string().min(1)).min(2, "Pick at least two.").max(5),
    monthly_model_spend: z.number().min(0),
    blended_hourly_rate: z.number().min(1).max(1000),
    priority,
  }),
  defaults: {
    archetypes: ["mvp", "serverless", "open-source"],
    monthly_model_spend: 500,
    blended_hourly_rate: 120,
    priority: "balanced",
  },
  fields: [
    {
      kind: "multi-select",
      name: "archetypes",
      label: "Archetypes",
      max: 5,
      options: [
        { value: "mvp", label: "MVP" },
        { value: "serverless", label: "Serverless" },
        { value: "open-source", label: "Open source" },
        { value: "enterprise", label: "Enterprise" },
        { value: "self-hosted", label: "Self-hosted" },
      ],
    },
    {
      kind: "radio-group",
      name: "priority",
      label: "Priority",
      options: PRIORITY_OPTIONS,
    },
    {
      kind: "currency",
      name: "monthly_model_spend",
      label: "Model spend",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "currency",
      name: "blended_hourly_rate",
      label: "Blended rate",
      unit: "/hr",
      span: 6,
      min: 1,
      description: "Engineering time is most of the TCO. This is the number that sets it.",
    },
  ],
  submitLabel: "Compare",
  result: matrixResult,
  handoffs: [
    {
      to: "compare-build-vs-buy",
      label: "Test build against buy",
      description: "Carry the engineering rate into a twelve-month build-or-buy case.",
      // Only the rate. Everything else in build-vs-buy — build hours,
      // maintenance load, vendor price — is a different question that this
      // comparison never asked, and inventing answers for them would produce
      // a TCO nobody entered.
      values: ({ input }) => ({ blended_hourly_rate: input.blended_hourly_rate }),
    },
  ],
  relatedTools: ["compare-build-vs-buy", "compare-models"],
};

export const compareBuildVsBuySpec: ToolSpec = {
  slug: "compare-build-vs-buy",
  path: "build-vs-buy",
  group: "compare",
  title: "Build vs Buy",
  summary:
    "Twelve, twenty-four, and thirty-six month cost, a break-even month, and a sensitivity table.",
  keywords: ["build", "buy", "vendor", "break-even", "tco", "make"],
  endpoint: "/api/v1/tools/compare/build-vs-buy",
  tier: "free",
  synthesises: true,
  input: z.object({
    build_hours: z.number().int().min(1).max(100_000),
    blended_hourly_rate: z.number().min(1).max(1000),
    build_infra_monthly: z.number().min(0),
    maintenance_hours_per_month: z.number().min(0).max(1000),
    vendor_monthly: z.number().min(0),
    vendor_integration_hours: z.number().int().min(0).max(10_000).optional(),
    priority,
  }),
  defaults: {
    build_hours: 300,
    blended_hourly_rate: 120,
    build_infra_monthly: 200,
    maintenance_hours_per_month: 8,
    vendor_monthly: 1500,
    vendor_integration_hours: 20,
    priority: "balanced",
  },
  fields: [
    {
      kind: "number",
      name: "build_hours",
      label: "Build hours",
      span: 6,
      min: 1,
      description: "Whatever your estimate is, the sensitivity table will test it.",
    },
    {
      kind: "currency",
      name: "blended_hourly_rate",
      label: "Blended rate",
      unit: "/hr",
      span: 6,
      min: 1,
    },
    {
      kind: "currency",
      name: "build_infra_monthly",
      label: "Build infrastructure",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "maintenance_hours_per_month",
      label: "Maintenance",
      unit: "h/mo",
      span: 6,
      min: 0,
      description: "The cost most build cases forget entirely.",
    },
    {
      kind: "currency",
      name: "vendor_monthly",
      label: "Vendor price",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "vendor_integration_hours",
      label: "Integration hours",
      span: 6,
      min: 0,
    },
    {
      kind: "radio-group",
      name: "priority",
      label: "Priority",
      options: PRIORITY_OPTIONS,
    },
  ],
  submitLabel: "Compare",
  result: matrixResult,
  relatedTools: ["compare-stacks"],
};

export const COMPARE_SPECS = [
  compareModelsSpec,
  compareVectorDbSpec,
  compareStacksSpec,
  compareBuildVsBuySpec,
];
