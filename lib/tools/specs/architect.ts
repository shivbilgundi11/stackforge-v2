import { z } from "zod";

import { StackResult } from "@/components/features/architect/stack-result";
import type { ToolSpec } from "@/lib/tools/spec";

/**
 * M15 — Stack Architect. The flagship.
 *
 * Built on the same spec machinery as the 27 calculators rather than as a
 * bespoke set of pages, which is what the machinery was for: the form, the
 * mutation, error mapping, quota handling, provenance, recent runs, and the
 * URL state all come for free, and only the payoff screen is bespoke.
 *
 * Every field has a default, so a first-time user gets a real recommendation
 * without filling anything in. That is deliberate — the product's strongest
 * demo is the product working (`PRD.md` §18).
 */

export const stackArchitectSpec: ToolSpec = {
  slug: "stack-architect",
  group: "architect",
  path: "new",
  title: "Stack Architect",
  summary:
    "Describe what you are building. Hard constraints eliminate, ten dimensions score, and three ranked stacks come back.",
  keywords: ["stack", "architecture", "recommend", "design", "score", "compatibility"],
  endpoint: "/api/v1/architect/recommend",
  tier: "free",
  synthesises: true,
  input: z.object({
    use_case: z.enum(["rag", "chat", "agents", "automation", "coding", "search", "analytics"]),
    scale_target: z.enum(["small", "medium", "large", "xlarge"]),
    monthly_budget: z.number().int().min(0).max(10_000_000),
    team_skill: z.enum(["beginner", "intermediate", "advanced"]),
    latency_ms: z.number().int().min(50).max(600_000),
    sensitivity: z.enum(["public", "internal", "confidential", "restricted", "regulated"]),
    deployment: z.enum(["any", "managed", "self-hosted", "hybrid"]),
    capabilities: z.array(z.string()).max(12).optional(),
    model_hosting: z.enum(["api", "managed-open-weights", "self-hosted"]),
    workload: z.enum(["inference", "fine-tuning", "training"]),
    traffic: z.enum(["steady", "spiky", "batch"]),
    residency: z.enum(["any", "eu", "in", "us"]),
  }),
  defaults: {
    use_case: "rag",
    scale_target: "medium",
    monthly_budget: 2000,
    team_skill: "intermediate",
    latency_ms: 2000,
    sensitivity: "internal",
    deployment: "any",
    capabilities: [],
    model_hosting: "api",
    workload: "inference",
    traffic: "steady",
    residency: "any",
  },
  presets: [
    {
      label: "Regulated enterprise",
      description:
        "Nothing leaves the network — the constraint that eliminates most of the catalog",
      values: { sensitivity: "regulated", deployment: "self-hosted", scale_target: "large" },
    },
    {
      label: "Weekend prototype",
      description: "Tight budget, small team, managed everything",
      values: {
        monthly_budget: 100,
        team_skill: "beginner",
        deployment: "managed",
        scale_target: "small",
      },
    },
    {
      label: "Self-hosted 70B",
      description: "Open weights on rented GPUs — the case that adds a compute layer",
      values: {
        model_hosting: "self-hosted",
        workload: "inference",
        deployment: "self-hosted",
        scale_target: "large",
      },
    },
    {
      label: "Real-time agents",
      description: "Sub-second budget, which rules out anything batch-shaped",
      values: { use_case: "agents", latency_ms: 400, scale_target: "large" },
    },
  ],
  fields: [
    {
      kind: "radio-group",
      name: "use_case",
      label: "What are you building?",
      options: [
        { value: "rag", label: "RAG / search over documents" },
        { value: "chat", label: "Chat product" },
        { value: "agents", label: "Agents", hint: "picks an agent framework" },
        { value: "automation", label: "Automation" },
        { value: "coding", label: "Coding assistant" },
        { value: "analytics", label: "Analytics" },
      ],
    },
    {
      kind: "select",
      name: "scale_target",
      label: "Scale target",
      span: 6,
      options: [
        { value: "small", label: "Small", hint: "a team" },
        { value: "medium", label: "Medium", hint: "a company" },
        { value: "large", label: "Large", hint: "many companies" },
        { value: "xlarge", label: "Very large", hint: "excludes anything unproven at scale" },
      ],
    },
    {
      kind: "currency",
      name: "monthly_budget",
      label: "Monthly budget",
      unit: "/mo",
      span: 6,
      min: 0,
      description:
        "Cost efficiency is scored against this, not absolutely — the same stack scores differently on $500 and $50,000.",
    },
    {
      kind: "select",
      name: "team_skill",
      label: "Team experience",
      span: 6,
      options: [
        { value: "beginner", label: "New to this", hint: "excludes anything needing an operator" },
        { value: "intermediate", label: "Some experience" },
        { value: "advanced", label: "Deep experience" },
      ],
    },
    {
      kind: "number",
      name: "latency_ms",
      label: "Latency target",
      unit: "ms",
      span: 6,
      min: 50,
      description: "Under 500ms leaves no room for batch-shaped components in the request path.",
    },
    {
      kind: "select",
      name: "sensitivity",
      label: "Data sensitivity",
      span: 6,
      options: [
        { value: "public", label: "Public" },
        { value: "internal", label: "Internal" },
        { value: "confidential", label: "Confidential" },
        { value: "restricted", label: "Restricted", hint: "self-hostable only" },
        { value: "regulated", label: "Regulated", hint: "self-hostable only" },
      ],
      description:
        "Restricted and regulated eliminate managed-only options rather than ranking them down.",
    },
    {
      kind: "select",
      name: "deployment",
      label: "Deployment preference",
      span: 6,
      options: [
        { value: "any", label: "No preference" },
        { value: "managed", label: "Managed" },
        { value: "self-hosted", label: "Self-hosted" },
        { value: "hybrid", label: "Hybrid" },
      ],
    },
    {
      kind: "tag-input",
      name: "capabilities",
      label: "Must-have capabilities",
      max: 12,
      description: "Optional. Recorded with the stack and passed to the analysis.",
    },
    // ── M25 ──────────────────────────────────────────────────────────────
    //
    // Where the *model* runs, as opposed to where the application runs. Every
    // default here is the answer that leaves the recommendation exactly as it
    // was before this module, so an untouched form is unaffected — and the
    // three questions that only matter once you are renting a machine hide
    // themselves until you are.
    {
      kind: "radio-group",
      name: "model_hosting",
      label: "Where do the weights run?",
      options: [
        { value: "api", label: "Someone else's API", hint: "no compute layer" },
        {
          value: "managed-open-weights",
          label: "Open weights, hosted",
          hint: "Together, Groq, Fireworks",
        },
        { value: "self-hosted", label: "On my own hardware", hint: "adds a compute layer" },
      ],
      description:
        "Most stacks call an API and need no GPU at all. Saying so keeps the compute layer out of the answer rather than ranking it last.",
    },
    {
      kind: "select",
      name: "workload",
      label: "Workload",
      span: 6,
      showWhen: (values) => values.model_hosting === "self-hosted",
      options: [
        { value: "inference", label: "Inference only" },
        { value: "fine-tuning", label: "Fine-tuning", hint: "needs 80GB on one card" },
        { value: "training", label: "Training from scratch", hint: "needs 8 cards in one box" },
      ],
    },
    {
      kind: "select",
      name: "traffic",
      label: "Traffic pattern",
      span: 6,
      showWhen: (values) => values.model_hosting === "self-hosted",
      options: [
        { value: "steady", label: "Steady" },
        { value: "spiky", label: "Spiky", hint: "excludes anything that bills while idle" },
        { value: "batch", label: "Batch" },
      ],
      description:
        "Spiky traffic on a reserved GPU spends most of the month paying for an idle machine.",
    },
    {
      kind: "select",
      name: "residency",
      label: "Data residency",
      span: 6,
      options: [
        { value: "any", label: "No requirement" },
        { value: "eu", label: "EU" },
        { value: "in", label: "India" },
        { value: "us", label: "US" },
      ],
      description:
        "Asked of the whole stack, not just the compute layer — the vector store holding your embeddings is the same question. A managed tool with no verified residency on file is excluded rather than assumed.",
    },
  ],
  submitLabel: "Design my stack",
  result: { blocks: [], component: StackResult },
  handoffs: [
    {
      to: "gpu-cost",
      label: "Price the GPU",
      showWhen: ({ metrics }) => Boolean(metrics.compute_gpu),
      description:
        "The stack names the vendor. This is what its hours actually cost, against the managed API you would otherwise call.",
      // Deliberately not a monthly figure on the result page: the architect
      // scores how well a stack's cost *shape* fits the budget and refuses to
      // invent a bill for it (D-16). This is the tool that models utilisation,
      // spot and egress, and it opens on the instance the stack chose.
      values: ({ metrics, targetDefaults }) =>
        typeof metrics.compute_gpu === "string" && metrics.compute_gpu
          ? { ...targetDefaults, gpu: metrics.compute_gpu }
          : {},
    },
    {
      to: "budget-estimator",
      label: "Cost this stack",
      description: "The score says how well it fits your budget. This says what it costs.",
      values: ({ input }) => ({ user_count: Number(input.scale_target === "small" ? 10 : 100) }),
    },
  ],
  relatedTools: ["compare-stacks", "vram-estimate", "model-roi"],
};

