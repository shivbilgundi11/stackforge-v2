"use client";

import { useQuery } from "@tanstack/react-query";

import * as catalog from "@/lib/api/catalog";
import { qk } from "@/lib/api/query-keys";
import * as tools from "@/lib/api/tools";

/**
 * Catalog hooks.
 *
 * Long `staleTime`: this data changes daily at most, and the backend already
 * caches it for 24 hours. Refetching it on every window focus would trade a
 * pointless round trip for no freshness the user can perceive.
 */
const CATALOG_STALE_TIME = 1000 * 60 * 60; // 1 hour

export function useModels(filters: catalog.ModelFilters = {}) {
  return useQuery({
    queryKey: qk.catalog.models(filters),
    queryFn: () => catalog.listModels(filters),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useTools(filters: catalog.ToolFilters = {}) {
  return useQuery({
    queryKey: qk.catalog.tools(filters),
    queryFn: () => catalog.listTools(filters),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useGpus(filters: catalog.GpuFilters = {}) {
  return useQuery({
    queryKey: qk.catalog.gpus(filters),
    queryFn: () => catalog.listGpus(filters),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useCompatibility(slugs: string[]) {
  return useQuery({
    queryKey: qk.catalog.compatibility(slugs),
    queryFn: () => catalog.getCompatibility(slugs),
    // Fewer than two tools is not an error, it is an incomplete selection.
    enabled: slugs.length >= 2,
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useArchitectures() {
  return useQuery({
    queryKey: qk.catalog.architectures(),
    queryFn: () => catalog.listArchitectures(),
    // Immutable reference data; a layer count does not change.
    staleTime: Infinity,
  });
}

export function useGraveyard() {
  return useQuery({
    queryKey: qk.catalog.graveyard(),
    queryFn: () => catalog.getGraveyard(),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useCatalogStats() {
  return useQuery({
    queryKey: qk.catalog.stats(),
    queryFn: () => catalog.getCatalogStats(),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useCompareMeta() {
  return useQuery({
    queryKey: qk.compare.meta(),
    queryFn: () => tools.getCompareMeta(),
    staleTime: CATALOG_STALE_TIME,
  });
}

/** Quota is short-lived by nature — it changes on every run. */
export function useQuota() {
  return useQuery({
    queryKey: qk.runs.quota(),
    queryFn: () => tools.getQuota(),
    staleTime: 1000 * 30,
  });
}

export function useRecentRuns(params: { workflow?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.runs.list(params),
    queryFn: () => tools.listRuns(params),
    staleTime: 1000 * 30,
  });
}

/**
 * A stored run, for reopening one from history.
 *
 * A completed run never changes, so it is cached indefinitely — refetching it
 * could only ever return the same bytes.
 */
export function useRun(runId: string | null) {
  return useQuery({
    queryKey: qk.runs.detail(runId ?? ""),
    queryFn: () => tools.getRun(runId as string),
    enabled: Boolean(runId),
    staleTime: Infinity,
    retry: false,
  });
}
