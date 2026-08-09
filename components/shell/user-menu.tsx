"use client";

import { useRouter } from "next/navigation";
import { CircleUserIcon, LifeBuoyIcon, LogOutIcon, SettingsIcon, UserPlusIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-provider";

export function UserMenu() {
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  if (status === "loading") {
    return <Skeleton className="size-8 shrink-0 rounded-full" />;
  }

  const initials =
    user?.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface transition-colors hover:border-line-strong"
        >
          {initials ? (
            <span className="font-mono text-[11px] font-medium text-fg">{initials}</span>
          ) : (
            <CircleUserIcon className="size-4 text-fg-muted" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {user ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-[13px] font-medium text-fg">{user.name}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-fg-subtle">{user.email}</p>
              <p className="mt-1 text-[11px] text-fg-subtle">
                <span className="text-fg-muted capitalize">{user.plan}</span> plan
                {!user.email_verified ? " · unverified" : ""}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <SettingsIcon className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/docs")}>
              <LifeBuoyIcon className="size-4" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOutIcon className="size-4" />
              Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-medium text-fg">Not signed in</p>
              <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                Anonymous session · 5 runs a day
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/login")}>
              <LogOutIcon className="size-4 rotate-180" />
              Sign in
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/signup")}>
              <UserPlusIcon className="size-4" />
              Create an account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/docs")}>
              <LifeBuoyIcon className="size-4" />
              Documentation
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
