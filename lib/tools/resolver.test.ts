import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toolResolver } from "@/lib/tools/resolver";
import type { ToolSpec } from "@/lib/tools/spec";

/**
 * The resolver exists for one reason: a cleared number field holds `null`, and
 * zod has no opinion about `null` that is useful to a reader looking at an
 * empty box. These check the two halves of that — `null` reaching an optional
 * field must not fail, and `null` reaching a required one must say which field.
 */

const OPTIONS = { fields: {}, shouldUseNativeValidation: false, criteriaMode: "firstError" };

function resolve(spec: ToolSpec, values: Record<string, unknown>) {
  // The three properties `zodResolver` reads off its options argument; a real
  // `useForm` supplies a great deal more that none of this touches.
  return toolResolver(spec)(values, undefined, OPTIONS as never);
}

const base = {
  slug: "t",
  group: "cost",
  title: "T",
  summary: "",
  endpoint: "/api/v1/tools/cost/t",
  tier: "free",
  defaults: {},
  result: { blocks: [] },
} satisfies Omit<ToolSpec, "input" | "fields">;

describe("clearing a number field", () => {
  const spec: ToolSpec = {
    ...base,
    input: z.object({
      required_count: z.number().int().min(1),
      optional_pct: z.number().min(0).max(100).optional(),
    }),
    fields: [
      { kind: "number", name: "required_count", label: "Affected users" },
      { kind: "number", name: "optional_pct", label: "Adoption" },
    ],
  };

  it("is allowed on an optional field, and drops it from the payload", async () => {
    const result = await resolve(spec, { required_count: 12, optional_pct: null });

    expect(result.errors).toEqual({});
    // Not `optional_pct: null`, which `z.number().optional()` rejects outright.
    expect(result.values).toEqual({ required_count: 12 });
  });

  it("is reported against a required field by name", async () => {
    const result = await resolve(spec, { required_count: null, optional_pct: 70 });

    expect(result.errors.required_count?.message).toBe("Affected users is required.");
  });

  it("does not claim a filled field is empty when the type is simply wrong", async () => {
    // A decimal that crossed the wire as a string (D-08) and missed coercion.
    const result = await resolve(spec, { required_count: "12", optional_pct: 70 });

    expect(result.errors.required_count?.message).not.toBe("Affected users is required.");
  });

  it("still enforces the range once a number is present", async () => {
    const result = await resolve(spec, { required_count: 0 });

    expect(result.errors.required_count?.message).toBeTruthy();
    expect(result.errors.required_count?.message).not.toBe("Affected users is required.");
  });

  it("treats NaN as empty rather than as a value", async () => {
    const result = await resolve(spec, { required_count: Number.NaN });

    expect(result.errors.required_count?.message).toBe("Affected users is required.");
  });
});

describe("clearing a number inside a repeater row", () => {
  const spec: ToolSpec = {
    ...base,
    input: z.object({
      roles: z.array(
        z.object({
          name: z.string().min(1),
          hours: z.number().min(0),
          rate: z.number().min(1).optional(),
        }),
      ),
    }),
    fields: [
      {
        kind: "repeater",
        name: "roles",
        label: "Roles",
        itemLabel: "Role",
        newItem: () => ({ name: "", hours: 0 }),
        fields: [
          { kind: "text", name: "name", label: "Role" },
          { kind: "number", name: "hours", label: "Hours" },
          { kind: "currency", name: "rate", label: "Rate" },
        ],
      },
    ],
  };

  it("is allowed on an optional sub-field", async () => {
    const result = await resolve(spec, { roles: [{ name: "Backend", hours: 100, rate: null }] });

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ roles: [{ name: "Backend", hours: 100 }] });
  });

  it("names the sub-field when a required one is empty", async () => {
    const result = await resolve(spec, { roles: [{ name: "Backend", hours: null }] });

    const rows = result.errors.roles as { hours?: { message?: string } }[];
    expect(rows[0]?.hours?.message).toBe("Hours is required.");
  });
});
