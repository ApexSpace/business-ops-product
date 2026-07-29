"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/lib/types/shell-nav";
import { isNavItemActive } from "./sidebar-nav-utils";
import { useHydrated } from "@/lib/hooks/use-hydrated";

interface AppsLauncherProps {
  items: ShellNavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AppsLauncherGridItem({
  item,
  onNavigate,
}: {
  item: ShellNavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-card p-4 text-center transition-colors",
        "hover:border-primary/30 hover:bg-muted/40",
        active && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </div>
      <span className="line-clamp-2 text-[12px] font-medium leading-tight text-foreground">
        {item.title}
      </span>
    </Link>
  );
}

export function AppsLauncher({ items, open, onOpenChange }: AppsLauncherProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const appsActive =
    hydrated && items.some((item) => isNavItemActive(pathname, item));

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          onClick={() => onOpenChange(true)}
          isActive={appsActive}
          tooltip="Apps"
          className={cn(
            "glass-hover relative h-9 gap-2.5 rounded-[10px] px-3 text-[13px] font-normal text-[#5b6478] transition-[background-color,color,box-shadow] duration-150",
            "hover:bg-white/55 hover:text-[#12172b]",
            "data-active:border data-active:border-[color:var(--glass-border)] data-active:bg-white data-active:font-semibold data-active:text-[#12172b] data-active:shadow-[0_2px_8px_rgba(18,23,43,0.06)]",
          )}
        >
          <LayoutGrid
            className={cn(
              "size-4 shrink-0",
              appsActive ? "text-[#375bd2]" : "text-[#98a1b5]",
            )}
          />
          <span className="truncate">Apps</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-full max-w-md gap-0 p-0 [--sheet-width:min(92vw,28rem)]"
          showCloseButton
        >
          <SheetHeader className="border-b border-border/70 px-6 py-5">
            <SheetTitle className="text-lg font-semibold tracking-tight">
              Apps
            </SheetTitle>
            <SheetDescription className="text-[13px] text-muted-foreground">
              Catalog, payments, and other business tools
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto p-6 sm:grid-cols-3">
            {items.map((item) => (
              <AppsLauncherGridItem
                key={item.href}
                item={item}
                onNavigate={() => onOpenChange(false)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
