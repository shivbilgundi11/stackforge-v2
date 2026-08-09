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
  | { kind: "metrics"; keys?: string[]; columns?: 2 | 3 | 4; emphasise?: string }
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
  relatedTools?: string[];
  docsHref?: string;
  /** Label for the submit button. Defaults to "Calculate". */
  submitLabel?: string;
};
