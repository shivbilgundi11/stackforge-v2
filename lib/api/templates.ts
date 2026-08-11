import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api";

/**
 * The template library (M19).
 *
 * Every read here is public, so these are safe to call from a server component
 * with no token — which is what the static generation in `app/resources`
 * depends on.
 */

const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8000";

type Schemas = components["schemas"];

export type TemplateSummary = Schemas["TemplateSummaryOut"];
export type TemplateDetail = Schemas["TemplateDetailOut"];
export type TemplateFile = Schemas["TemplateFileOut"];
export type TemplateLibrary = Schemas["LibraryOut"];
export type TemplateFacets = Schemas["FacetsOut"];
export type TemplateCategory = TemplateSummary["category"];
export type TemplateDifficulty = TemplateSummary["difficulty"];

export type TemplateFilters = {
  q?: string | undefined;
  category?: string | undefined;
  use_case?: string | undefined;
  difficulty?: string | undefined;
  premium?: boolean | undefined;
  tag?: string | undefined;
};

// ── client-side ──────────────────────────────────────────────────────────────

export function getLibrary() {
  return apiFetch<TemplateLibrary>("/api/v1/templates");
}

export function getFacets() {
  return apiFetch<TemplateFacets>("/api/v1/templates/facets");
}

export function listTemplates(filters: TemplateFilters = {}) {
  return apiFetch<TemplateSummary[]>("/api/v1/templates/list", { query: filters });
}

export function getTemplate(slug: string) {
  return apiFetch<TemplateDetail>(`/api/v1/templates/${encodeURIComponent(slug)}`);
}

/**
 * Tell the backend someone took this.
 *
 * Fire-and-forget on purpose: a failed counter must never turn a successful
 * copy into an error toast. The number is for the content roadmap, and a
 * roadmap that is 2% low is worth more than a copy button that sometimes
 * reports failure after putting the text on the clipboard.
 */
export function recordCopy(slug: string): void {
  void apiFetch<{ copy_count: number }>(`/api/v1/templates/${encodeURIComponent(slug)}/copy`, {
    method: "POST",
  }).catch(() => undefined);
}

// ── server-side ──────────────────────────────────────────────────────────────
//
// Plain `fetch` rather than `apiFetch`: these run during static generation,
// where there is no token store and no cookie jar. Returning `null` on failure
// lets a page render its not-found state rather than failing the whole build
// because the API was briefly unreachable.

async function fetchPublic<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { next: { revalidate } });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: T | null };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

/** Revalidated hourly. Templates change on a deploy, not on a request. */
const HOUR = 3600;

export function getLibraryStatic() {
  return fetchPublic<TemplateLibrary>("/api/v1/templates", HOUR);
}

export function getTemplateStatic(slug: string) {
  return fetchPublic<TemplateDetail>(`/api/v1/templates/${encodeURIComponent(slug)}`, HOUR);
}

export function listTemplatesStatic() {
  return fetchPublic<TemplateSummary[]>("/api/v1/templates/list?limit=100", HOUR);
}
