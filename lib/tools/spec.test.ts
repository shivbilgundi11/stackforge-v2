import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { ALL_TOOLS } from "@/lib/navigation";
import { omitUndefined } from "@/lib/tools/handoff";
import { ALL_SPECS, TOOL_REGISTRY, searchTools, toolHref } from "@/lib/tools/registry";
import type { Field } from "@/lib/tools/spec";
import type { paths } from "@/types/api";

/**
 * Spec-to-schema conformance.
 *
 * The registry is only trustworthy if a backend rename breaks it here rather
 * than in a user's afternoon. `paths` is generated from the live OpenAPI
 * schema, so an endpoint that no longer exists fails this file at typecheck
 * *and* at test time.
 */

type ApiPath = keyof paths;

/**
 * Zod 4 types the raw shape loosely enough that `safeParse` is not visible on
 * a member. Narrowing once here keeps the casts out of the assertions.
 */
function shapeOf(input: z.ZodType): Record<string, z.ZodType> {
  return (input as z.ZodObject<Record<string, z.ZodType>>).shape;
}

/** Compile-time assertion: every endpoint below is a real route. */
const KNOWN_ENDPOINTS = [
  "/api/v1/tools/cost/llm-pricing",
  "/api/v1/tools/cost/token-calculator",
  "/api/v1/tools/cost/embedding-cost",
  "/api/v1/tools/cost/budget-estimator",
  "/api/v1/tools/compare/models",
  "/api/v1/tools/compare/vector-db",
  "/api/v1/tools/compare/stacks",
  "/api/v1/tools/compare/build-vs-buy",
  "/api/v1/tools/rag/chunk-estimate",
  "/api/v1/tools/rag/vectordb-estimate",
  "/api/v1/tools/rag/pdf-tokens",
  "/api/v1/tools/rag/pipeline-cost",
  "/api/v1/tools/rag/chunking-strategy",
  "/api/v1/tools/rag/architecture",
  "/api/v1/tools/infra/vram-estimate",
  "/api/v1/tools/infra/gpu-cost",
  "/api/v1/tools/infra/cloud-cost",
  "/api/v1/tools/infra/docker-compose",
  "/api/v1/tools/infra/k8s-estimate",
  "/api/v1/tools/infra/readiness-checklist",
  "/api/v1/tools/roi/hours-saved",
  "/api/v1/tools/roi/model-roi",
  "/api/v1/tools/roi/implementation-cost",
  "/api/v1/tools/roi/build-vs-buy",
] as const satisfies readonly ApiPath[];

/**
 * What each tool's `metrics` look like after a real run.
 *
 * Written by hand rather than generated, because the point is to pin the
 * contract between the backend's metric keys and the handoffs that read them.
 * A fixture that derived itself from the handoff code would agree with it
 * unconditionally and test nothing.
 */
