"use client";

import { useState } from "react";
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
import type {
  ShellBrand,
  ShellNavItem,
  ShellNavSection,
  SidebarNavMode,
} from "@/lib/types/shell-nav";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { ShellBrandHeader } from "./shell-brand-header";
import { SidebarSection } from "./sidebar-section";
import { SidebarFooterCollapseTrigger } from "./sidebar-toggle";
import { SidebarNavItem } from "./sidebar-nav-item";
import { AppsLauncher } from "./apps-launcher";

const NAV_SKELETON_COUNT = 8;

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
  appsItems?: ShellNavItem[];
  navMode?: SidebarNavMode;
  footerItems?: ShellNavItem[];
  workspaceName?: string;
  productName?: string;
  logoUrl?: string | null;
}

export function AppSidebar({
  brand,
  sections,
  appsItems = [],
  navMode = "main",
  footerItems,
  productName = "CodeSol",
  logoUrl,
}: AppSidebarProps) {
  const { isMobile } = useSidebar();
  const hydrated = useHydrated();
  const [appsOpen, setAppsOpen] = useState(false);
  const BrandIcon = brand.icon;
  const isSettingsMode = navMode === "settings";
  const showNavFooter = !isSettingsMode && footerItems && footerItems.length > 0;

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="overflow-hidden border-r border-transparent"
    >
      <SidebarHeader className="gap-2 border-b border-transparent px-4 py-4 group-data-[collapsible=icon]:px-2">
        {isSettingsMode ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-elevation-xs">
              <BrandIcon className="size-3.5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[14px] font-semibold leading-tight text-sidebar-foreground">
                {brand.title}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                {brand.subtitle}
              </p>
            </div>
          </div>
        ) : (
          <ShellBrandHeader productName={productName} logoUrl={logoUrl} />
        )}
      </SidebarHeader>

      <SidebarContent className="gap-0 overflow-y-auto py-1">
        {isSettingsMode ? (
          <>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/business/dashboard" />}
                  tooltip="Back to Main Menu"
                  className="h-9 gap-2 rounded-md px-2 text-[14px] text-sidebar-foreground/70 hover:text-sidebar-foreground"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Main Menu</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="mx-3 my-1" />
            <SidebarMenu className="gap-px px-2">
              {hydrated ? (
                sections.flatMap((section) =>
                  section.items.map((item) => (
                    <SidebarNavItem key={item.href} item={item} />
                  )),
                )
              ) : (
                <SidebarNavSkeleton />
              )}
            </SidebarMenu>
          </>
        ) : hydrated ? (
          <>
            {sections.map((section) => (
              <SidebarSection key={section.id} section={section} />
            ))}
            {appsItems.length > 0 ? (
              <SidebarMenu className="gap-0.5 px-3 group-data-[collapsible=icon]:px-2">
                <AppsLauncher
                  items={appsItems}
                  open={appsOpen}
                  onOpenChange={setAppsOpen}
                />
              </SidebarMenu>
            ) : null}
          </>
        ) : (
          <SidebarMenu className="gap-px px-2">
            <SidebarNavSkeleton />
          </SidebarMenu>
        )}
      </SidebarContent>

      <SidebarFooter className="relative gap-0 overflow-hidden p-0">
        {showNavFooter ? (
          <div className="border-t border-transparent px-3 py-3 group-data-[collapsible=icon]:px-2">
            {hydrated
              ? footerItems.map((item) => (
                  <SidebarMenu key={item.href} className="gap-px">
                    <SidebarNavItem item={item} />
                  </SidebarMenu>
                ))
              : null}
          </div>
        ) : null}
        {!isMobile ? (
          <div className="border-t border-transparent p-3">
            <SidebarFooterCollapseTrigger />
          </div>
        ) : null}
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
