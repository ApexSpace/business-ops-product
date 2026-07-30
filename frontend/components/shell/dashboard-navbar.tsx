"use client";

import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { flattenNavSections } from "./sidebar-nav-utils";
import { AppsLauncherSheet } from "./apps-launcher";
import {
  DashboardNavbarActions,
  DashboardNavbarIconButton,
} from "./dashboard-navbar-actions";
import { DashboardNavbarLogo } from "./dashboard-navbar-logo";
import { DashboardNavbarNav } from "./dashboard-navbar-nav";

interface DashboardNavbarProps {
  sections: ShellNavSection[];
  appsItems?: ShellNavItem[];
  productName?: string;
  logoUrl?: string | null;
  businessName?: string;
  notice?: React.ReactNode;
  className?: string;
}

export function DashboardNavbar({
  sections,
  appsItems = [],
  productName = "PandaCue",
  logoUrl,
  businessName,
  notice,
  className,
}: DashboardNavbarProps) {
  const [appsOpen, setAppsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Exact primary sidebar tabs — not Figma marketing samples
  const navItems = useMemo(() => flattenNavSections(sections), [sections]);

  const showApps = appsItems.length > 0;

  return (
    <div className={cn("shrink-0 px-5 pt-5", className)}>
      <header
        className={cn(
          "shell-navbar-gradient mx-auto flex h-[66px] w-full max-w-[1440px] items-center",
          "rounded-[12px] px-6 shadow-[0_8px_24px_rgba(126,59,237,0.18)]",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <DashboardNavbarLogo productName={productName} logoUrl={logoUrl} />
          <DashboardNavbarNav items={navItems} className="hidden xl:flex" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DashboardNavbarIconButton
            label="Open menu"
            className="xl:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" strokeWidth={1.75} />
          </DashboardNavbarIconButton>

          <DashboardNavbarActions
            showApps={showApps}
            appsOpen={appsOpen}
            onAppsOpenChange={setAppsOpen}
            businessName={businessName}
          />
        </div>
      </header>

      {notice ? (
        <div className="mx-auto mt-3 w-full max-w-[1440px]">{notice}</div>
      ) : null}

      <AppsLauncherSheet
        items={appsItems}
        open={appsOpen}
        onOpenChange={setAppsOpen}
      />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-full max-w-xs gap-0 p-0">
          <SheetHeader className="border-b border-border/70 px-5 py-4">
            <SheetTitle className="text-subtitle text-foreground">Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-4">
            <DashboardNavbarNav
              items={navItems}
              onNavigate={() => setMobileOpen(false)}
              className="h-auto flex-col items-stretch gap-1"
            />
            {showApps ? (
              <button
                type="button"
                className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-body-small font-semibold text-foreground hover:bg-muted"
                onClick={() => {
                  setMobileOpen(false);
                  setAppsOpen(true);
                }}
              >
                Apps
              </button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
