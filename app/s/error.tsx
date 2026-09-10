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
      title="This shared result could not be loaded."
      description="The link may have expired or been revoked by the person who shared it."
      homeLabel="Go to AIVeda"
    />
  );
}
