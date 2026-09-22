import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldErrors, Resolver } from "react-hook-form";

import type { Field, ToolSpec } from "@/lib/tools/spec";

/**
 * The tool form's resolver: zod, plus the two numeric edges zod cannot see.
 *
 * A cleared number input holds `null`, not `undefined`. A controlled input
 * needs something to render, and `undefined` makes React hand the field back
 * to the DOM — so "empty" has to be a real value. The schemas, meanwhile,
 * spell an optional number `z.number().optional()`, which accepts `undefined`
 * and rejects `null`. Left alone, emptying an optional field would fail
 * validation for being empty, which is the one thing optional is meant to
 * permit. Here `null` means "not provided", so it is dropped before the schema
 * runs — in one place, rather than 39 `.nullish()` edits across seven specs.
 *
 * What survives that is a required number the user has genuinely left blank,
 * and zod reports it as "Invalid input: expected number, received undefined".
 * Accurate, and no help at all beside an input the reader can see is empty; it
 * is relabelled with the field's own name.
 */

type Values = Record<string, unknown>;

const NUMERIC = new Set(["number", "currency", "slider"]);

export function toolResolver(spec: ToolSpec): Resolver<Values> {
  const base = zodResolver(spec.input as never) as Resolver<Values>;

  return async (values, context, options) => {
    const cleaned = dropBlanks(spec.fields, values);
    const result = await base(cleaned, context, options);
    // `errors` is `{}` on success, so this is a no-op on the happy path.
    relabelMissing(spec.fields, result.errors as FieldErrors<Values>, cleaned);
    return result;
  };
}

/**
 * Strip empty numbers so the schema reads them as absent. Repeater rows are
 * walked too — `agents.0.steps_per_task` is as clearable as any other field,
 * and a row's cleared number has to reach the schema the same way.
 */
function dropBlanks(fields: Field[], values: Values): Values {
  const next: Values = { ...values };

  for (const field of fields) {
    if (NUMERIC.has(field.kind)) {
      if (isBlank(next[field.name])) delete next[field.name];
      continue;
    }

    const rows = next[field.name];
    if (field.kind === "repeater" && Array.isArray(rows)) {
      next[field.name] = rows.map((row) => dropBlanks(field.fields, (row ?? {}) as Values));
    }
  }

  return next;
}

/** NaN is never emitted, but it survives arithmetic and would read as a value. */
function isBlank(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isNaN(value));
}

/**
 * Replace zod's type message on a blank required number with the field label.
 *
 * Keyed on the issue code rather than the message text, so a zod release that
 * rewords its own diagnostics does not quietly turn this back into "expected
 * number, received undefined". Narrowed to fields that really are absent, so a
 * value of the wrong type — a decimal that crossed the wire as a string and
 * missed coercion — still reports what is actually wrong with it rather than
 * claiming a filled field is empty.
 */
function relabelMissing(fields: Field[], errors: FieldErrors<Values>, cleaned: Values): void {
  for (const field of fields) {
    const error = errors[field.name];
    if (!error) continue;

    if (NUMERIC.has(field.kind)) {
      if (error.type === "invalid_type" && cleaned[field.name] === undefined) {
        error.message = `${field.label} is required.`;
      }
      continue;
    }

    const rows = cleaned[field.name];
    if (field.kind === "repeater" && Array.isArray(error) && Array.isArray(rows)) {
      error.forEach((row, index) => {
        if (row) {
          relabelMissing(field.fields, row as FieldErrors<Values>, (rows[index] ?? {}) as Values);
        }
      });
    }
  }
}
