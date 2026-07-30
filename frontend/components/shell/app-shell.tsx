"use client";

import { usePathname } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { isContactWorkspacePath, isConversationsInboxPath } from "@/features/contacts/workspace/contact-workspace";
import { PageMetadataProvider } from "@/lib/runtime/page-metadata-context";
import { cn } from "@/lib/utils";
import type { PageMetadataContext } from "@/lib/config/page-metadata";
import type {
  ShellBrand,
  ShellNavItem,
  ShellNavSection,
  SidebarNavMode,
} from "@/lib/types/shell-nav";
import { AppSidebar } from "./app-sidebar";
import { CommandPaletteProvider } from "./command-palette-provider";
import { DashboardNavbar } from "./dashboard-navbar";
import { MobileSidebarCloseOnNavigate } from "./mobile-sidebar-close";
import { Topbar } from "./topbar";

interface AppShellProps {
  brand: ShellBrand;
  sections: ShellNavSection[];
  appsItems?: ShellNavItem[];
  navMode?: SidebarNavMode;
  footerItems?: ShellNavItem[];
  pageMetadataContext: PageMetadataContext;
  workspaceName?: string;
  productName?: string;
  logoUrl?: string | null;
  shellMode?: "platform" | "business";
  searchPlaceholder?: string;
  topbarActions?: React.ReactNode;
  topbarNotice?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  brand,
  sections,
  appsItems,
  navMode = "main",
  footerItems,
  pageMetadataContext,
  workspaceName,
  productName,
  logoUrl,
  shellMode = "business",
  searchPlaceholder,
  topbarActions,
  topbarNotice,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const contactWorkspace = isContactWorkspacePath(pathname);
  const conversationsInbox = isConversationsInboxPath(pathname);
  const fullBleedContent = contactWorkspace || conversationsInbox;

  const showSearch = shellMode === "business";
  const useTopNavbar = shellMode === "business" && navMode === "main";

  if (useTopNavbar) {
    return (
      <div className="app-shell-canvas flex h-svh min-h-0 flex-col overflow-hidden bg-transparent">
        <CommandPaletteProvider
          enabled={showSearch}
          searchPlaceholder={searchPlaceholder}
        >
          <PageMetadataProvider context={pageMetadataContext}>
            <DashboardNavbar
              sections={sections}
              appsItems={appsItems}
              productName={productName}
              logoUrl={logoUrl}
              businessName={workspaceName}
              notice={topbarNotice}
            />
            <div
              className={cn(
                "min-h-0 flex-1",
                fullBleedContent
                  ? "flex flex-col overflow-hidden p-0 [&>*]:min-h-0 [&>*]:flex-1"
                  : "overflow-y-auto overflow-x-hidden px-[var(--page-padding-x)] pb-[var(--page-padding-y)] pt-[var(--page-content-top-gap)]",
              )}
            >
              {children}
            </div>
          </PageMetadataProvider>
        </CommandPaletteProvider>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="app-shell-canvas h-svh min-h-0 overflow-hidden bg-transparent"
      style={
        {
          "--sidebar-width": "11.25rem",
        } as React.CSSProperties
      }
    >
      <CommandPaletteProvider enabled={showSearch} searchPlaceholder={searchPlaceholder}>
        <PageMetadataProvider context={pageMetadataContext}>
          <MobileSidebarCloseOnNavigate />
          <AppSidebar
            brand={brand}
            sections={sections}
            appsItems={appsItems}
            navMode={navMode}
            footerItems={footerItems}
            workspaceName={workspaceName}
            productName={productName}
            logoUrl={logoUrl}
          />
          <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
            <Topbar
              actions={topbarActions}
              notice={topbarNotice}
              showSearch={showSearch}
              businessName={workspaceName}
            />
            <div
              className={cn(
                "min-h-0 flex-1",
                fullBleedContent
                  ? "flex flex-col overflow-hidden p-0 [&>*]:min-h-0 [&>*]:flex-1"
                  : "overflow-y-auto overflow-x-hidden px-[var(--page-padding-x)] pb-[var(--page-padding-y)] pt-[var(--page-content-top-gap)]",
              )}
            >
              {children}
            </div>
          </SidebarInset>
        </PageMetadataProvider>
      </CommandPaletteProvider>
    </SidebarProvider>
  );
}
