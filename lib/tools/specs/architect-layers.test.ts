import { describe, expect, it } from "vitest";

import { stackArchitectSpec } from "@/lib/tools/specs/architect";

/**
 * M25 — the compute and guardrails intake.
 *
 * The whole design rests on the new questions costing an existing user
 * nothing: the defaults leave the recommendation exactly as it was, and the
 * three questions that only matter once a machine is being rented stay out of
 * the form until one is. Both are properties of this spec, so both are
 * asserted here rather than left to a screenshot.
 */

const FIELDS = new Map(stackArchitectSpec.fields.map((field) => [field.name, field]));

function shownWith(values: Record<string, unknown>): string[] {
  return stackArchitectSpec.fields
    .filter((field) => !field.showWhen || field.showWhen(values))
    .map((field) => field.name);
}

describe("the model-infrastructure questions", () => {
  it("defaults to the answers that leave the stack unchanged", () => {
    expect(stackArchitectSpec.defaults).toMatchObject({
      model_hosting: "api",
      workload: "inference",
      traffic: "steady",
      residency: "any",
    });
  });

  it("accepts every default it declares", () => {
    const parsed = stackArchitectSpec.input.safeParse(stackArchitectSpec.defaults);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("asks nothing about GPUs until the weights are self-hosted", () => {
    const shown = shownWith({ ...stackArchitectSpec.defaults, model_hosting: "api" });

    expect(shown).not.toContain("workload");
    expect(shown).not.toContain("traffic");
    // Residency constrains the vector store as much as the machine, so it is
    // asked of every stack.
    expect(shown).toContain("residency");
    expect(shown).toContain("model_hosting");
  });

  it("asks all three once a machine is being rented", () => {
    const shown = shownWith({ ...stackArchitectSpec.defaults, model_hosting: "self-hosted" });

    expect(shown).toContain("workload");
    expect(shown).toContain("traffic");
  });

  it("does not ask about GPUs when someone else hosts the open weights", () => {
    const shown = shownWith({
      ...stackArchitectSpec.defaults,
      model_hosting: "managed-open-weights",
    });

    expect(shown).not.toContain("workload");
    expect(shown).not.toContain("traffic");
  });

  it("offers every value the API accepts, and no others", () => {
    for (const [name, expected] of [
      ["model_hosting", ["api", "managed-open-weights", "self-hosted"]],
      ["workload", ["inference", "fine-tuning", "training"]],
      ["traffic", ["steady", "spiky", "batch"]],
      ["residency", ["any", "eu", "in", "us"]],
    ] as const) {
      const field = FIELDS.get(name);
      expect(field, `${name} is not on the form`).toBeDefined();
      const options = "options" in field! ? field.options.map((option) => option.value) : [];
      expect(options.sort(), name).toEqual([...expected].sort());
    }
  });
});

describe("the cost handoff", () => {
  const handoff = stackArchitectSpec.handoffs?.find((entry) => entry.to === "gpu-cost");

  it("exists, because the architect deliberately does not produce a bill", () => {
    expect(handoff).toBeDefined();
  });

  it("stays hidden on a stack that rented no machine", () => {
    expect(handoff?.showWhen?.({ metrics: {}, input: {} })).toBe(false);
  });

  it("opens the calculator on the instance the stack chose", () => {
    const metrics = { compute_gpu: "lambda-gpu-8x-h100-sxm5" };

    expect(handoff?.showWhen?.({ metrics, input: {} })).toBe(true);
    expect(
      handoff?.values({ metrics, input: {}, targetDefaults: { gpu: "something-else", hours: 4 } }),
    ).toMatchObject({ gpu: "lambda-gpu-8x-h100-sxm5", hours: 4 });
  });
});
