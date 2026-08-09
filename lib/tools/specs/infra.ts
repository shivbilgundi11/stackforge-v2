import { z } from "zod";

import type { ToolSpec } from "@/lib/tools/spec";

/**
 * WF4 — Infra Planner.
 *
 * The self-hosting question, answered with numbers. VRAM decides whether it
 * runs at all, break-even decides whether it should, and the two generators
 * produce the files — labelled as starters, because that is what they are.
 */

const QUANTISATIONS = [
  { value: "fp16", label: "FP16 / BF16", hint: "2 bytes per weight" },
  { value: "fp8", label: "FP8", hint: "1 byte" },
  { value: "int8", label: "INT8", hint: "1 byte" },
  { value: "int4", label: "INT4", hint: "0.5 bytes" },
  { value: "gguf-q4_k_m", label: "GGUF Q4_K_M", hint: "~0.56, scales included" },
  { value: "gguf-q5_k_m", label: "GGUF Q5_K_M", hint: "~0.68" },
  { value: "gguf-q8_0", label: "GGUF Q8_0", hint: "~1.06" },
  { value: "awq-4bit", label: "AWQ 4-bit", hint: "~0.55" },
  { value: "gptq-4bit", label: "GPTQ 4-bit", hint: "~0.55" },
  { value: "fp32", label: "FP32", hint: "4 bytes" },
];

export const vramEstimateSpec: ToolSpec = {
  slug: "vram-estimate",
  group: "infra",
  eyebrow: "WF4",
  title: "VRAM Estimator",
  summary: "Weights, KV cache, and activations separately — and which GPUs actually hold them.",
  keywords: ["vram", "gpu", "memory", "kv cache", "quantization", "gguf", "awq", "gqa"],
  endpoint: "/api/v1/tools/infra/vram-estimate",
  tier: "free",
  input: z.object({
    architecture_key: z.string().min(1, "Pick a model."),
    quantisation: z.enum([
      "fp32",
      "fp16",
      "bf16",
      "int8",
      "fp8",
      "int4",
      "gguf-q8_0",
      "gguf-q6_k",
      "gguf-q5_k_m",
      "gguf-q4_k_m",
      "gguf-q3_k_m",
      "awq-4bit",
      "gptq-4bit",
    ]),
    context: z.number().int().min(128).max(2_000_000),
    concurrency: z.number().int().min(1).max(512),
    kv_precision: z.enum(["fp32", "fp16", "bf16", "fp8", "int8"]),
    runtime: z.enum(["vllm", "tgi", "llama.cpp", "transformers", "sglang"]),
    lora_finetune: z.boolean().optional(),
  }),
  defaults: {
    architecture_key: "llama-3.1-8b",
    quantisation: "fp16",
    context: 8192,
    concurrency: 1,
    kv_precision: "fp16",
    runtime: "vllm",
    lora_finetune: false,
  },
  presets: [
    {
      label: "Single user, short context",
      values: { context: 8192, concurrency: 1, quantisation: "fp16" },
    },
    {
      label: "Production serving",
      description: "Long context, real concurrency — where KV cache dominates",
      values: { context: 32_768, concurrency: 8, quantisation: "fp16" },
    },
    {
      label: "Squeezed onto one card",
      values: { quantisation: "gguf-q4_k_m", kv_precision: "fp8", context: 16_384 },
    },
  ],
  fields: [
    { kind: "architecture-select", name: "architecture_key", label: "Model" },
    {
      kind: "select",
      name: "quantisation",
      label: "Weight quantisation",
      span: 6,
      options: QUANTISATIONS,
    },
    {
      kind: "select",
      name: "kv_precision",
      label: "KV cache precision",
      span: 6,
      options: [
        { value: "fp16", label: "FP16", hint: "default" },
        { value: "fp8", label: "FP8", hint: "halves the cache" },
        { value: "int8", label: "INT8" },
        { value: "fp32", label: "FP32" },
      ],
      description: "Set independently of the weights, and the largest lever at long context.",
    },
    { kind: "number", name: "context", label: "Context", unit: "tokens", span: 6, min: 128 },
    {
      kind: "number",
      name: "concurrency",
      label: "Concurrent requests",
      span: 6,
      min: 1,
      description: "Each concurrent sequence needs its own cache. This multiplies.",
    },
    {
      kind: "select",
      name: "runtime",
      label: "Runtime",
      span: 6,
      options: [
        { value: "vllm", label: "vLLM", hint: "+10% overhead" },
        { value: "sglang", label: "SGLang", hint: "+10%" },
        { value: "tgi", label: "TGI", hint: "+15%" },
        { value: "llama.cpp", label: "llama.cpp", hint: "+5%" },
        { value: "transformers", label: "Transformers", hint: "+20%" },
      ],
    },
    {
      kind: "switch",
      name: "lora_finetune",
      label: "LoRA fine-tuning",
      span: 6,
      description: "Adds retained activations and optimizer state.",
    },
  ],
  submitLabel: "Estimate VRAM",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["total_vram_gb", "weights_gb", "kv_cache_gb", "attention"],
        emphasise: "total_vram_gb",
        labels: {
          total_vram_gb: "Total VRAM (GiB)",
          weights_gb: "Weights (GiB)",
          kv_cache_gb: "KV cache (GiB)",
          attention: "Attention",
        },
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "breakdown",
        title: "Where the memory goes",
        description: "Each term separately, because the total alone tells you nothing to act on.",
      },
      {
        kind: "table",
        key: "gpu_fit",
        title: "What it runs on",
        description:
          "Three states, not two — a card that cannot hold your full context can often hold a shorter one.",
        limit: 40,
      },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "k8s-estimate",
      label: "Size a Kubernetes deployment",
      values: ({ metrics }) => ({ vram_required_gb: Number(metrics.total_vram_gb ?? 0) }),
    },
  ],
  relatedTools: ["gpu-cost", "docker-compose", "k8s-estimate"],
};

