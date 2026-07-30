"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/lib/types/shell-nav";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { isNavItemActive } from "./sidebar-nav-utils";

interface DashboardNavbarLinkProps {
  item: ShellNavItem;
  onNavigate?: () => void;
  className?: string;
}

export function DashboardNavbarLink({
  item,
  onNavigate,
  className,
}: DashboardNavbarLinkProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-[38px] shrink-0 items-center justify-center rounded-lg px-4",
        "text-body-small font-semibold tracking-normal text-black-secondary-normal",
        "transition-colors hover:bg-black-secondary-normal/5",
        active &&
          "bg-white/25 ring-1 ring-violet-primary-normal/80",
        className,
      )}
    >
      {item.title}
    </Link>
  );
}

interface DashboardNavbarNavProps {
  items: ShellNavItem[];
  onNavigate?: () => void;
  className?: string;
}

export function DashboardNavbarNav({
  items,
  onNavigate,
  className,
}: DashboardNavbarNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      className={cn("flex h-[38px] items-center gap-[19px]", className)}
    >
      {items.map((item) => (
        <DashboardNavbarLink
          key={item.href}
          item={item}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
