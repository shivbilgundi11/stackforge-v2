import type { Field } from "@/lib/tools/spec";

/**
 * Put a field's declared type back on a loosely-typed value.
 *
 * Two callers need this and they are loose in different ways. A query string
 * is entirely text. A stored run's input is JSON, but money and ratios cross
 * the wire as decimal *strings* (D-08), so `cached_input_ratio` comes back as
 * `"0.7"` and a slider handed a string renders at zero — silently, with no
 * error, showing the wrong configuration for a result that is right.
 *
 * Coercing in one place means a new field kind is handled for the URL and for
 * reopened runs at the same time, rather than the second one being discovered
 * later by whoever clicks a history entry.
 */

type Values = Record<string, unknown>;

export function coerceValue(field: Field, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === "") return undefined;

  switch (field.kind) {
    case "number":
    case "currency":
    case "slider": {
      const parsed = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    case "checkbox":
    case "switch":
      return typeof raw === "boolean" ? raw : raw === "true";

    case "multi-select":
    case "tag-input":
      return toList(raw);

    case "model-select":
    case "tool-select":
      return field.multiple ? toList(raw) : String(raw);

    case "repeater": {
      if (!Array.isArray(raw)) return undefined;
      return raw.map((item) => coerceValues(field.fields, (item ?? {}) as Values));
    }

    default:
      return raw;
  }
}

export function coerceValues(fields: Field[], raw: Values): Values {
  const values: Values = {};

  for (const field of fields) {
    const coerced = coerceValue(field, raw[field.name]);
    if (coerced !== undefined) values[field.name] = coerced;
  }

  return values;
}

/** A comma-joined string from a URL, or an array from JSON. Both mean a list. */
function toList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw).split(",").filter(Boolean);
}
