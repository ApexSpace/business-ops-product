"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type {
  ShellBrand,
  ShellNavItem,
  ShellNavSection,
  SidebarNavMode,
} from "@/lib/types/shell-nav";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { SHELL_HEADER_HEIGHT } from "./shell-constants";
import { SidebarFooterCollapseTrigger } from "./sidebar-toggle";
import { SidebarNavItem } from "./sidebar-nav-item";
import { flattenNavSections } from "./sidebar-nav-utils";

const NAV_SKELETON_COUNT = 10;

function SidebarNavSkeleton() {
  return (
    <>
      {Array.from({ length: NAV_SKELETON_COUNT }).map((_, index) => (
        <SidebarMenuItem key={`nav-skeleton-${index}`}>
          <div
            className="flex h-9 items-center gap-2 rounded-md px-2"
            aria-hidden
          >
            <div className="size-4 shrink-0 rounded bg-sidebar-accent/50" />
            <div className="h-3 w-24 max-w-[70%] rounded bg-sidebar-accent/50" />
          </div>
        </SidebarMenuItem>
      ))}
    </>
  );
}

interface AppSidebarProps {
  brand: ShellBrand;
  sections: ShellNavSection[];
  navMode?: SidebarNavMode;
  footerItems?: ShellNavItem[];
}

export function AppSidebar({
  brand,
  sections,
  navMode = "main",
  footerItems,
}: AppSidebarProps) {
  const { isMobile } = useSidebar();
  const hydrated = useHydrated();
  const BrandIcon = brand.icon;
  const isSettingsMode = navMode === "settings";
  const navItems = flattenNavSections(sections);
  const showNavFooter = !isSettingsMode && footerItems && footerItems.length > 0;
  const showFooter = showNavFooter || !isMobile;

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="overflow-visible border-r border-sidebar-border"
    >
      <SidebarHeader
        className={cn(
          SHELL_HEADER_HEIGHT,
          "flex-row gap-2 border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:px-2",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-elevation-xs">
            <BrandIcon className="size-3.5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[14px] font-semibold leading-tight tracking-tight">
              {brand.title}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/55">
              {brand.subtitle}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0.5 overflow-y-auto py-2">
        {isSettingsMode ? (
          <>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/business/dashboard" />}
                  tooltip="Back to Main Menu"
                  className="h-9 gap-2 rounded-md px-2 text-[14px] text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Main Menu</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="mx-3 my-1" />
          </>
        ) : null}
        <SidebarMenu className="gap-px px-2">
          {hydrated ? (
            navItems.map((item) => (
              <SidebarNavItem key={item.href} item={item} />
            ))
          ) : (
            <SidebarNavSkeleton />
          )}
        </SidebarMenu>
      </SidebarContent>

      {showFooter ? (
        <SidebarFooter className="relative overflow-visible border-t border-sidebar-border p-2">
          {showNavFooter ? (
            <div className="min-w-0 pr-3.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pr-0">
              {hydrated
                ? footerItems.map((item) => (
                    <SidebarMenu key={item.href} className="gap-px">
                      <SidebarNavItem item={item} />
                    </SidebarMenu>
                  ))
                : null}
            </div>
          ) : null}
          <SidebarFooterCollapseTrigger />
        </SidebarFooter>
      ) : null}
    </ShadcnSidebar>
  );
}
