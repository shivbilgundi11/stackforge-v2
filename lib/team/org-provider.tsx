"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listOrganizations, type Organization, type OrgRole } from "@/lib/api/team";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-provider";
import { orgStore } from "@/lib/team/org-store";

/**
 * The acting organization (M21).
 *
 * Wraps the org-store module closure in React so components re-render on
 * switch. Switching invalidates the whole query cache: the org header scopes
 * requests at the client's choke point, so any cached read may now be
 * answered differently.
 *
 * A cookie'd org the user is no longer a member of is cleared as soon as the
 * membership list loads — the server would 404 every scoped request against
 * it, and a scope that poisons requests must not survive a reload.
 */

type OrgContextValue = {
  organizations: Organization[];
  /** `null` means personal scope — every request the app made before M21. */
  currentOrg: Organization | null;
  role: OrgRole | null;
  switchOrg: (orgId: string | null) => void;
  isLoading: boolean;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.team.orgs(),
    queryFn: listOrganizations,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  const organizations = useMemo(() => query.data ?? [], [query.data]);
  const storedId = useSyncOrgId();
  const currentOrg = organizations.find((org) => org.id === storedId) ?? null;

  useEffect(() => {
    // Drop a stale scope: signed out, or no longer a member. `isFetching`
    // matters: right after an org is created the list is stale-and-refetching
    // and does not contain it yet — clearing then would wipe the scope the
    // switcher just set.
    if (
      storedId &&
      status === "authenticated" &&
      query.isSuccess &&
      !query.isFetching &&
      !currentOrg
    ) {
      orgStore.set(null);
    }
    if (storedId && status === "signed-out") {
      orgStore.set(null);
    }
  }, [storedId, status, query.isSuccess, query.isFetching, currentOrg]);

  const switchOrg = useCallback(
    (orgId: string | null) => {
      if (orgId === orgStore.get()) return;
      orgStore.set(orgId);
      // Every org-scoped read may answer differently now. Refetching the
      // world is cheaper than a curated list that misses one.
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo<OrgContextValue>(
    () => ({
      organizations,
      currentOrg,
      role: currentOrg?.role ?? null,
      switchOrg,
      isLoading: status === "authenticated" && query.isLoading,
    }),
    [organizations, currentOrg, switchOrg, status, query.isLoading],
  );

  return <OrgContext value={value}>{children}</OrgContext>;
}

/** The store's value as React state, updated on every switch. The server
 *  snapshot is `null` — the cookie is read only in the browser, so the first
 *  client render agrees with SSR and scope appears on hydration. */
function useSyncOrgId(): string | null {
  return useSyncExternalStore(
    orgStore.subscribe,
    () => orgStore.get(),
    () => null,
  );
}

const PERSONAL_SCOPE: OrgContextValue = {
  organizations: [],
  currentOrg: null,
  role: null,
  switchOrg: () => undefined,
  isLoading: false,
};

export function useOrg(): OrgContextValue {
  // Personal scope, not a throw, outside the provider: a component that can
  // render team affordances must degrade to rendering none — in isolation,
  // in tests, and on any page that mounts before the provider.
  return use(OrgContext) ?? PERSONAL_SCOPE;
}
