"use client";

import { LogOut } from "lucide-react";
import { useAppRouter } from "@/lib/hooks/use-app-router";
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
import { cn } from "@/lib/utils";

const sidebarUserTriggerClassName =
  "glass-hover flex h-11 w-full items-center gap-2 rounded-2xl border border-[color:var(--glass-border)] bg-white/55 px-3 text-left text-[#12172b] transition-colors hover:bg-white/78 hover:text-[#12172b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-expanded:bg-white aria-expanded:text-[#12172b] data-popup-open:bg-white data-popup-open:text-[#12172b]";

interface UserMenuProps {
  /** Compact trigger for sidebar footer */
  variant?: "avatar" | "sidebar";
  className?: string;
}

export function UserMenu({ variant = "avatar", className }: UserMenuProps) {
  const router = useAppRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const displayName = user ? getUserDisplayName(user) : "Account";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      {variant === "sidebar" ? (
        <DropdownMenuTrigger
          className={cn(sidebarUserTriggerClassName, className)}
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-[#98a1b5]">
              {user?.email}
            </p>
          </div>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className={cn(
                "relative size-8 shrink-0 rounded-full bg-transparent p-0 hover:bg-transparent",
                className,
              )}
            />
          }
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        className="w-56"
      >
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DarkModeMenuItem />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
