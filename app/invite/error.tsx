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
      title="This invitation could not be loaded."
      description="The link may have expired, been revoked, or already been accepted."
      homeLabel="Go to Buildtact"
    />
  );
}
