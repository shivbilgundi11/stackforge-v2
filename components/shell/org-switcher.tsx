"use client";

import { useRouter } from "next/navigation";
import { CheckIcon, ChevronsUpDownIcon, UserIcon, UsersIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/team/org-provider";

/**
 * The acting-scope switcher (M21). Rendered only when the user belongs to at
 * least one organization — a solo user never sees a control that would only
 * ever say "Personal".
 *
 * Switching scopes every subsequent request via the org store; the visible
 * confirmation is the whole app re-reading in the new scope.
 */
export function OrgSwitcher() {
  const router = useRouter();
  const { status } = useAuth();
  const { organizations, currentOrg, switchOrg } = useOrg();

  if (status !== "authenticated" || organizations.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch workspace scope"
          className="flex h-8 max-w-44 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[12.5px] text-fg transition-colors hover:border-line-strong"
        >
          {currentOrg ? (
            <UsersIcon className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
          ) : (
            <UserIcon className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
          )}
          <span className="truncate">{currentOrg ? currentOrg.name : "Personal"}</span>
          <ChevronsUpDownIcon className="size-3 shrink-0 text-fg-subtle" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-[11px] tracking-wide text-fg-subtle uppercase">Workspace</p>
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => switchOrg(null)}>
          <UserIcon className="size-4" />
          <span className="flex-1">Personal</span>
          {currentOrg === null ? <CheckIcon className="size-4 text-fg-muted" /> : null}
        </DropdownMenuItem>
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onSelect={() => switchOrg(org.id)}>
            <UsersIcon className="size-4" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{org.name}</span>
              <span className="block text-[11px] text-fg-subtle capitalize">{org.role}</span>
            </span>
            {currentOrg?.id === org.id ? <CheckIcon className="size-4 text-fg-muted" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/team")}>
          <UsersIcon className="size-4" />
          Team page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
