import type { LucideIcon } from "lucide-react";

export interface ShellNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Snapshot navigation key for section grouping. */
  navKey?: string;
  /** Highlight when pathname is under this href's section (e.g. Settings footer). */
  matchPrefix?: boolean;
}

export interface ShellNavSection {
  id: string;
  label: string;
  items: ShellNavItem[];
}

export type SidebarNavMode = "main" | "settings";

export interface ShellBrand {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}
