import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api";

type Schemas = components["schemas"];

export type ToolRunResult = Schemas["ToolRunOut"];
export type ToolArtifact = Schemas["Artifact"];
export type ToolWarning = Schemas["ToolWarning"];
export type RunProvenance = Schemas["Provenance"];
export type Quota = Schemas["QuotaOut"];
export type RunSummary = Schemas["RunSummaryOut"];
export type RunDetail = Schemas["RunDetailOut"];
export type CompareMeta = Schemas["CompareMetaOut"];

/**
 * One call for all 28 tools.
 *
 * The endpoint differs; the response never does. That is what lets
 * `<ToolPage>` be one component rather than 28.
 */
export function runTool(endpoint: string, input: unknown) {
  // One tool takes a file. Rather than give `pdf-tokens` its own submit path
  // — and with it its own error handling, quota handling, and provenance —
  // the values are packed into a FormData here and everything downstream
  // stays identical.
  const values = (input ?? {}) as Record<string, unknown>;
  const file = Object.values(values).find((value) => value instanceof File);

  if (file) return apiFetch<ToolRunResult>(endpoint, { method: "POST", formData: toForm(values) });
  return apiFetch<ToolRunResult>(endpoint, { method: "POST", body: input });
}

function toForm(values: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    // The file always goes under `file`, whatever the field is called, because
    // that is the parameter name the endpoint declares.
    form.append(
      value instanceof File ? "file" : key,
      value instanceof File ? value : String(value),
    );
  }
  return form;
}

export function getQuota() {
  return apiFetch<Quota>("/api/v1/runs/quota");
}

export function listRuns(params: { workflow?: string; limit?: number } = {}) {
  return apiFetch<RunSummary[]>("/api/v1/runs", {
    query: { workflow: params.workflow, limit: params.limit },
  });
}

/**
 * Reopen a stored run.
 *
 * `output` is the same `ToolRunOut` a live run returns, so a reopened result
 * renders through the identical path — no second renderer to keep in step.
 */
export function getRun(runId: string) {
  return apiFetch<RunDetail>(`/api/v1/runs/${runId}`);
}

export function getCompareMeta() {
  return apiFetch<CompareMeta>("/api/v1/tools/compare/meta");
}
