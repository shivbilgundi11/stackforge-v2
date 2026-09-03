"use client";

import { useQuery } from "@tanstack/react-query";

import * as billing from "@/lib/api/billing";
import * as catalog from "@/lib/api/catalog";
import { qk } from "@/lib/api/query-keys";
import * as tools from "@/lib/api/tools";
import { useAuth } from "@/lib/auth/auth-provider";

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

// ── Billing (M20) ───────────────────────────────────────────────────────────

/**
 * The pricing table.
 *
 * Long `staleTime` and no refetch on focus: plans change with a deploy, and the
 * public pricing page is the most-loaded route in the app. Its limits still
 * come from the server rather than a constant here, so a tuned limit reaches
 * the page on the next load.
 *
 * Keyed by identity but deliberately *not* gated on auth resolving, unlike
 * `useUsage`. One field in the reply is per-caller — `current`, which draws
 * the "Your plan" marker — and a copy fetched before the access token existed
 * has it false on every row, so a signed-in user sees their own plan offered
 * for sale. Keying by identity retires that copy the moment the user resolves
 * instead of showing it for the full fifteen minutes. The gate is the wrong
 * tool here: this is the most-loaded public route, and holding the whole
 * pricing table for a refresh round trip to fix one marker no logged-out
 * visitor can see would be a bad trade.
 */
export function usePlans() {
  const { user } = useAuth();

  return useQuery({
    queryKey: qk.billing.plans(user?.id ?? "signed-out"),
    queryFn: () => billing.listPlans(),
    staleTime: 1000 * 60 * 15,
  });
}

/** Signed-in only. `enabled` rather than a 401 the error boundary would toast. */
export function useSubscription(enabled = true) {
  return useQuery({
    queryKey: qk.billing.subscription(),
    queryFn: () => billing.getSubscription(),
    enabled,
    staleTime: 1000 * 60,
  });
}

/**
 * Every meter at once.
 *
 * Short `staleTime`: the point of the sidebar meter is to be visibly moving
 * before the limit is hit, which is the only moment the gate converts rather
 * than annoys.
 *
 * Held until `status` leaves `loading`. The access token lives in memory, so
 * on every page load there is a window — one refresh round trip wide — where
 * the app is signed in but cannot prove it. A request sent inside that window
 * is answered for a caller the API cannot identify, and that answer is cached
 * against the signed-in user, so the sidebar shows the wrong plan until it
 * goes stale. Waiting costs one render of nothing; not waiting costs a wrong
 * plan on most reloads.
 */
export function useUsage() {
  const { status, user } = useAuth();

  return useQuery({
    queryKey: qk.billing.usage(user?.id ?? "signed-out"),
    queryFn: () => billing.getUsage(),
    enabled: status !== "loading",
    staleTime: 1000 * 20,
  });
}

export function useInvoices(enabled = true) {
  return useQuery({
    queryKey: qk.billing.invoices(),
    queryFn: () => billing.listInvoices(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
