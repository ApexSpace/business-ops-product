"use client";

import { usePathname } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { isContactWorkspacePath } from "@/features/contacts/workspace/contact-workspace";
import { PageMetadataProvider } from "@/lib/runtime/page-metadata-context";
import { cn } from "@/lib/utils";
import type { PageMetadataContext } from "@/lib/config/page-metadata";
import type {
  ShellBrand,
  ShellNavItem,
  ShellNavSection,
  SidebarNavMode,
} from "@/lib/types/shell-nav";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { AppSidebar } from "./app-sidebar";
import { MobileSidebarCloseOnNavigate } from "./mobile-sidebar-close";
import { Topbar } from "./topbar";

interface AppShellProps {
  brand: ShellBrand;
  sections: ShellNavSection[];
  navMode?: SidebarNavMode;
  footerItems?: ShellNavItem[];
  pageMetadataContext: PageMetadataContext;
  showAccountSwitcher?: boolean;
  topbarActions?: React.ReactNode;
  topbarNotice?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  brand,
  sections,
  navMode = "main",
  footerItems,
  pageMetadataContext,
  showAccountSwitcher = false,
  topbarActions,
  topbarNotice,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const contactWorkspace = isContactWorkspacePath(pathname);
  const fullBleedContent = contactWorkspace;

  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden bg-background"
      style={
        {
          "--sidebar-width": "14.5rem",
        } as React.CSSProperties
      }
    >
      <PageMetadataProvider context={pageMetadataContext}>
        <MobileSidebarCloseOnNavigate />
        <AppSidebar
          brand={brand}
          sections={sections}
          navMode={navMode}
          footerItems={footerItems}
        />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <Topbar
            showAccountSwitcher={showAccountSwitcher}
            actions={topbarActions}
            notice={topbarNotice}
            flushWithContent={contactWorkspace}
          />
          <div
            className={cn(
              "min-h-0 flex-1",
              fullBleedContent
                ? "flex flex-col overflow-hidden p-0"
                : "overflow-y-auto overflow-x-hidden px-[var(--page-padding-x)] py-[var(--page-padding-y)]",
            )}
          >
            <PageBreadcrumbs
              className={cn(
                "shrink-0 md:hidden",
                contactWorkspace
                  ? "border-b border-border/80 bg-background px-3 py-2.5"
                  : "mb-[var(--page-stack-gap)]",
              )}
            />
            {children}
          </div>
        </SidebarInset>
      </PageMetadataProvider>
    </SidebarProvider>
  );
}
