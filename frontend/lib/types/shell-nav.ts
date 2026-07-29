import type { LucideIcon } from "lucide-react";

export type ShellNavTier = "primary" | "apps";

export interface ShellNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Snapshot navigation key for section grouping. */
  navKey?: string;
  /** Primary sidebar vs Apps launcher. */
  navTier?: ShellNavTier;
  /** Highlight when pathname is under this href's section (e.g. Settings footer). */
  matchPrefix?: boolean;
}

export interface ShellNavSection {
  id: string;
  label: string;
  items: ShellNavItem[];
  /** When true, section label is not rendered (flat primary nav). */
  hideLabel?: boolean;
}

export type SidebarNavMode = "main" | "settings";

export interface ShellBrand {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}
