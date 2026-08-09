import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api";

/**
 * Catalog reads.
 *
 * Types come from the generated schema rather than being hand-written, so a
 * backend field rename fails `npm run typecheck` instead of arriving as
 * `undefined` in production.
 */

type Schemas = components["schemas"];

export type CatalogModel = Schemas["ModelOut"];
export type CatalogGpu = Schemas["GpuOut"];
export type CatalogTool = Schemas["ToolOut"];
export type GraveyardEntry = Schemas["GraveyardEntryOut"];
export type Compatibility = Schemas["CompatibilityOut"];
export type CompatibilityPair = Schemas["CompatibilityPairOut"];
export type Provenance = Schemas["ProvenanceOut"];
export type CatalogStats = Schemas["CatalogStatsOut"];
export type PricingHistoryEntry = Schemas["PricingHistoryOut"];

export type ModelFilters = {
  family?: "chat" | "embedding" | "rerank";
  provider?: string;
  includeAllStatuses?: boolean;
};

export function listModels(filters: ModelFilters = {}) {
  return apiFetch<CatalogModel[]>("/api/v1/catalog/models", {
    query: {
      family: filters.family,
      provider: filters.provider,
      include_all_statuses: filters.includeAllStatuses,
    },
  });
}

export function getModel(modelId: string) {
  return apiFetch<CatalogModel>(`/api/v1/catalog/models/${encodeURIComponent(modelId)}`);
}

export type GpuFilters = {
  provider?: string;
  minVram?: number;
  region?: string;
  spot?: boolean;
};

export function listGpus(filters: GpuFilters = {}) {
  return apiFetch<CatalogGpu[]>("/api/v1/catalog/gpus", {
    query: {
      provider: filters.provider,
      min_vram: filters.minVram,
      region: filters.region,
      spot: filters.spot,
    },
  });
}

export type ToolFilters = {
  category?: string;
  status?: string;
  useCase?: string;
  /** All tags must match — the backend intersects rather than unions. */
  tags?: string[];
};

export function listTools(filters: ToolFilters = {}) {
  return apiFetch<CatalogTool[]>("/api/v1/catalog/tools", {
    query: {
      category: filters.category,
      status: filters.status,
      use_case: filters.useCase,
      tags: filters.tags?.length ? filters.tags.join(",") : undefined,
    },
  });
}

export function getTool(slug: string) {
  return apiFetch<CatalogTool>(`/api/v1/catalog/tools/${encodeURIComponent(slug)}`);
}

export function getCompatibility(slugs: string[]) {
  return apiFetch<Compatibility>("/api/v1/catalog/compatibility", {
    query: { tools: slugs.join(",") },
  });
}

export function getGraveyard() {
  return apiFetch<GraveyardEntry[]>("/api/v1/catalog/graveyard");
}

export function getCatalogStats() {
  return apiFetch<CatalogStats>("/api/v1/catalog/stats");
}

export type FlagPayload = {
  entity_type: "model" | "gpu" | "tool";
  entity_id: string;
  field?: string;
  suggested_value?: string;
  note?: string;
  source_url?: string;
};

export function flagCatalogEntry(payload: FlagPayload) {
  return apiFetch<Schemas["FlagOut"]>("/api/v1/catalog/flag", {
    method: "POST",
    body: payload,
  });
}