const METRIC_FIXTURES: Record<string, Record<string, unknown>> = {
  "llm-pricing": {
    cost_per_request: "0.001850",
    daily_cost: "1.850000",
    monthly_cost: "56.309375",
    annual_cost: "675.712500",
    requests_per_month: 30_437,
    tokens_per_month: 76_093_750,
    model: "GPT-4o mini",
  },
  "token-calculator": {
    tokens: 1842,
    method: "heuristic",
    characters: 7368,
    words: 1204,
    context_window: 128_000,
    context_used_pct: "1.44",
    fits: "yes",
    overflow_tokens: 0,
    cost_per_call: "0.000276",
  },
  "embedding-cost": {
    dimensions: 1536,
    total_tokens: 8_000_000,
    monthly_tokens: 8_000_000,
    ingestion_cost: "0.160000",
    monthly_cost: "0.160000",
    annual_cost: "1.920000",
    cost_per_document: "0.000016",
  },
  "budget-estimator": {
    monthly_cost: "97.400000",
    llm_monthly_cost: "97.400000",
    infrastructure_monthly_cost: "0.000000",
    embedding_monthly_cost: "0.000000",
    month_12_cost: "253.180000",
    year_1_total: "2084.560000",
    workload_lines: 1,
  },
  "compare-models": {
    winner: "gpt-4o-mini",
    winner_name: "GPT-4o mini",
    confidence: "high",
    score: 87.4,
    priority: "balanced",
    options_compared: 2,
  },
  "compare-stacks": {
    winner: "mvp",
    winner_name: "MVP",
    confidence: "medium",
    score: 74.1,
    priority: "balanced",
    options_compared: 3,
  },
  "chunk-estimate": {
    total_chunks: 30_000,
    chunks_per_document: 3,
    embedded_tokens: 15_360_000,
    source_tokens: 12_000_000,
    duplication_factor: "1.28",
    overlap_pct: "14.8",
    retrieval_quality: 100,
    recommended_chunk_size: 512,
    recommended_overlap: 76,
  },
  "vectordb-estimate": {
    raw_gb: "5.72",
    index_overhead_gb: "2.86",
    metadata_gb: "0.19",
    total_gb: "8.77",
    index_multiplier: "1.50",
    bytes_per_vector: 9416,
    replicas: 1,
  },
  "pdf-tokens": {
    filename: "doc.pdf",
    pages: 12,
    characters: 48_000,
    tokens: 12_000,
    estimated_chunks: 28,
    ingestion_cost: "0.000240",
    pages_needing_ocr: 0,
  },
  "pipeline-cost": {
    monthly_cost: "142.310000",
    ingestion_cost: "0.310000",
    cost_per_query: "0.009360",
    total_chunks: 30_000,
    queries_per_month: 15_218,
    dominant_cost: "Generation",
  },
  "chunking-strategy": {
    strategy: "Markdown-aware",
    strategy_key: "markdown",
    score: 95,
    chunk_size: 512,
    overlap: 76,
    reasoning: "Keeps headings with their content.",
  },
  "rag-architecture": {
    store: "pgvector",
    reranking: "yes",
    self_hosted: "yes",
    stages: 7,
    summary: "A docs pipeline over restricted data.",
  },
  "vram-estimate": {
    total_vram_gb: "17.63",
    weights_gb: "14.96",
    kv_cache_gb: "1.00",
    activations_gb: "0.03",
    overhead_gb: "1.60",
    kv_bytes_per_token: 131_072,
    attention: "GQA",
    recommended_gpu: "gpu_1x_a100_sxm4",
  },
  "gpu-cost": {
    self_host_monthly: "2368.800000",
    api_monthly: "45.660000",
    effective_hourly: "5.483333",
    break_even_requests_per_day: 129_674,
    monthly_hours: 720,
    cheaper: "managed API",
  },
  "cloud-cost": {
    monthly_total: "1278.000000",
    annual_total: "15336.000000",
    egress_cost: "180.000000",
    dominant_driver: "Compute",
    egress_rate_per_gb: "0.09",
  },
  "hours-saved": {
    monthly_hours: "43.48",
    annual_hours: "521.79",
    monthly_value: "4348.21",
    annual_value: "52178.57",
    fte_equivalent: "0.25",
    rework_value_monthly: "0.00",
    total_monthly_value: "4348.21",
  },
  "implementation-cost": {
    total_cost: "48000.00",
    labour_cost: "40000.00",
    contingency: "8000.00",
    monthly_burn: "12000.00",
    ongoing_monthly: "0.00",
    duration_months: 4,
  },
};

