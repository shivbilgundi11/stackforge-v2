"use client";

import { useCallback, useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { isApiError, type ApiError } from "@/lib/api/errors";

/**
 * Maps an ApiError onto a form.
 *
 * 422 field errors land on their fields; everything else becomes a single
 * form-level message. This lives in one hook so all five auth forms behave
 * identically — and so the "which errors go inline vs. as a toast" decision is
 * made once.
 */
export function useFormErrors<T extends FieldValues>(setError: UseFormSetError<T>) {
  const [formError, setFormError] = useState<string | null>(null);

  const clear = useCallback(() => setFormError(null), []);

  const handle = useCallback(
    (error: unknown): void => {
      if (!isApiError(error)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      const apiError: ApiError = error;

      if (apiError.code === "VALIDATION_ERROR" && apiError.fieldErrors.length > 0) {
        let placedAny = false;
        for (const field of apiError.fieldErrors) {
          // The server's path is the request-body key, which matches the form
          // field name by construction — the schemas are generated from it.
          setError(field.path as Path<T>, { type: "server", message: field.message });
          placedAny = true;
        }
        if (!placedAny) setFormError(apiError.message);
        return;
      }

      if (apiError.code === "ACCOUNT_LOCKED") {
        const until = apiError.lockedUntil;
        const when = until ? new Date(until).toLocaleTimeString() : "shortly";
        setFormError(`Too many failed attempts. Try again after ${when}.`);
        return;
      }

      if (apiError.code === "RATE_LIMITED") {
        const seconds = apiError.retryAfter;
        setFormError(
          seconds
            ? `Too many attempts. Try again in ${seconds} seconds.`
            : "Too many attempts. Try again shortly.",
        );
        return;
      }

      setFormError(apiError.message);
    },
    [setError],
  );

  return { formError, setFormError, clearFormError: clear, handleError: handle };
}
