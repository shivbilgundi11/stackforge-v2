import { describe, expect, it } from "vitest";
import type { z } from "zod";

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
] as const satisfies readonly ApiPath[];

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
