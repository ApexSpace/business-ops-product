"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/lib/types/shell-nav";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { isNavItemActive } from "./sidebar-nav-utils";
import { navbarPriorityVisibilityClass } from "@/lib/config/navigation/business-nav-catalog";

type NavbarTone = "onBrand" | "default";

interface DashboardNavbarLinkProps {
  item: ShellNavItem;
  onNavigate?: () => void;
  tone?: NavbarTone;
  className?: string;
}

export function DashboardNavbarLink({
  item,
  onNavigate,
  tone = "onBrand",
  className,
}: DashboardNavbarLinkProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);
  const onBrand = tone === "onBrand";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group shrink-0 items-center justify-center",
        navbarPriorityVisibilityClass(item.navbarPriority),
        "text-body-small font-semibold tracking-normal transition-colors",
        onBrand
          ? cn(
              "h-[var(--shell-navbar-tab-height)]",
              "rounded-[var(--shell-navbar-tab-radius)]",
              "px-[var(--shell-navbar-tab-padding-x)] py-[var(--shell-navbar-tab-padding-y)]",
              "text-[var(--shell-navbar-foreground)]",
            )
          : cn(
              "h-10 rounded-lg px-4 text-foreground hover:bg-muted",
              active && "bg-muted",
            ),
        className,
      )}
    >
      {/* Underline matches label text width only (Figma dynamic length) */}
      <span className="relative inline-block leading-none whitespace-nowrap">
        {item.title}
        {onBrand ? (
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 top-full mt-[var(--shell-navbar-tab-gap)] block h-[var(--shell-navbar-tab-underline-height)] transition-colors duration-150",
              active
                ? "bg-[var(--shell-navbar-foreground)]"
                : "bg-transparent group-hover:bg-[var(--shell-navbar-foreground)] group-focus-visible:bg-[var(--shell-navbar-foreground)]",
            )}
          />
        ) : null}
      </span>
    </Link>
  );
}

interface DashboardNavbarNavProps {
  items: ShellNavItem[];
  onNavigate?: () => void;
  tone?: NavbarTone;
  className?: string;
}

export function DashboardNavbarNav({
  items,
  onNavigate,
  tone = "onBrand",
  className,
}: DashboardNavbarNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex items-center gap-[var(--spacing-2)]",
        tone === "onBrand" ? "h-[var(--shell-navbar-tab-height)]" : "h-10",
        className,
      )}
    >
      {items.map((item) => (
        <DashboardNavbarLink
          key={item.href}
          item={item}
          onNavigate={onNavigate}
          tone={tone}
        />
      ))}
    </nav>
  );
}
