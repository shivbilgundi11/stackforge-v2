"use client";

import { useCallback, useMemo } from "react";
import { useQueryStates, parseAsString } from "nuqs";

import { coerceValues } from "@/lib/tools/coerce";
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

  const values = useMemo(() => coerceValues(spec.fields, raw), [spec.fields, raw]);

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
