import { apiFetch } from "@/lib/api/client";
import type { components } from "@/types/api";

/**
 * Organizations, membership, invitations, comments, approvals (M21).
 *
 * Every type here is read from the generated schema rather than hand-written.
 * Org-scoped *listing* endpoints take the acting organization from the
 * `X-Organization-Id` header, which the client attaches from the org
 * provider; the endpoints in this module name the org in the path instead,
 * so they are explicit about which team they touch.
 */

type Schemas = components["schemas"];

export type Organization = Schemas["OrganizationOut"];
export type OrganizationSettings = Schemas["OrganizationSettingsOut"];
export type OrgMember = Schemas["MemberOut"];
export type OrgInvitation = Schemas["InvitationOut"];
export type InvitePreview = Schemas["InvitePreviewOut"];
export type OrgComment = Schemas["CommentOut"];
export type OrgApproval = Schemas["ApprovalOut"];
export type OrgRole = OrgMember["role"];
export type GrantableRole = Exclude<OrgRole, "owner">;
export type TeamResourceType = OrgComment["resource_type"];

// ── organizations ────────────────────────────────────────────────────────────

export function listOrganizations() {
  return apiFetch<Organization[]>("/api/v1/organizations");
}

export function createOrganization(body: { name: string }) {
  return apiFetch<Organization>("/api/v1/organizations", { method: "POST", body });
}

export function getOrganization(id: string) {
  return apiFetch<Organization>(`/api/v1/organizations/${id}`);
}

export function updateOrganization(id: string, body: { name?: string }) {
  return apiFetch<Organization>(`/api/v1/organizations/${id}`, { method: "PATCH", body });
}

export function deleteOrganization(id: string) {
  return apiFetch<void>(`/api/v1/organizations/${id}`, { method: "DELETE" });
}

export function updateOrganizationSettings(
  id: string,
  body: {
    approved_tools?: string[];
    require_approval?: boolean;
    default_visibility?: "private" | "team" | "public";
  },
) {
  return apiFetch<OrganizationSettings>(`/api/v1/organizations/${id}/settings`, {
    method: "PATCH",
    body,
  });
}

// ── members ──────────────────────────────────────────────────────────────────

export function listMembers(orgId: string) {
  return apiFetch<OrgMember[]>(`/api/v1/organizations/${orgId}/members`);
}

export function updateMemberRole(orgId: string, membershipId: string, role: GrantableRole) {
  return apiFetch<OrgMember>(`/api/v1/organizations/${orgId}/members/${membershipId}`, {
    method: "PATCH",
    body: { role },
  });
}

export function removeMember(orgId: string, membershipId: string) {
  return apiFetch<void>(`/api/v1/organizations/${orgId}/members/${membershipId}`, {
    method: "DELETE",
  });
}

export function transferOwnership(orgId: string, membershipId: string) {
  return apiFetch<OrgMember>(`/api/v1/organizations/${orgId}/ownership-transfer`, {
    method: "POST",
    body: { membership_id: membershipId },
  });
}

// ── invitations ──────────────────────────────────────────────────────────────

export function listInvitations(orgId: string) {
  return apiFetch<OrgInvitation[]>(`/api/v1/organizations/${orgId}/invitations`);
}

export function createInvitation(orgId: string, body: { email: string; role: GrantableRole }) {
  return apiFetch<OrgInvitation>(`/api/v1/organizations/${orgId}/invitations`, {
    method: "POST",
    body,
  });
}

export function resendInvitation(orgId: string, invitationId: string) {
  return apiFetch<OrgInvitation>(
    `/api/v1/organizations/${orgId}/invitations/${invitationId}/resend`,
    { method: "POST", body: {} },
  );
}

export function revokeInvitation(orgId: string, invitationId: string) {
  return apiFetch<void>(`/api/v1/organizations/${orgId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

/** Public — the token is the credential. Dead tokens 404. */
export function previewInvitation(token: string) {
  return apiFetch<InvitePreview>("/api/v1/invitations/preview", {
    query: { token },
    skipAuthRetry: true,
  });
}

export function acceptInvitation(token: string) {
  return apiFetch<{ organization: Organization }>("/api/v1/invitations/accept", {
    method: "POST",
    body: { token },
  });
}

// ── comments ─────────────────────────────────────────────────────────────────

export function listComments(resourceType: TeamResourceType, resourceId: string) {
  return apiFetch<OrgComment[]>("/api/v1/comments", {
    query: { resource_type: resourceType, resource_id: resourceId },
  });
}

export function createComment(body: {
  resource_type: TeamResourceType;
  resource_id: string;
  body: string;
  parent_id?: string;
  mentions?: string[];
}) {
  return apiFetch<OrgComment>("/api/v1/comments", { method: "POST", body });
}

export function deleteComment(commentId: string) {
  return apiFetch<void>(`/api/v1/comments/${commentId}`, { method: "DELETE" });
}

export function resolveComment(commentId: string, resolved: boolean) {
  return apiFetch<OrgComment>(`/api/v1/comments/${commentId}/resolve`, {
    method: "POST",
    body: { resolved },
  });
}

// ── approvals ────────────────────────────────────────────────────────────────

export function listApprovals(resourceType: TeamResourceType, resourceId: string) {
  return apiFetch<OrgApproval[]>("/api/v1/approvals", {
    query: { resource_type: resourceType, resource_id: resourceId },
  });
}

export function requestApproval(resourceType: TeamResourceType, resourceId: string) {
  return apiFetch<OrgApproval>("/api/v1/approvals", {
    method: "POST",
    body: { resource_type: resourceType, resource_id: resourceId },
  });
}

export function decideApproval(
  approvalId: string,
  body: { action: "approve" | "reject"; note?: string },
) {
  return apiFetch<OrgApproval>(`/api/v1/approvals/${approvalId}`, { method: "PATCH", body });
}

// ── seats ────────────────────────────────────────────────────────────────────

export function changeSeats(body: { seats: number; organization_id?: string }) {
  return apiFetch<{ seats: number; used: number }>("/api/v1/billing/seats", {
    method: "POST",
    body,
  });
}
