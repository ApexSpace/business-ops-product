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
  const isAutomationsNav = item.href === "/business/settings/automations";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link
            href={item.href}
            prefetch={isAutomationsNav ? false : undefined}
          />
        }
        isActive={active}
        tooltip={tooltip ?? item.title}
        className={cn(
          "glass-hover relative h-9 gap-2.5 rounded-[10px] px-3 text-[13px] font-normal text-[#5b6478] transition-[background-color,color,box-shadow] duration-150",
          "hover:bg-white/55 hover:text-[#12172b]",
          "data-active:border data-active:border-[color:var(--glass-border)] data-active:bg-white data-active:font-semibold data-active:text-[#12172b] data-active:shadow-[0_2px_8px_rgba(18,23,43,0.06)]",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            active
              ? "text-[#375bd2]"
              : "text-[#98a1b5]",
          )}
        />
        <span className="truncate">{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
