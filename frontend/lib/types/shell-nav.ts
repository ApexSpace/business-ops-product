import type { LucideIcon } from "lucide-react";

export type ShellNavTier = "primary" | "apps";
export type AppsCategoryId = "core" | "marketing" | "setup";
/** Lower number stays in the top navbar longer. Unbounded so overflow can keep packing. */
export type NavbarPriority = number;

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
  /** Apps panel category. */
  appsCategory?: AppsCategoryId;
  /** Lower number stays visible in the top navbar longer. */
  navbarPriority?: NavbarPriority;
  /** Featured in the Apps panel "Frequently used" row. */
  frequentlyUsed?: boolean;
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
