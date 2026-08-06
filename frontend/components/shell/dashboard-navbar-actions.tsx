"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
        "text-black-secondary-normal transition-colors hover:bg-black-secondary-normal/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black-secondary-normal/30",
        active && "bg-black-secondary-normal/10",
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
  const { user, logout } = useAuth();
  const displayName = user ? getUserDisplayName(user) : "Account";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className={cn("flex h-10 shrink-0 items-center gap-6", className)}>
      <div className="flex items-center gap-3">
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
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
            "text-black-secondary-normal transition-colors hover:bg-black-secondary-normal/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black-secondary-normal/30",
          )}
        >
          <Settings className="size-5" strokeWidth={1.75} />
        </Link>

        <Link
          href="/business/settings/notifications"
          aria-label="Notifications"
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
            "text-black-secondary-normal transition-colors hover:bg-black-secondary-normal/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black-secondary-normal/30",
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
              className="flex h-10 items-center gap-3 rounded-lg bg-transparent px-1 py-0 hover:bg-black-secondary-normal/10"
            />
          }
        >
          {businessName ? (
            <div className="hidden max-w-[160px] text-right sm:block">
              <p className="truncate text-caption leading-none text-black-secondary-normal/70">
                {businessName}
              </p>
              <p className="mt-1 truncate text-body-small font-semibold leading-none text-black-secondary-normal">
                {displayName}
              </p>
            </div>
          ) : null}
          <Avatar size="lg" className="size-10">
            <AvatarFallback className="bg-violet-primary-dark text-caption font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown
            className="size-5 text-black-secondary-normal"
            strokeWidth={1.75}
          />
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
