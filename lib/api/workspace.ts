import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api";

/**
 * Saved work: the dashboard, projects, search, and keeping a run (M17).
 *
 * Every type here is read from the generated schema rather than hand-written.
 * A backend rename becomes a compile error in the component that reads it,
 * which is the whole reason the schema is generated at all.
 */

type Schemas = components["schemas"];

export type Dashboard = Schemas["DashboardOut"];
export type SearchHit = Schemas["SearchHitOut"];
export type Project = Schemas["ProjectOut"];
export type ProjectItem = Schemas["ProjectItemOut"];
export type RecentRun = Schemas["RecentRunOut"];
export type SavedStack = Schemas["SavedStackOut"];
export type StaleAlert = Schemas["StaleAlertOut"];

export function getDashboard() {
  return apiFetch<Dashboard>("/api/v1/dashboard");
}

export function searchWorkspace(query: string) {
  return apiFetch<SearchHit[]>("/api/v1/search", { query: { q: query } });
}

// ── runs ─────────────────────────────────────────────────────────────────────

export function saveRun(runId: string) {
  return apiFetch<{ id: string; saved: boolean }>(`/api/v1/runs/${runId}/save`, {
    method: "POST",
  });
}

export function unsaveRun(runId: string) {
  return apiFetch<{ id: string; saved: boolean }>(`/api/v1/runs/${runId}/save`, {
    method: "DELETE",
  });
}

// ── projects ─────────────────────────────────────────────────────────────────

export function listProjects() {
  return apiFetch<Project[]>("/api/v1/projects");
}

export function getProject(id: string) {
  return apiFetch<Project>(`/api/v1/projects/${id}`);
}

export function createProject(body: { name: string; description?: string; use_case?: string }) {
  return apiFetch<Project>("/api/v1/projects", { method: "POST", body });
}

export function deleteProject(id: string) {
  return apiFetch<void>(`/api/v1/projects/${id}`, { method: "DELETE" });
}

export function listProjectItems(id: string) {
  return apiFetch<ProjectItem[]>(`/api/v1/projects/${id}/items`);
}

export function addProjectItem(
  id: string,
  // `artifact` resolves to an `exports` row (M18). `template` is still refused
  // by the server until M19 gives it a table, so it is absent here rather than
  // accepted and rejected on the wire.
  body: { item_type: "run" | "stack" | "artifact"; item_id: string; note?: string },
) {
  return apiFetch<ProjectItem>(`/api/v1/projects/${id}/items`, { method: "POST", body });
}

export function removeProjectItem(projectId: string, itemId: string) {
  return apiFetch<void>(`/api/v1/projects/${projectId}/items/${itemId}`, { method: "DELETE" });
}

export function pinProjectItem(projectId: string, itemId: string, pinned: boolean) {
  return apiFetch<ProjectItem>(`/api/v1/projects/${projectId}/items/${itemId}/pin`, {
    method: "PATCH",
    body: { pinned },
  });
}

// ── carried session ──────────────────────────────────────────────────────────
//
// The figures a project hands between tools. Named `Carried…` on both sides
// because auth already owns `SessionOut` for a signed-in device session.

export type CarriedSession = Schemas["CarriedSessionOut"];

export function getCarriedSession(projectId: string) {
  return apiFetch<CarriedSession>(`/api/v1/projects/${projectId}/session`);
}

export function clearCarriedSession(projectId: string) {
  return apiFetch<CarriedSession>(`/api/v1/projects/${projectId}/session`, { method: "DELETE" });
}
