"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/animate-ui/components/radix/sidebar";
import { BrandLockup } from "@/components/shell/brand";
import { PlanCard } from "@/components/shell/plan-card";
import { FOOTER_NAV, NAV_GROUPS, WORKSPACE_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (href: string) => pathname === href;
  const isWithin = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon" className="border-line">
      <SidebarHeader className="h-14 justify-center px-3">
        <Link
          href="/dashboard"
          className="rounded-md focus-visible:outline-none"
          aria-label="StackForge home"
        >
          <BrandLockup collapsed={collapsed} />
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Workspace */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isWithin(item.href)}
                    tooltip={item.label}
                    className="data-[active=true]:bg-ember-quiet data-[active=true]:font-medium data-[active=true]:text-ember"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                      {item.status === "planned" && !collapsed ? <SoonBadge /> : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Workflows. Stack Architect is first and carries the indigo accent —
            it is the intelligent layer, not another workflow. */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10.5px] font-medium tracking-[0.06em] text-fg-subtle uppercase">
            Workbench
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_GROUPS.map((group) => {
                const open = isWithin(group.href);
                return (
                  <SidebarMenuItem key={group.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(group.href)}
                      tooltip={group.label}
                      className={cn(
                        "group/nav",
                        group.intelligent &&
                          "data-[active=true]:bg-forge-quiet data-[active=true]:text-forge",
                        !group.intelligent &&
                          "data-[active=true]:bg-ember-quiet data-[active=true]:text-ember",
                        "data-[active=true]:font-medium",
                      )}
                    >
                      <Link href={group.href}>
                        <group.icon
                          className={cn("size-4", group.intelligent && !open && "text-forge")}
                        />
                        <span className="flex-1">{group.label}</span>
                        {group.eyebrow && !collapsed ? (
                          <span className="font-mono text-[10px] tracking-tight text-fg-subtle">
                            {group.eyebrow}
                          </span>
                        ) : null}
                        {!group.eyebrow && !collapsed ? (
                          <ChevronRightIcon
                            className={cn(
                              "size-3.5 text-fg-subtle transition-transform duration-150",
                              open && "rotate-90",
                            )}
                          />
                        ) : null}
                      </Link>
                    </SidebarMenuButton>

                    {/* The active section expands its tool list. Only one
                        section is ever open, which keeps the rail scannable. */}
                    {open && !collapsed ? (
                      <SidebarMenuSub className="mt-1 border-line">
                        {group.tools.map((tool) => (
                          <SidebarMenuSubItem key={tool.slug}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(tool.href)}
                              className="data-[active=true]:bg-surface-2 data-[active=true]:font-medium data-[active=true]:text-fg"
                            >
                              <Link href={tool.href}>
                                <span className="truncate">{tool.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 p-2">
        {!collapsed ? <PlanCard /> : null}
        <SidebarMenu>
          {FOOTER_NAV.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isWithin(item.href)} tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

/** Honest labelling. A nav item that lies about being ready is worse than one
 *  that is absent — the previous build shipped nav pointing at redirects. */
function SoonBadge() {
  return (
    <span className="ml-auto rounded-xs border border-line px-1 py-px text-[9.5px] leading-none font-medium tracking-wide text-fg-subtle uppercase">
      Soon
    </span>
  );
}
