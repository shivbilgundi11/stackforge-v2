"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRightIcon, CircleUserIcon, LifeBuoyIcon, LogOutIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { SidebarTrigger } from "@/components/animate-ui/components/radix/sidebar";
import { CommandTrigger } from "@/components/shell/command-palette";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { findGroupByHref, findToolByHref, WORKSPACE_NAV } from "@/lib/navigation";

export function AppHeader() {
  const crumbs = useBreadcrumbs();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-4">
      <SidebarTrigger className="-ml-1 text-fg-muted hover:text-fg" />
      <Separator orientation="vertical" className="h-5 bg-line" />

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 text-[13px]">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <Fragment key={crumb.href}>
                {index > 0 ? (
                  <ChevronRightIcon className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                ) : null}
                <li className="min-w-0">
                  {last ? (
                    <span className="block truncate font-medium text-fg" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="block truncate text-fg-muted transition-colors hover:text-fg"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <div className="hidden md:block">
        <CommandTrigger />
      </div>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface transition-colors hover:border-line-strong"
          >
            <CircleUserIcon className="size-4 text-fg-muted" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-[13px] font-medium text-fg">Not signed in</p>
            <p className="mt-0.5 text-[11.5px] text-fg-subtle">Anonymous session · 5 runs a day</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Animate UI's DropdownMenuItem omits `asChild`, so navigation is
              programmatic. onSelect fires for both click and Enter, which keeps
              the menu keyboard-operable. */}
          <DropdownMenuItem onSelect={() => router.push("/login")}>
            <LogOutIcon className="size-4 rotate-180" />
            Sign in
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/signup")}>
            <CircleUserIcon className="size-4" />
            Create an account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/docs")}>
            <LifeBuoyIcon className="size-4" />
            Documentation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

/**
 * Breadcrumbs derived from the route and the navigation registry, so they stay
 * correct for deep links without any per-page configuration.
 */
function useBreadcrumbs(): { label: string; href: string }[] {
  const pathname = usePathname();

  const workspace = WORKSPACE_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (workspace) return [{ label: workspace.label, href: workspace.href }];

  const group = findGroupByHref(pathname);
  if (!group) {
    const label = pathname.split("/").filter(Boolean).at(-1) ?? "StackForge";
    return [{ label: titleCase(label), href: pathname }];
  }

  const crumbs = [{ label: group.label, href: group.href }];
  const tool = findToolByHref(pathname);
  if (tool) crumbs.push({ label: tool.title, href: tool.href });
  return crumbs;
}

function titleCase(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
