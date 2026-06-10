"use client";

import { AccountSwitcher } from "@/components/account-switcher/account-switcher";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { cn } from "@/lib/utils";
import { SHELL_HEADER_HEIGHT } from "./shell-constants";
import { MobileSidebarMenuTrigger } from "./sidebar-toggle";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  showAccountSwitcher?: boolean;
  actions?: React.ReactNode;
  /** Renders in the main-column header (never under the sidebar). */
  notice?: React.ReactNode;
  /** Contact workspace: static header row; content fills area below (no sticky overlap). */
  flushWithContent?: boolean;
  className?: string;
}

export function Topbar({
  showAccountSwitcher = false,
  actions,
  notice,
  flushWithContent = false,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        SHELL_HEADER_HEIGHT,
        "z-20 flex shrink-0 items-center gap-2 border-b border-border/80 bg-background px-3 sm:gap-3 sm:px-4",
        flushWithContent
          ? "relative"
          : "sticky top-0 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <MobileSidebarMenuTrigger />

        {notice ? (
          <>
            <div className="hidden min-w-0 shrink-0 md:block">
              <PageBreadcrumbs />
            </div>
            <div className="min-w-0 flex-1">{notice}</div>
          </>
        ) : (
          <div className="hidden min-w-0 flex-1 md:block">
            <PageBreadcrumbs />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {actions}
        {showAccountSwitcher ? (
          <div className="min-w-0 max-w-[min(240px,40vw)]">
            <AccountSwitcher />
          </div>
        ) : null}
        <UserMenu variant="avatar" />
      </div>
    </header>
  );
}
