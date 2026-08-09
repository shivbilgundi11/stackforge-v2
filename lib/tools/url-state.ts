"use client";

import { useCallback, useMemo } from "react";
import { useQueryStates, parseAsString } from "nuqs";

import type { ToolSpec } from "@/lib/tools/spec";

/**
 * Tool inputs in the URL.
 *
 * A configured calculator has to be linkable — "here is the estimate, look at
 * the inputs" is how these results get used in a review, and a URL that
 * restores nothing makes the reader rebuild the case by hand.
 *
 * Everything serialises through `parseAsString` and is coerced back on read
 * rather than one parser per field kind. A query string is text; a numeric
 * parser that turns `?n=` into `0` produces a form that silently disagrees
 * with the link that was shared.
 */

type Values = Record<string, unknown>;

export function useToolUrlState(spec: ToolSpec): [Values, (values: Values) => void] {
  const parsers = useMemo(
    () =>
      Object.fromEntries(spec.fields.map((field) => [field.name, parseAsString])) as Record<
        string,
        typeof parseAsString
      >,
    [spec.fields],
  );

  const [raw, setRaw] = useQueryStates(parsers, {
    history: "replace",
    // Long text and file contents do not belong in a URL; the field list
    // below filters them out on write.
    clearOnDefault: true,
  });

  const values = useMemo(() => coerce(spec, raw), [spec, raw]);

  const write = useCallback(
    (next: Values) => {
      const serialisable: Record<string, string | null> = {};
      for (const field of spec.fields) {
        if (field.kind === "file" || field.kind === "code" || field.kind === "textarea") {
          continue;
        }
        const value = next[field.name];
        serialisable[field.name] =
          value === undefined || value === null || value === ""
            ? null
            : Array.isArray(value)
              ? value.join(",")
              : String(value);
      }
      void setRaw(serialisable);
    },
    [spec.fields, setRaw],
  );

  return [values, write];
}

/** Query strings are text. Put the field's declared type back on. */
function coerce(spec: ToolSpec, raw: Record<string, string | null>): Values {
  const values: Values = {};

  for (const field of spec.fields) {
    const value = raw[field.name];
    if (value === null || value === undefined || value === "") continue;

    switch (field.kind) {
      case "number":
      case "currency":
      case "slider": {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) values[field.name] = parsed;
        break;
      }
      case "checkbox":
      case "switch":
        values[field.name] = value === "true";
        break;
      case "multi-select":
      case "tag-input":
        values[field.name] = value.split(",").filter(Boolean);
        break;
      case "model-select":
      case "tool-select":
        values[field.name] = field.multiple ? value.split(",").filter(Boolean) : value;
        break;
      default:
        values[field.name] = value;
    }
  }

  return values;
}
