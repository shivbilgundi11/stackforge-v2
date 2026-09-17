"use client";

import { RouteError } from "@/components/shell/route-status";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} homeLabel="Back to home" />;
}
