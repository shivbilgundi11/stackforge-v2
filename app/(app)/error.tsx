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
      description="This tool failed to load. Your saved work is unaffected — trying again usually clears it."
      homeHref="/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}