export const gpuCostSpec: ToolSpec = {
  slug: "gpu-cost",
  group: "infra",
  eyebrow: "WF4",
  title: "GPU Cost Calculator",
  summary: "Self-hosting against a managed API, and the request volume where they cross.",
  keywords: ["gpu", "cost", "self-host", "break-even", "a100", "h100", "runpod", "lambda"],
  endpoint: "/api/v1/tools/infra/gpu-cost",
  tier: "free",
  input: z.object({
    gpu: z.string("Pick an instance.").min(1),
    hours_per_day: z.number().min(0.5).max(24),
    days_per_month: z.number().int().min(1).max(31),
    utilisation_pct: z.number().min(1).max(100),
    api_model_id: z.string().optional(),
    input_tokens: z.number().int().min(0).max(10_000_000).optional(),
    output_tokens: z.number().int().min(0).max(1_000_000).optional(),
    requests_per_day: z.number().int().min(0).max(100_000_000).optional(),
  }),
  defaults: {
    // A stable slug, not the generated row id — the latter changes on every
    // reseed, so a shared URL or a reopened run would point at nothing.
    gpu: "lambda-gpu-1x-h100-pcie",
    hours_per_day: 24,
    days_per_month: 30,
    utilisation_pct: 60,
    api_model_id: "gpt-4o-mini",
    input_tokens: 2000,
    output_tokens: 500,
    requests_per_day: 5000,
  },
  fields: [
    { kind: "gpu-select", name: "gpu", label: "GPU instance" },
    {
      kind: "slider",
      name: "hours_per_day",
      label: "Hours per day",
      span: 6,
      min: 1,
      max: 24,
      step: 1,
      format: (value) => `${value} h`,
    },
    { kind: "number", name: "days_per_month", label: "Days per month", span: 6, min: 1 },
    {
      kind: "slider",
      name: "utilisation_pct",
      label: "Utilisation",
      min: 1,
      max: 100,
      step: 5,
      unit: "%",
      description:
        "Share of paid hours doing real work. Idle GPU time is the single biggest reason self-hosting loses.",
    },
    { kind: "model-select", name: "api_model_id", label: "Compare against", family: "chat" },
    { kind: "number", name: "requests_per_day", label: "Requests per day", span: 6, min: 0 },
    { kind: "number", name: "input_tokens", label: "Input tokens", span: 6, min: 0 },
    { kind: "number", name: "output_tokens", label: "Output tokens", span: 6, min: 0 },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: [
          "break_even_requests_per_day",
          "self_host_monthly",
          "api_monthly",
          "effective_hourly",
        ],
        emphasise: "break_even_requests_per_day",
        labels: {
          break_even_requests_per_day: "Break-even / day",
          self_host_monthly: "Self-host / mo",
          api_monthly: "API / mo",
          effective_hourly: "Per productive hour",
        },
      },
      { kind: "callout" },
      {
        kind: "chart",
        key: "crossover",
        chart: "line",
        x: "requests_per_day",
        y: ["self_host", "api"],
        title: "Where the two cross",
        format: "currency",
      },
      { kind: "table", key: "comparison", title: "Side by side" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "model-roi",
      label: "Build the ROI case",
      values: ({ metrics }) => ({
        current_monthly_cost: Number(metrics.api_monthly ?? 0) || undefined,
        ai_monthly_cost: Number(metrics.self_host_monthly ?? 0),
      }),
    },
  ],
  relatedTools: ["vram-estimate", "cloud-cost", "llm-pricing"],
};

