import { apiFetch } from "@/lib/api/client";
import { tokenStore } from "@/lib/auth/token-store";
import type { components } from "@/types/api";

/**
 * Exports and share links (M18).
 *
 * Everything except the download goes through `apiFetch`, which unwraps the
 * envelope. The download deliberately does not: it returns bytes, not an
 * envelope, and running it through the JSON parser would turn a PDF into a
 * decoding error.
 */

const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8000";

type Schemas = components["schemas"];

export type ExportRecord = Schemas["ExportOut"];
export type ExportOptions = Schemas["ExportOptionsOut"];
export type ArtifactOption = Schemas["ArtifactOptionOut"];
export type FormatOption = Schemas["FormatOptionOut"];
export type ShareLink = Schemas["ShareOut"];
export type SharePayload = Schemas["SharePayloadOut"];

export type ExportFormat = ExportRecord["format"];
export type SourceType = ExportRecord["source_type"];

export function getExportOptions(sourceType: SourceType, sourceId: string) {
  return apiFetch<ExportOptions>("/api/v1/exports/options", {
    query: { source_type: sourceType, source_id: sourceId },
  });
}

export function createExport(body: {
  source_type: SourceType;
  source_id: string;
  format: ExportFormat;
  artifact_type?: string | null;
  table?: string | null;
}) {
  return apiFetch<ExportRecord>("/api/v1/exports", { method: "POST", body });
}

export function getExport(id: string) {
  return apiFetch<ExportRecord>(`/api/v1/exports/${id}`);
}

/**
 * Fetch the bytes and hand them to the browser.
 *
 * `fetch` plus an object URL rather than a plain anchor to the API: the
 * download endpoint is owner-scoped and needs the Authorization header, which
 * a navigation cannot carry. An anchor would send an unauthenticated request
 * and produce a 404 the user reads as a broken button.
 */
export async function downloadExport(record: ExportRecord): Promise<void> {
  const token = tokenStore.get();
  const response = await fetch(`${BASE_URL}${record.download_url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!response.ok) throw new Error("That export is no longer available.");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = record.filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Revoked on the next frame: revoking synchronously races the browser's
    // own read of the blob and produces an empty file on some engines.
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  }
}

/** The artifact's text, for copy-to-clipboard and the preview. */
export async function readExport(record: ExportRecord): Promise<string> {
  const token = tokenStore.get();
  const response = await fetch(`${BASE_URL}${record.download_url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!response.ok) throw new Error("That export is no longer available.");
  return response.text();
}

// ── shares ───────────────────────────────────────────────────────────────────

export function listShares(includeRevoked = false) {
  return apiFetch<ShareLink[]>("/api/v1/shares", {
    query: { include_revoked: includeRevoked },
  });
}

export function createShare(body: {
  target_type: SourceType;
  target_id: string;
  artifact_type?: string | null;
  expires_in_days?: number | null;
}) {
  return apiFetch<ShareLink>("/api/v1/shares", { method: "POST", body });
}

export function revokeShare(id: string) {
  return apiFetch<ShareLink>(`/api/v1/shares/${id}`, { method: "DELETE" });
}

export function revokeAllShares() {
  return apiFetch<{ revoked: number }>("/api/v1/shares", { method: "DELETE" });
}

/**
 * The public page's fetch, used from the server component that renders `/s`.
 *
 * A bare `fetch` rather than `apiFetch`: this runs on the server, where there
 * is no token store and no cookie jar, and the endpoint takes no identity at
 * all. Reusing the authenticated client here would imply the answer depends on
 * who is asking, and it must not — the owner and the stranger see the same
 * page or the "no owner identity" rule is not really a rule.
 *
 * Returns `null` for every dead state, because the server returns 404 for a
 * revoked, expired, and non-existent token alike (deliberately — a 403 would
 * confirm the resource exists).
 */
export async function getShared(token: string): Promise<SharePayload | null> {
  const response = await fetch(`${BASE_URL}/api/v1/s/${encodeURIComponent(token)}`, {
    // Never cached. A revoke has to take effect on the next request, and a
    // cached share page is a revoked link that still works.
    cache: "no-store",
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as { data?: SharePayload | null };
  return payload.data ?? null;
}
