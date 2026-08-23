"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  isAppointmentsCalendarPath,
  isContactWorkspacePath,
  isContactsListPath,
  isConversationsInboxPath,
  isMobileEntityListPath,
  isPaymentsMobileListPath,
  isSalesWorkspacePath,
} from "@/components/shell/shell-full-bleed-paths";
import { PageMetadataProvider } from "@/lib/runtime/page-metadata-context";
import { useIsMobile } from "@/lib/hooks/use-mobile";
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
import { ShellAppsProvider } from "./shell-apps-context";
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
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const contactWorkspace = isContactWorkspacePath(pathname);
  const conversationsInbox = isConversationsInboxPath(pathname);
  const appointmentsCalendar = isAppointmentsCalendarPath(pathname);
  const salesWorkspace = isSalesWorkspacePath(pathname);
  const paymentsMobileList = isPaymentsMobileListPath(
    pathname,
    searchParams.toString(),
  );
  const contactsList = isContactsListPath(pathname);
  const entityList = isMobileEntityListPath(pathname);
  const fullBleedContent =
    contactWorkspace ||
    conversationsInbox ||
    appointmentsCalendar ||
    (salesWorkspace && isMobile) ||
    (paymentsMobileList && isMobile) ||
    (contactsList && isMobile) ||
    (entityList && isMobile);

  const showSearch = shellMode === "business";
  const useTopNavbar = shellMode === "business" && navMode === "main";

  if (useTopNavbar) {
    const hideDesktopNavbar =
      (appointmentsCalendar ||
        salesWorkspace ||
        paymentsMobileList ||
        contactsList ||
        entityList) &&
      isMobile;
    return (
      <div className="app-shell-canvas flex h-svh min-h-0 flex-col overflow-hidden bg-white">
        <CommandPaletteProvider
          enabled={showSearch}
          searchPlaceholder={searchPlaceholder}
        >
          <PageMetadataProvider context={pageMetadataContext}>
            <ShellAppsProvider appsItems={appsItems ?? []}>
              {!hideDesktopNavbar ? (
                <DashboardNavbar
                  sections={sections}
                  appsItems={appsItems}
                  productName={productName}
                  logoUrl={logoUrl}
                  businessName={workspaceName}
                  notice={topbarNotice}
                />
              ) : null}
              <div
                className={cn(
                  "min-h-0 flex-1 bg-white",
                  fullBleedContent
                    ? "flex flex-col overflow-hidden p-0 [&>*]:min-h-0 [&>*]:flex-1"
                    : "flex flex-col overflow-x-hidden overflow-y-auto px-[var(--page-padding-x)] pb-[var(--page-padding-y)] pt-[var(--page-content-top-gap)] [&>*]:min-h-0",
                )}
              >
                {children}
              </div>
            </ShellAppsProvider>
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
                  : "flex flex-col overflow-x-hidden overflow-y-auto px-[var(--page-padding-x)] pb-[var(--page-padding-y)] pt-[var(--page-content-top-gap)] [&>*]:min-h-0",
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
