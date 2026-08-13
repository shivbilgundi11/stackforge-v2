"use client";

import { useOrg } from "@/lib/team/org-provider";
import type { Organization, OrgRole } from "@/lib/api/team";

/**
 * Which organization the /team pages are about.
 *
 * The acting org when one is selected, else the first the user belongs to —
 * a member of exactly one team should never meet a "pick a team" screen.
 * `org: null` with `isLoading: false` means the user has no team yet, and the
 * pages render the create flow.
 */
export function useTeamOrg(): {
  org: Organization | null;
  role: OrgRole | null;
  isLoading: boolean;
} {
  const { organizations, currentOrg, isLoading } = useOrg();
  const org = currentOrg ?? organizations[0] ?? null;
  return { org, role: org?.role ?? null, isLoading };
}

export function canManage(role: OrgRole | null): boolean {
  return role === "owner" || role === "admin";
}