export const stackCompatibilitySpec: ToolSpec = {
  slug: "stack-score",
  group: "architect",
  path: "compatibility",
  title: "Compatibility Checker",
  summary:
    "Score any combination of tools against each other — pairwise, order-independent, with the weakest pairing named.",
  keywords: ["compatibility", "matrix", "pairs", "score", "stack"],
  endpoint: "/api/v1/architect/score",
  tier: "free",
  synthesises: true,
  input: z.object({
    component_slugs: z
      .array(z.string().min(1))
      .min(2, "Pick at least two tools to compare.")
      .max(15),
    monthly_budget: z.number().int().min(0).max(10_000_000),
    scale_target: z.enum(["small", "medium", "large", "xlarge"]),
    sensitivity: z.enum(["public", "internal", "confidential", "restricted", "regulated"]),
  }),
  defaults: {
    component_slugs: ["pgvector", "langgraph", "redis"],
    monthly_budget: 2000,
    scale_target: "medium",
    sensitivity: "internal",
  },
  fields: [
    {
      kind: "tool-select",
      name: "component_slugs",
      label: "Tools",
      multiple: true,
      max: 15,
      description: "Any combination. The result is identical whichever order you pick them in.",
    },
    {
      kind: "currency",
      name: "monthly_budget",
      label: "Monthly budget",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    {
      kind: "select",
      name: "scale_target",
      label: "Scale target",
      span: 6,
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
        { value: "xlarge", label: "Very large" },
      ],
    },
    {
      kind: "select",
      name: "sensitivity",
      label: "Data sensitivity",
      options: [
        { value: "public", label: "Public" },
        { value: "internal", label: "Internal" },
        { value: "confidential", label: "Confidential" },
        { value: "restricted", label: "Restricted" },
        { value: "regulated", label: "Regulated" },
      ],
    },
  ],
  submitLabel: "Score this set",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["score", "compatibility", "components", "deprecated_components"],
        emphasise: "score",
        labels: {
          score: "Stack Score",
          compatibility: "Weakest pair",
          deprecated_components: "Flagged",
        },
      },
      { kind: "callout" },
      {
        kind: "prose",
        keys: ["summary", "weakest_pair_impact"],
        title: "What the weakest pairing costs",
        description: "The scores are the engine's; this is what living with them looks like.",
      },
      {
        kind: "table",
        key: "score_breakdown",
        title: "Score breakdown",
        description: "Ten weighted dimensions. The contributions sum to the headline.",
      },
      {
        kind: "table",
        key: "compatibility",
        title: "Pairwise compatibility",
        description: "Value plus status, never colour alone.",
        limit: 60,
      },
      { kind: "json" },
    ],
  },
  relatedTools: ["stack-architect", "compare-stacks"],
};

export const ARCHITECT_SPECS = [stackArchitectSpec, stackCompatibilitySpec];
