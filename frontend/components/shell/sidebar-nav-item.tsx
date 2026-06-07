"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/lib/types/shell-nav";
import { isNavItemActive } from "./sidebar-nav-utils";

interface SidebarNavItemProps {
  item: ShellNavItem;
  tooltip?: string;
}

export function SidebarNavItem({ item, tooltip }: SidebarNavItemProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={active}
        tooltip={tooltip ?? item.title}
        className={cn(
          "relative h-9 gap-2 rounded-md px-2 text-[14px] font-normal transition-[background-color,color] duration-150",
          "hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground",
          "data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground",
          "data-active:before:absolute data-active:before:top-1/2 data-active:before:left-0 data-active:before:h-4 data-active:before:w-[2px] data-active:before:-translate-y-1/2 data-active:before:rounded-full data-active:before:bg-sidebar-primary",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            active
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/60",
          )}
        />
        <span className="truncate">{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