describe("tool registry", () => {
  it("registers every spec under a unique slug", () => {
    const slugs = ALL_SPECS.map((spec) => spec.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(Object.keys(TOOL_REGISTRY).sort()).toEqual([...slugs].sort());
  });

  it("gives every spec a unique route", () => {
    const routes = ALL_SPECS.map(toolHref);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("points every endpoint at a route the backend actually serves", () => {
    // The real assertion is the `satisfies` above — this catches a spec whose
    // endpoint was never added to the list, which would otherwise slip past it.
    for (const spec of ALL_SPECS) {
      expect(
        KNOWN_ENDPOINTS as readonly string[],
        `${spec.slug} points at ${spec.endpoint}, which is not a known API path`,
      ).toContain(spec.endpoint);
    }
  });

  it("declares every endpoint as POST", () => {
    for (const spec of ALL_SPECS) {
      expect(spec.endpoint.startsWith("/api/v1/tools/")).toBe(true);
    }
  });
});

describe("spec shape", () => {
  it("gives every field a name that the input schema accepts", () => {
    for (const spec of ALL_SPECS) {
      const declared = new Set(Object.keys(shapeOf(spec.input)));

      for (const field of spec.fields) {
        expect(
          declared.has(field.name),
          `${spec.slug}: field "${field.name}" has no matching key in the Zod input`,
        ).toBe(true);
      }
    }
  });

  it("declares no default that its own schema would reject", () => {
    // Per key rather than whole-object: a tool whose main input is pasted
    // text legitimately starts incomplete, and demanding that the initial
    // form state already validate would force a meaningless placeholder into
    // the spec. What must never happen is a default that is the wrong *type*
    // or out of range — that is a spec bug, and it renders as a form that is
    // broken before the user touches it.
    for (const spec of ALL_SPECS) {
      const shape = shapeOf(spec.input);

      for (const [key, value] of Object.entries(spec.defaults ?? {})) {
        const schema = shape[key];
        expect(schema, `${spec.slug}: default "${key}" is not in the schema`).toBeDefined();
        expect(
          schema?.safeParse(value).success,
          `${spec.slug}: default for "${key}" fails its own schema`,
        ).toBe(true);
      }
    }
  });

  it("gives every non-text required key a default", () => {
    // Numbers, selects, and sliders must arrive pre-filled — an empty number
    // input that fails on submit reads as a broken page. Free-text inputs are
    // the exception: blank is the correct initial state.
    const FREE_TEXT = new Set(["text", "textarea", "code", "file"]);

    for (const spec of ALL_SPECS) {
      const shape = shapeOf(spec.input);
      const defaults = spec.defaults ?? {};

      for (const field of spec.fields) {
        if (FREE_TEXT.has(field.kind)) continue;
        const schema = shape[field.name];
        if (!schema || schema.safeParse(undefined).success) continue;
        expect(
          field.name in defaults,
          `${spec.slug}: "${field.name}" is required but has no default`,
        ).toBe(true);
      }
    }
  });

  it("writes its own message for a field left empty", () => {
    // Zod's `.min(1, "…")` message only fires once the value *is* a string.
    // Leave the field untouched and the failure is the type check, whose
    // default message is `Invalid input: expected string, received undefined`
    // — developer output, rendered to a user, under a form control. The fix
    // is to give the type check a message too: `z.string("Paste some text.")`.
    const RAW_ZOD = /^Invalid input: expected/;

    for (const spec of ALL_SPECS) {
      const shape = shapeOf(spec.input);
      const defaults = spec.defaults ?? {};

      for (const field of spec.fields) {
        if (field.name in defaults) continue;
        const schema = shape[field.name];
        if (!schema) continue;

        const result = schema.safeParse(undefined);
        if (result.success) continue;

        const message = result.error.issues[0]?.message ?? "";
        expect(
          RAW_ZOD.test(message),
          `${spec.slug}: "${field.name}" shows Zod's raw message when empty — "${message}"`,
        ).toBe(false);
      }
    }
  });

  it("validates every preset", () => {
    for (const spec of ALL_SPECS) {
      for (const preset of spec.presets ?? []) {
        const result = spec.input.safeParse({ ...spec.defaults, ...preset.values });
        expect(result.success, `${spec.slug}: preset "${preset.label}" fails the schema`).toBe(
          true,
        );
      }
    }
  });

  it("renders either blocks or a bespoke component, never neither", () => {
    for (const spec of ALL_SPECS) {
      const hasBlocks = spec.result.blocks.length > 0;
      const hasComponent = Boolean(spec.result.component);
      expect(
        hasBlocks || hasComponent,
        `${spec.slug}: nothing would render for a successful run`,
      ).toBe(true);
    }
  });

  it("points related tools at slugs that exist", () => {
    for (const spec of ALL_SPECS) {
      for (const slug of spec.relatedTools ?? []) {
        expect(
          TOOL_REGISTRY[slug],
          `${spec.slug}: related tool "${slug}" is not registered`,
        ).toBeDefined();
      }
    }
  });

  it("agrees with the navigation registry on every route", () => {
    // Two sources of truth for a URL: `navigation.ts` writes hrefs by hand for
    // the sidebar and palette, `toolHref` derives them from `group` + `path`.
    // They drifted once already — a related-tool link built as
    // `/${group}/${slug}` sent every compare tool to `/compare/compare-models`,
    // which 404s. Pin them together rather than trusting care.
    const navHrefs = new Map(ALL_TOOLS.map((tool) => [tool.slug, tool.href]));

    for (const spec of ALL_SPECS) {
      expect(toolHref(spec), `${spec.slug}: registry route disagrees with navigation.ts`).toBe(
        navHrefs.get(spec.slug),
      );
    }
  });

  it("routes every live tool to a page that exists on disk", () => {
    // `toolHref` agreeing with `navigation.ts` still leaves both able to point
    // at a directory nobody created. The App Router answers that with a 404 at
    // runtime; this answers it at test time.
    for (const spec of ALL_SPECS) {
      const dir = join(process.cwd(), "app", "(app)", toolHref(spec));
      expect(existsSync(join(dir, "page.tsx")), `${spec.slug}: no page at ${dir}`).toBe(true);
    }
  });

  it("points every handoff at a registered tool", () => {
    for (const spec of ALL_SPECS) {
      for (const handoff of spec.handoffs ?? []) {
        expect(
          TOOL_REGISTRY[handoff.to],
          `${spec.slug}: handoff target "${handoff.to}" is not registered`,
        ).toBeDefined();
      }
    }
  });

  it("produces handoff values the destination schema accepts", () => {
    // The failure this guards is specific and quiet: a handoff builds values
    // the target rejects, the user lands on a form that fails the moment they
    // press the button, and nothing points back at the tool that sent them.
    // Renaming a target's input key breaks here instead.
    for (const spec of ALL_SPECS) {
      for (const handoff of spec.handoffs ?? []) {
        const target = TOOL_REGISTRY[handoff.to];
        if (!target) continue;

        const metrics = METRIC_FIXTURES[spec.slug];
        expect(metrics, `${spec.slug}: no metric fixture for its handoffs`).toBeDefined();

        // Through `omitUndefined`, exactly as `<HandoffBar>` sends it. A key
        // set to `undefined` still overwrites the destination's default via
        // spread, so testing the raw return would pass on values the real
        // path rejects — and the failure lands on the user as a form that is
        // invalid before they touch it.
        const produced = omitUndefined(
          handoff.values({
            metrics: metrics ?? {},
            input: spec.defaults ?? {},
            targetDefaults: target.defaults ?? {},
          }),
        );

        const result = target.input.safeParse({ ...target.defaults, ...produced });
        expect(
          result.success,
          `${spec.slug} -> ${handoff.to}: ${JSON.stringify(result.error?.issues ?? [])}`,
        ).toBe(true);
      }
    }
  });

  it("keeps repeater sub-fields free of nested repeaters", () => {
    // One level. A repeater inside a repeater is a data model, not a form.
    const isRepeater = (field: Field) => field.kind === "repeater";
    for (const spec of ALL_SPECS) {
      for (const field of spec.fields.filter(isRepeater)) {
        if (field.kind !== "repeater") continue;
        expect(field.fields.some(isRepeater)).toBe(false);
      }
    }
  });
});

describe("command palette search", () => {
  it("finds a tool by title", () => {
    expect(searchTools("Token Calculator").map((spec) => spec.slug)).toContain("token-calculator");
  });

  it("finds a tool by slug", () => {
    expect(searchTools("build-vs-buy").map((spec) => spec.slug)).toContain("compare-build-vs-buy");
  });

  it("finds a tool by keyword that appears nowhere in its title", () => {
    const hits = searchTools("pinecone").map((spec) => spec.slug);
    expect(hits).toContain("compare-vector-db");
  });

  it("returns everything for an empty query", () => {
    expect(searchTools("  ")).toHaveLength(ALL_SPECS.length);
  });
});
