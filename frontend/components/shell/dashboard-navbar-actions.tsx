"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutGrid,
  LogOut,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DarkModeMenuItem } from "@/components/theme/dark-mode-toggle";
import { useAuth } from "@/lib/auth/provider";
import { getUserDisplayName } from "@/lib/auth";
import { isBusinessSettingsPath } from "@/lib/config/navigation/business-settings-menu";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { cn } from "@/lib/utils";

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
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
        "text-white transition-colors hover:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        active && "bg-white/10",
        className,
      )}
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
  className?: string;
}

export function DashboardNavbarActions({
  appsOpen,
  onAppsOpenChange,
  showApps = true,
  businessName,
  className,
}: DashboardNavbarActionsProps) {
  const router = useAppRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const displayName = user ? getUserDisplayName(user) : "Account";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const settingsActive = isBusinessSettingsPath(pathname);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className={cn("flex h-10 shrink-0 items-center gap-2 sm:gap-4 md:gap-6", className)}>
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        {showApps ? (
          <DashboardNavbarIconButton
            label="Apps"
            active={appsOpen}
            onClick={() => onAppsOpenChange?.(true)}
          >
            <LayoutGrid className="size-5" strokeWidth={1.75} />
          </DashboardNavbarIconButton>
        ) : null}

        <Link
          href="/business/settings"
          aria-label="Settings"
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
            "text-white transition-colors hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            settingsActive && "bg-white/10",
          )}
        >
          <Settings className="size-5" strokeWidth={1.75} />
        </Link>

        <Link
          href="/business/settings/notifications"
          aria-label="Notifications"
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
            "text-white transition-colors hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
          )}
        >
          <Bell className="size-5" strokeWidth={1.75} />
        </Link>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex h-10 items-center gap-2 rounded-lg bg-transparent px-1 py-0 text-white sm:gap-3 hover:bg-white/10 hover:text-white"
            />
          }
        >
          {businessName ? (
            <div className="hidden max-w-[160px] text-right md:block">
              <p className="truncate text-caption leading-none text-white/70">
                {businessName}
              </p>
              <p className="mt-1 truncate text-body-small font-semibold leading-none text-white">
                {displayName}
              </p>
            </div>
          ) : null}
          <Avatar size="lg" className="size-10">
            <AvatarFallback className="bg-violet-primary-darker text-caption font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <NavArrowIcon direction="down" size={20} className="text-white" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm">
            {businessName ? (
              <p className="text-caption text-muted-foreground">{businessName}</p>
            ) : null}
            <p className="font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/business/settings" />}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
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
