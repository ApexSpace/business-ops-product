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
    <SidebarGroup className="px-2 py-0.5">
      <SidebarGroupLabel className="mb-0.5 h-6 px-2 text-[10px] font-semibold tracking-widest text-sidebar-foreground/45 uppercase">
        {section.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-px">
          {section.items.map((item) => (
            <SidebarNavItem key={item.href} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