export const cloudCostSpec: ToolSpec = {
  slug: "cloud-cost",
  group: "infra",
  eyebrow: "WF4",
  title: "Cloud Cost Estimator",
  summary: "Compute, database, cache, storage — and the egress line nobody budgets for.",
  keywords: ["cloud", "aws", "gcp", "azure", "egress", "infrastructure"],
  endpoint: "/api/v1/tools/infra/cloud-cost",
  tier: "free",
  input: z.object({
    provider: z.enum(["aws", "gcp", "azure"]),
    compute_monthly: z.number().min(0),
    database_monthly: z.number().min(0),
    cache_monthly: z.number().min(0),
    storage_gb: z.number().min(0).max(10_000_000),
    egress_gb: z.number().min(0).max(10_000_000),
    load_balancer_monthly: z.number().min(0),
  }),
  defaults: {
    provider: "aws",
    compute_monthly: 800,
    database_monthly: 200,
    cache_monthly: 50,
    storage_gb: 1000,
    egress_gb: 2000,
    load_balancer_monthly: 25,
  },
  fields: [
    {
      kind: "radio-group",
      name: "provider",
      label: "Provider",
      options: [
        { value: "aws", label: "AWS", hint: "$0.09/GB egress" },
        { value: "gcp", label: "Google Cloud", hint: "$0.12/GB" },
        { value: "azure", label: "Azure", hint: "$0.087/GB" },
      ],
    },
    { kind: "currency", name: "compute_monthly", label: "Compute", unit: "/mo", span: 6, min: 0 },
    { kind: "currency", name: "database_monthly", label: "Database", unit: "/mo", span: 6, min: 0 },
    { kind: "currency", name: "cache_monthly", label: "Cache", unit: "/mo", span: 6, min: 0 },
    {
      kind: "currency",
      name: "load_balancer_monthly",
      label: "Load balancer",
      unit: "/mo",
      span: 6,
      min: 0,
    },
    { kind: "number", name: "storage_gb", label: "Storage", unit: "GB", span: 6, min: 0 },
    {
      kind: "number",
      name: "egress_gb",
      label: "Egress",
      unit: "GB/mo",
      span: 6,
      min: 0,
      description:
        "Every API response, log shipment, and backup leaving the region. Zero is rarely true.",
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["monthly_total", "annual_total", "egress_cost", "dominant_driver"],
        emphasise: "monthly_total",
        labels: {
          monthly_total: "Monthly",
          annual_total: "Annual",
          egress_cost: "Egress",
          dominant_driver: "Biggest line",
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
      { kind: "table", key: "lines", title: "Line by line" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "model-roi",
      label: "Build the ROI case",
      values: ({ metrics }) => ({ ai_monthly_cost: Number(metrics.monthly_total ?? 0) }),
    },
  ],
  relatedTools: ["gpu-cost", "budget-estimator"],
};

export const dockerComposeSpec: ToolSpec = {
  slug: "docker-compose",
  group: "infra",
  eyebrow: "WF4",
  title: "Docker Compose Generator",
  summary: "Curated AI stacks with GPU reservations, health checks, and named volumes.",
  keywords: ["docker", "compose", "ollama", "vllm", "qdrant", "pgvector", "self-host"],
  endpoint: "/api/v1/tools/infra/docker-compose",
  tier: "free",
  input: z.object({
    archetype: z.enum(["ollama-webui", "vllm-redis", "fastapi-pgvector", "rag-stack"]),
    model: z.string("Name the model to serve.").min(1).max(200),
    gpu: z.boolean(),
  }),
  defaults: { archetype: "ollama-webui", model: "llama3.1:8b", gpu: true },
  fields: [
    {
      kind: "radio-group",
      name: "archetype",
      label: "Stack",
      options: [
        { value: "ollama-webui", label: "Ollama + Open WebUI", hint: "quickest to a chat window" },
        { value: "vllm-redis", label: "vLLM + Redis", hint: "OpenAI-compatible serving" },
        { value: "rag-stack", label: "vLLM + Qdrant + Redis", hint: "full RAG" },
        { value: "fastapi-pgvector", label: "FastAPI + pgvector + Redis", hint: "one database" },
      ],
      description: "Curated AI stacks, not generic Compose generation.",
    },
    {
      kind: "text",
      name: "model",
      label: "Model",
      placeholder: "llama3.1:8b",
      span: 6,
      description: "Ollama tag or HuggingFace id. Colons are safe — the file is not string-built.",
    },
    { kind: "switch", name: "gpu", label: "GPU passthrough", span: 6 },
  ],
  submitLabel: "Generate",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["services", "files", "gpu_passthrough"],
        columns: 3,
        labels: { gpu_passthrough: "GPU passthrough" },
      },
      { kind: "callout" },
      { kind: "code", artifact: "compose", title: "docker-compose.yml" },
      { kind: "code", artifact: "env", title: ".env.example" },
      { kind: "json" },
    ],
  },
  relatedTools: ["vram-estimate", "k8s-estimate", "readiness-checklist"],
};

