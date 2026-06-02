"use client";

import { LogOut } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
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
import { useAuth } from "@/lib/auth-provider";
import { getUserDisplayName } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

  const trigger =
    variant === "sidebar" ? (
      <Button
        variant="ghost"
        className={cn(
          "h-10 w-full justify-start gap-2 px-2 font-normal hover:bg-sidebar-accent",
          className,
        )}
      >
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </Button>
    ) : (
      <Button
        variant="ghost"
        className={cn("relative size-8 shrink-0 rounded-full", className)}
      >
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
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
