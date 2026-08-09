import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api";

type Schemas = components["schemas"];

export type ToolRunResult = Schemas["ToolRunOut"];
export type ToolArtifact = Schemas["Artifact"];
export type ToolWarning = Schemas["ToolWarning"];
export type RunProvenance = Schemas["Provenance"];
export type Quota = Schemas["QuotaOut"];
export type RunSummary = Schemas["RunSummaryOut"];
export type CompareMeta = Schemas["CompareMetaOut"];

/**
 * One call for all 28 tools.
 *
 * The endpoint differs; the response never does. That is what lets
 * `<ToolPage>` be one component rather than 28.
 */
export function runTool(endpoint: string, input: unknown) {
  return apiFetch<ToolRunResult>(endpoint, { method: "POST", body: input });
}

export function getQuota() {
  return apiFetch<Quota>("/api/v1/runs/quota");
}

export function listRuns(params: { workflow?: string; limit?: number } = {}) {
  return apiFetch<RunSummary[]>("/api/v1/runs", {
    query: { workflow: params.workflow, limit: params.limit },
  });
}

export function getCompareMeta() {
  return apiFetch<CompareMeta>("/api/v1/tools/compare/meta");
}
