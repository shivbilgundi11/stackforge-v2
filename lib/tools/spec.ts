import type { z } from "zod";

import type { ToolRunResult } from "@/lib/api/tools";

/**
 * The declarative tool contract.
 *
 * 28 of the ~72 surfaces in this product are a form, a POST, and a rendered
 * result. The previous build wrote that shape 27 separate times, so every
 * cross-cutting change — a provenance chip, a quota dialog, an export button —
 * was a 27-file edit. Here it is one component driven by these specs.
 *
 * A generator would have produced the same 27 files faster, with the same
 * maintenance problem. This is the alternative.
 */

export type ToolGroup = "cost" | "compare" | "rag" | "agents" | "infra" | "roi" | "architect";

// ── Fields ───────────────────────────────────────────────────────────────────

type FieldBase = {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  /** Rendered inside the control, right-aligned: "tokens", "/day", "%". */
  unit?: string;
  /** Columns out of 12 at `sm` and up. Defaults to full width. */
  span?: 4 | 6 | 8 | 12;
  /**
   * Conditional visibility. This predicate is what lets one spec express
   * "show quantisation options only when self-hosted is selected" without a
   * bespoke component.
   */
  showWhen?: (values: Record<string, unknown>) => boolean;
};

export type SelectOption = { value: string; label: string; hint?: string };

export type Field =
  | (FieldBase & { kind: "text" })
  | (FieldBase & { kind: "textarea"; rows?: number })
  | (FieldBase & { kind: "code"; language?: string; rows?: number })
  | (FieldBase & { kind: "number"; min?: number; max?: number; step?: number })
  | (FieldBase & { kind: "currency"; min?: number; max?: number; step?: number })
  | (FieldBase & {
      kind: "slider";
      min: number;
      max: number;
      step?: number;
      /** Formats the live value shown beside the label. */
      format?: (value: number) => string;
    })
  | (FieldBase & { kind: "select"; options: SelectOption[] })
  | (FieldBase & { kind: "multi-select"; options: SelectOption[]; max?: number })
  | (FieldBase & { kind: "radio-group"; options: SelectOption[] })
  | (FieldBase & { kind: "checkbox" })
  | (FieldBase & { kind: "switch" })
  | (FieldBase & { kind: "tag-input"; max?: number })
  | (FieldBase & { kind: "key-value"; max?: number })
  | (FieldBase & { kind: "file"; accept?: string })
  // Catalog-backed controls from M07. They carry live price and status inline,
  // so the number being used is visible before the calculation runs.
  | (FieldBase & {
      kind: "model-select";
      family?: "chat" | "embedding" | "rerank";
      multiple?: boolean;
      max?: number;
    })
  | (FieldBase & {
      kind: "tool-select";
      category?: string;
      multiple?: boolean;
      max?: number;
    })
  | (FieldBase & { kind: "gpu-select"; minVram?: number })
  /**
   * Open-weight model shapes, for VRAM estimation. Separate from
   * `model-select` because these are physical constants rather than priced
   * catalog rows, and the two lists barely overlap: you self-host Llama and
   * compare it against a hosted GPT.
   */
  | (FieldBase & { kind: "architecture-select" })
  /**
   * A repeating group of typed sub-fields — budget workload lines, infra
   * nodes, agent tool definitions. Generic rather than one-off because three
   * tools in this program need the same shape, and the third one discovering
   * that is how a bespoke component becomes three bespoke components.
   */
  | (FieldBase & {
      kind: "repeater";
      fields: Field[];
      itemLabel: string;
      min?: number;
      max?: number;
      newItem: () => Record<string, unknown>;
    });

export type FieldKind = Field["kind"];

// ── Result blocks ────────────────────────────────────────────────────────────

export type ResultBlock =
  | {
      kind: "metrics";
      keys?: string[];
      columns?: 2 | 3 | 4;
      emphasise?: string;
      /**
       * Override the derived label for specific keys.
       *
       * Titleising the key is right nearly always and wrong exactly when the
       * key is an abbreviation: `roi_12m_pct` becomes "Roi 12M Pct". Those
       * are worth naming by hand rather than teaching the humaniser about
       * every acronym in the product.
       */
      labels?: Record<string, string>;
    }
  | { kind: "table"; key: string; title?: string; description?: string; limit?: number }
  | {
      kind: "chart";
      key: string;
      chart: "line" | "area" | "bar";
      title?: string;
      x: string;
      y: string | string[];
      format?: "currency" | "number";
    }
  | { kind: "code"; artifact: string; title?: string }
  | { kind: "mermaid"; artifact: string; title?: string }
  | { kind: "checklist"; key: string; title?: string }
  | { kind: "callout" }
  | { kind: "json"; title?: string };

export type ResultSpec = {
  blocks: ResultBlock[];
  /**
   * The escape hatch, present from day one.
   *
   * An abstraction with no exit is abandoned the first time it does not fit,
   * and then you have an abstraction *and* a pile of bespoke pages. A tool
   * supplying its own result component still keeps the form, the mutation,
   * error mapping, quota handling, provenance, and the export slot.
   */
  component?: React.ComponentType<{ data: ToolRunResult }>;
};

// ── The spec ─────────────────────────────────────────────────────────────────

export type ToolPreset = {
  label: string;
  description?: string;
  values: Record<string, unknown>;
};

/**
 * "Use this result in another tool."
 *
 * Declared on the source spec rather than inferred, because only the source
 * knows what its numbers *mean*. `monthly_cost` from the embedding calculator
 * and `monthly_cost` from the budget estimator are both money per month and
 * are not interchangeable, so a generic key-matching handoff would produce
 * confident nonsense.
 *
 * A handoff that cannot be built honestly should not be declared. Carrying a
 * plausible-looking wrong number into the next tool is worse than carrying
 * nothing, because the user has no reason to re-check a field that arrived
 * pre-filled.
 */
export type ToolHandoff = {
  /** Target tool slug. Must be registered — `spec.test.ts` enforces it. */
  to: string;
  /** Button label. Says what happens, not where it goes: "Add as a workload". */
  label: string;
  description?: string;
  /**
   * Build the target's prefill.
   *
   * `metrics` are the source run's computed figures, `input` is what produced
   * them, and `targetDefaults` lets a handoff extend the destination's
   * defaults rather than replace them — which is how a single model id can
   * satisfy a target that requires at least two.
   */
  values: (context: {
    metrics: Record<string, unknown>;
    input: Record<string, unknown>;
    targetDefaults: Record<string, unknown>;
  }) => Record<string, unknown>;
};

export type ToolSpec = {
  slug: string;
  group: ToolGroup;
  /**
   * URL segment under the group. Defaults to `slug`.
   *
   * `compare-models` lives at `/compare/models` — repeating the group in
   * the path is noise, and the slug still has to be globally unique for
   * the registry.
   */
  path?: string;
  /** "WF1", "WF2" — the workflow badge above the title. */
  eyebrow?: string;
  title: string;
  summary: string;
  /** Extra ⌘K search terms beyond the title and slug. */
  keywords?: string[];
  endpoint: string;
  tier: "free" | "pro" | "team";
  input: z.ZodType;
  fields: Field[];
  presets?: ToolPreset[];
  defaults?: Record<string, unknown>;
  result: ResultSpec;
  /** Offered beneath a successful result. See `ToolHandoff`. */
  handoffs?: ToolHandoff[];
  relatedTools?: string[];
  docsHref?: string;
  /** Label for the submit button. Defaults to "Calculate". */
  submitLabel?: string;
};
