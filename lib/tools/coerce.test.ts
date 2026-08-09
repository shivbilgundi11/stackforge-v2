import { describe, expect, it } from "vitest";

import { coerceValues } from "@/lib/tools/coerce";
import { llmPricingSpec, budgetEstimatorSpec } from "@/lib/tools/specs/cost";
import type { Field } from "@/lib/tools/spec";

/**
 * The failure this file exists for is quiet.
 *
 * Nothing throws when a slider is handed the string "0.7" — it renders at
 * zero, next to a result computed with 0.7. The user sees a configuration
 * that disagrees with its own answer and has no reason to suspect the form
 * rather than the arithmetic.
 */

describe("coercing a stored run's input", () => {
  it("turns a decimal string back into a number for a slider", () => {
    // Money and ratios cross the wire as strings (D-08), so this is what a
    // reopened run actually contains — not a hypothetical.
    const values = coerceValues(llmPricingSpec.fields, {
      model_id: "claude-opus-5",
      input_tokens: 4000,
      output_tokens: 800,
      requests_per_day: 1000,
      cached_input_ratio: "0.7",
    });

    expect(values.cached_input_ratio).toBe(0.7);
    expect(typeof values.cached_input_ratio).toBe("number");
  });

  it("keeps a zero rather than dropping it", () => {
    // `0` is falsy and a meaningful setting: "no caching" must survive.
    const values = coerceValues(llmPricingSpec.fields, { cached_input_ratio: 0 });
    expect(values.cached_input_ratio).toBe(0);
  });

  it("drops a key the run did not carry instead of writing undefined", () => {
    const values = coerceValues(llmPricingSpec.fields, { model_id: "gpt-4o-mini" });
    expect("cached_input_ratio" in values).toBe(false);
  });

  it("coerces inside a repeater, one level down", () => {
    const values = coerceValues(budgetEstimatorSpec.fields, {
      lines: [
        {
          name: "Chat",
          model_id: "gpt-4o-mini",
          requests_per_day: "2000",
          input_tokens: "1500",
          output_tokens: 400,
        },
      ],
      monthly_growth_pct: "10",
    });

    expect(values.monthly_growth_pct).toBe(10);
    expect(values.lines).toEqual([
      {
        name: "Chat",
        model_id: "gpt-4o-mini",
        requests_per_day: 2000,
        input_tokens: 1500,
        output_tokens: 400,
      },
    ]);
  });

  it("reads a list from either an array or a comma-joined string", () => {
    // JSON gives an array; a URL gives text. Both mean the same selection.
    const field: Field = {
      kind: "model-select",
      name: "model_ids",
      label: "Models",
      multiple: true,
    };

    expect(coerceValues([field], { model_ids: ["a", "b"] }).model_ids).toEqual(["a", "b"]);
    expect(coerceValues([field], { model_ids: "a,b" }).model_ids).toEqual(["a", "b"]);
  });

  it("rejects a number that is not one instead of passing NaN to the form", () => {
    const values = coerceValues(llmPricingSpec.fields, { input_tokens: "not a number" });
    expect("input_tokens" in values).toBe(false);
  });

  it("round-trips a reopened run into something its own schema accepts", () => {
    // The end-to-end property: what the API stored, coerced back, must be
    // submittable again without the user touching anything.
    const stored = {
      model_id: "claude-opus-5",
      input_tokens: 4000,
      output_tokens: 800,
      requests_per_day: 1000,
      cached_input_ratio: "0.7",
      compare_provider: null,
    };

    const restored = {
      ...llmPricingSpec.defaults,
      ...coerceValues(llmPricingSpec.fields, stored),
    };

    expect(llmPricingSpec.input.safeParse(restored).success).toBe(true);
  });
});
