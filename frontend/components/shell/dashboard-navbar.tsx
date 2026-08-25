"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { resolveNavbarNavItems } from "@/lib/config/navigation/business-nav-catalog";
import { useShellApps } from "./shell-apps-context";
import { DashboardNavbarActions } from "./dashboard-navbar-actions";
import { DashboardNavbarLogo } from "./dashboard-navbar-logo";
import { DashboardNavbarNav } from "./dashboard-navbar-nav";

interface DashboardNavbarProps {
  sections: ShellNavSection[];
  appsItems?: ShellNavItem[];
  productName?: string;
  logoUrl?: string | null;
  businessName?: string;
  homeHref?: string;
  shellMode?: "platform" | "business";
  notice?: React.ReactNode;
  className?: string;
}

/**
 * Full-bleed top navbar — attached to viewport edges.
 * Solid Figma brand fill; logo/nav left, actions right.
 */
export function DashboardNavbar({
  sections: _sections,
  productName = "PandaCue",
  logoUrl,
  businessName,
  homeHref,
  shellMode = "business",
  notice,
  className,
}: DashboardNavbarProps) {
  const { appsItems, appsOpen, setAppsOpen } = useShellApps();
  const navItems = useMemo(
    () => resolveNavbarNavItems(appsItems),
    [appsItems],
  );

  return (
    <div className={cn("shrink-0", className)}>
      <header
        className={cn(
          "shell-navbar-surface flex w-full items-center rounded-none",
          "h-[var(--shell-navbar-height)]",
          "px-4 sm:px-6 lg:px-10",
        )}
      >
        <div className="flex h-full w-full min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 lg:gap-8">
            <DashboardNavbarLogo
              productName={productName}
              logoUrl={logoUrl}
              href={homeHref}
            />
            <DashboardNavbarNav
              items={navItems}
              className="hidden min-w-0 flex-1 sm:flex"
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 md:gap-2">
            <DashboardNavbarActions
              showApps
              appsOpen={appsOpen}
              onAppsOpenChange={setAppsOpen}
              businessName={businessName}
              shellMode={shellMode}
            />
          </div>
        </div>
      </header>

      {notice}
    </div>
  );
}
