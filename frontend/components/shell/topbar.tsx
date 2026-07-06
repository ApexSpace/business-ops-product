"use client";

import { cn } from "@/lib/utils";
import { AppSearchIconButton } from "./app-search-icon-button";
import { useOptionalCommandPalette } from "./command-palette-provider";
import { MobileSidebarMenuTrigger } from "./sidebar-toggle";
import { TopbarPageHeading } from "./topbar-page-heading";
import { TopbarUserActions } from "./topbar-user-actions";
import { getUserDisplayName } from "@/lib/auth";
import { useAuth } from "@/lib/auth/provider";

interface TopbarProps {
  actions?: React.ReactNode;
  notice?: React.ReactNode;
  showSearch?: boolean;
  showUserActions?: boolean;
  businessName?: string;
  className?: string;
}

export function Topbar({
  actions,
  notice,
  showSearch = true,
  showUserActions = true,
  businessName,
  className,
}: TopbarProps) {
  const { user } = useAuth();
  const displayName = user ? getUserDisplayName(user) : "Account";
  const commandPalette = useOptionalCommandPalette();

  const searchButton = showSearch ? (
    <AppSearchIconButton onClick={() => commandPalette?.openPalette()} />
  ) : null;

  const userActions = showUserActions ? (
    <TopbarUserActions
      actions={actions}
      businessName={businessName}
      displayName={displayName}
    />
  ) : null;

  const rightCluster = (
    <div className="flex shrink-0 items-center gap-[10px]">
      {searchButton}
      {userActions}
    </div>
  );

  return (
    <div
      className={cn(
        "shell-topbar-soft sticky top-0 z-10 shrink-0 border-b border-border/60 px-[var(--page-padding-x)] pt-2.5 pb-2",
        className,
      )}
    >
      <div className="w-full">
        <header className="hidden items-center justify-between gap-4 lg:flex">
          <TopbarPageHeading className="min-w-0 flex-1 pr-4" />
          {rightCluster}
        </header>

        <header className="flex items-start gap-3 lg:hidden">
          <MobileSidebarMenuTrigger className="mt-0.5 shrink-0" />
          <TopbarPageHeading className="min-w-0 flex-1" compact />
          {rightCluster}
        </header>

        {notice}
      </div>
    </div>
  );
}
