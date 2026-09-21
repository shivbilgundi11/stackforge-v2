"use client";

import { RouteError } from "@/components/shell/route-status";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      description="We could not load this step. Trying again usually clears it, and your account is unaffected."
      homeHref="/login"
      homeLabel="Back to sign in"
    />
  );
}