export const k8sEstimateSpec: ToolSpec = {
  slug: "k8s-estimate",
  group: "infra",
  eyebrow: "WF4",
  title: "Kubernetes Sizing",
  summary: "GPU-aware requests and limits, plus a Deployment, Service, HPA, and PDB.",
  keywords: ["kubernetes", "k8s", "hpa", "manifest", "deployment", "gpu"],
  endpoint: "/api/v1/tools/infra/k8s-estimate",
  tier: "free",
  input: z.object({
    name: z
      .string("Name the deployment.")
      .min(1)
      .max(50)
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only."),
    image: z.string("Name the image.").min(1).max(200),
    replicas: z.number().int().min(1).max(100),
    requests_per_second: z.number().min(0.1).max(100_000),
    gpu_count: z.number().int().min(0).max(8),
    vram_required_gb: z.number().min(0).max(2000),
    target_utilisation: z.number().int().min(10).max(95),
    max_replicas: z.number().int().min(1).max(200),
  }),
  defaults: {
    name: "inference",
    image: "vllm/vllm-openai:latest",
    replicas: 2,
    requests_per_second: 10,
    gpu_count: 1,
    vram_required_gb: 24,
    target_utilisation: 70,
    max_replicas: 8,
  },
  fields: [
    { kind: "text", name: "name", label: "Name", span: 6, placeholder: "inference" },
    { kind: "text", name: "image", label: "Image", span: 6 },
    { kind: "number", name: "replicas", label: "Replicas", span: 4, min: 1 },
    { kind: "number", name: "max_replicas", label: "Max replicas", span: 4, min: 1 },
    { kind: "number", name: "gpu_count", label: "GPUs per pod", span: 4, min: 0 },
    {
      kind: "number",
      name: "vram_required_gb",
      label: "VRAM required",
      unit: "GiB",
      span: 6,
      min: 0,
      description: "From the VRAM estimator. Drives the memory requests and limits.",
    },
    {
      kind: "number",
      name: "requests_per_second",
      label: "Peak throughput",
      unit: "rps",
      span: 6,
      min: 0.1,
    },
    {
      kind: "slider",
      name: "target_utilisation",
      label: "HPA target",
      min: 10,
      max: 95,
      step: 5,
      unit: "%",
    },
  ],
  submitLabel: "Generate manifests",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["gpus_total", "memory_request_gi", "memory_limit_gi", "rps_per_replica"],
        labels: {
          gpus_total: "GPUs total",
          memory_request_gi: "Memory request",
          memory_limit_gi: "Memory limit",
          rps_per_replica: "RPS / replica",
        },
      },
      { kind: "callout" },
      { kind: "table", key: "resources", title: "Requests and limits" },
      { kind: "code", artifact: "k8s-deployment", title: "deployment.yaml" },
      { kind: "code", artifact: "k8s-hpa", title: "hpa.yaml" },
      { kind: "code", artifact: "k8s-service", title: "service.yaml" },
      { kind: "code", artifact: "k8s-pdb", title: "pdb.yaml" },
      { kind: "json" },
    ],
  },
  relatedTools: ["vram-estimate", "docker-compose", "readiness-checklist"],
};

