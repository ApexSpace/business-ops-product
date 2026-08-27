"use client";

import Link from "next/link";
import {
  Bell,
  CreditCard,
  LayoutGrid,
  LogOut,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DarkModeMenuItem } from "@/components/theme/dark-mode-toggle";
import { hasPlatformBusinessAdminAccess } from "@/features/auth/permissions/permissions-legacy";
import { canAccessSettingsHref } from "@/features/team/permissions/staff-permissions";
import { useAuth } from "@/lib/auth/provider";
import { getUserDisplayName } from "@/lib/auth";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { cn } from "@/lib/utils";
import {
  NAVBAR_ACTION_CLUSTER_CLASS,
  NAVBAR_ACTION_ICON_CLASS,
  NAVBAR_USER_MENU_CONTENT_CLASS,
  NAVBAR_USER_MENU_SIDE_OFFSET,
  NAVBAR_USER_TRIGGER_CLASS,
} from "@/lib/design/navbar-action-tokens";

interface DashboardNavbarIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export function DashboardNavbarIconButton({
  label,
  active,
  className,
  children,
  ...props
}: DashboardNavbarIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(NAVBAR_ACTION_ICON_CLASS, className)}
      {...props}
    >
      {children}
    </button>
  );
}

interface DashboardNavbarActionsProps {
  appsOpen?: boolean;
  onAppsOpenChange?: (open: boolean) => void;
  showApps?: boolean;
  businessName?: string;
  shellMode?: "platform" | "business";
  className?: string;
}

export function DashboardNavbarActions({
  appsOpen,
  onAppsOpenChange,
  showApps = true,
  businessName,
  shellMode = "business",
  className,
}: DashboardNavbarActionsProps) {
  const router = useAppRouter();
  const { user, jwt, contexts, logout } = useAuth();
  const displayName = user ? getUserDisplayName(user) : "Account";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isPlatform = shellMode === "platform";
  const settingsHref = isPlatform
    ? "/platform/settings"
    : "/business/settings";
  const notificationsHref = "/business/settings/notifications";
  const canViewBilling =
    !isPlatform &&
    canAccessSettingsHref("/business/settings/billing", {
      businessRole: jwt?.businessRole ?? user?.businessRole ?? undefined,
      staffPermissions:
        jwt?.staffPermissions ?? user?.staffPermissions ?? undefined,
      isPlatformAdmin: hasPlatformBusinessAdminAccess(jwt, contexts),
    });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className={cn(NAVBAR_ACTION_CLUSTER_CLASS, className)}>
      {showApps ? (
        <DashboardNavbarIconButton
          label="Apps"
          active={appsOpen}
          onClick={() => onAppsOpenChange?.(true)}
        >
          <LayoutGrid
            className="size-[var(--shell-navbar-tab-icon-size)]"
            strokeWidth={1.75}
          />
        </DashboardNavbarIconButton>
      ) : null}

      {!isPlatform ? (
        <Link
          href={notificationsHref}
          aria-label="Notifications"
          className={NAVBAR_ACTION_ICON_CLASS}
        >
          <Bell
            className="size-[var(--shell-navbar-tab-icon-size)]"
            strokeWidth={1.75}
          />
        </Link>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger className={NAVBAR_USER_TRIGGER_CLASS}>
          <Avatar className="size-8 after:border-white/20">
            <AvatarFallback className="bg-violet-primary-darker text-caption font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {businessName ? (
            <span className="hidden min-w-0 max-w-40 flex-col items-start gap-1 text-left md:flex">
              <span className="w-full truncate text-body-small font-semibold leading-none text-[var(--shell-navbar-foreground)]">
                {displayName}
              </span>
              <span className="w-full truncate text-caption leading-none text-white/70">
                {businessName}
              </span>
            </span>
          ) : (
            <span className="hidden min-w-0 max-w-40 truncate text-body-small font-semibold leading-none text-[var(--shell-navbar-foreground)] md:inline">
              {displayName}
            </span>
          )}
          <span className="inline-flex shrink-0">
            <NavArrowIcon direction="down" size="md" className="text-white" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          showArrow
          sideOffset={NAVBAR_USER_MENU_SIDE_OFFSET}
          className={NAVBAR_USER_MENU_CONTENT_CLASS}
        >
          <div className="px-3 py-2 text-sm">
            {businessName ? (
              <p className="text-caption text-muted-foreground">{businessName}</p>
            ) : null}
            <p className="font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href={settingsHref} />}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          {canViewBilling ? (
            <DropdownMenuItem
              render={<Link href="/business/settings/billing" />}
            >
              <CreditCard className="size-4" />
              Plan & Billing
            </DropdownMenuItem>
          ) : null}
          <DarkModeMenuItem />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
