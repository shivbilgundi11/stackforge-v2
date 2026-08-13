"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { SidebarTrigger } from "@/components/animate-ui/components/radix/sidebar";
import { CommandTrigger } from "@/components/shell/command-palette";
import { OrgSwitcher } from "@/components/shell/org-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { Separator } from "@/components/ui/separator";
import { findGroupByHref, findToolByHref, WORKSPACE_NAV } from "@/lib/navigation";

export function AppHeader() {
  const crumbs = useBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-4">
      <SidebarTrigger className="-ml-1 text-fg-muted hover:text-fg" />
      <Separator orientation="vertical" className="h-5 bg-line" />

      <OrgSwitcher />

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

      <UserMenu />
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
  if (workspace) {
    const crumbs = [{ label: workspace.label, href: workspace.href }];
    // Sub-pages (Team → Members) get their own crumb; a deep link that
    // renders a single collapsed crumb reads as the wrong page.
    if (pathname !== workspace.href) {
      const tail = pathname.split("/").filter(Boolean).at(-1);
      if (tail) crumbs.push({ label: titleCase(tail), href: pathname });
    }
    return crumbs;
  }

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