export const readinessChecklistSpec: ToolSpec = {
  slug: "readiness-checklist",
  group: "infra",
  eyebrow: "WF4",
  title: "Production Readiness",
  summary: "A scored checklist conditioned on the stack you actually described.",
  keywords: ["checklist", "readiness", "launch", "production", "audit", "security"],
  endpoint: "/api/v1/tools/infra/readiness-checklist",
  tier: "free",
  input: z.object({
    self_hosted: z.boolean(),
    has_rag: z.boolean(),
    completed: z.array(z.string()).max(60),
  }),
  defaults: { self_hosted: false, has_rag: true, completed: [] },
  fields: [
    {
      kind: "switch",
      name: "self_hosted",
      label: "Self-hosted models",
      span: 6,
      description: "Adds GPU failure, idle shutdown, and queue-depth autoscaling.",
    },
    {
      kind: "switch",
      name: "has_rag",
      label: "RAG or agent surface",
      span: 6,
      description: "Adds prompt-injection handling.",
    },
  ],
  submitLabel: "Score my stack",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["score", "completed", "applicable_items", "critical_outstanding"],
        emphasise: "score",
        labels: {
          score: "Score / 100",
          applicable_items: "Applicable",
          critical_outstanding: "Critical open",
        },
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "checklist",
        title: "The checklist",
        description: "Weighted by consequence, not by effort.",
        limit: 40,
      },
      { kind: "json" },
    ],
  },
  relatedTools: ["docker-compose", "k8s-estimate"],
};

export const INFRA_SPECS = [
  vramEstimateSpec,
  gpuCostSpec,
  cloudCostSpec,
  dockerComposeSpec,
  k8sEstimateSpec,
  readinessChecklistSpec,
];
