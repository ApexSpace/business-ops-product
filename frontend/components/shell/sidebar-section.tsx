"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import type { ShellNavSection } from "@/lib/types/shell-nav";
import { SidebarNavItem } from "./sidebar-nav-item";

interface SidebarSectionProps {
  section: ShellNavSection;
}

export function SidebarSection({ section }: SidebarSectionProps) {
  return (
    <SidebarGroup className="px-3 py-1 group-data-[collapsible=icon]:px-2">
      <SidebarGroupLabel className="mb-1 h-6 px-3 text-[10.5px] font-semibold tracking-[0.08em] text-[#98a1b5] uppercase group-data-[collapsible=icon]:px-1">
        {section.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {section.items.map((item) => (
            <SidebarNavItem key={item.href} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
