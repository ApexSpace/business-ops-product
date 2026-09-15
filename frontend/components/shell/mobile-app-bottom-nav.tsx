"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutGrid,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useShellApps } from "@/components/shell/shell-apps-context";
import { MOBILE_LIST_BOTTOM_NAV_HEIGHT_PX } from "@/lib/design/mobile-list-tokens";
import { cn } from "@/lib/utils";

const TAB_CLASS =
  "relative flex h-full min-h-[44px] min-w-[72px] flex-1 flex-col items-center justify-center gap-1 text-[var(--drawer-icon-gear)] transition-colors";

type ShellMode = "platform" | "business";

type BottomNavTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const BUSINESS_TABS: BottomNavTab[] = [
  {
    href: "/business/contacts",
    label: "Clients",
    icon: Users,
    isActive: (pathname) => pathname.startsWith("/business/contacts"),
  },
  {
    href: "/business/appointments",
    label: "Appointments",
    icon: CalendarDays,
    isActive: (pathname) => pathname.startsWith("/business/appointments"),
  },
];

const PLATFORM_TABS: BottomNavTab[] = [
  {
    href: "/platform/users",
    label: "Users",
    icon: Users,
    isActive: (pathname) => pathname.startsWith("/platform/users"),
  },
  {
    href: "/platform/conversations",
    label: "Inbox",
    icon: MessageSquare,
    isActive: (pathname) => pathname.startsWith("/platform/conversations"),
  },
];

function isAppsTabActive(pathname: string, tabs: BottomNavTab[]): boolean {
  const prefix = pathname.startsWith("/platform/") ? "/platform/" : "/business/";
  if (!pathname.startsWith(prefix)) return false;
  return !tabs.some((tab) => tab.isActive(pathname));
}

/**
 * Shared product mobile bottom nav.
 * Business: Clients · Appointments · Apps.
 * Platform: Users · Inbox · Apps.
 * Owned by AppShell — do not mount per page.
 */
export function MobileAppBottomNav({
  className,
  shellMode = "business",
}: {
  className?: string;
  shellMode?: ShellMode;
}) {
  const pathname = usePathname();
  const { openApps, appsItems } = useShellApps();
  const tabs = shellMode === "platform" ? PLATFORM_TABS : BUSINESS_TABS;
  const appsActive = isAppsTabActive(pathname, tabs);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex w-full shrink-0 items-stretch justify-between border-t border-[var(--pc-black-secondary-light)] bg-white",
        "pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
      style={{ minHeight: MOBILE_LIST_BOTTOM_NAV_HEIGHT_PX }}
    >
      {tabs.map((tab) => {
        const active = tab.isActive(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(TAB_CLASS, active && "text-violet-primary-normal")}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            {active ? (
              <span
                className="absolute bottom-1.5 h-0.5 w-6 rounded-full bg-violet-primary-normal"
                aria-hidden
              />
            ) : null}
            <span className="sr-only">{tab.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        className={cn(TAB_CLASS, appsActive && "text-violet-primary-normal")}
        onClick={() => openApps()}
        disabled={appsItems.length === 0}
        aria-label="Apps"
        aria-current={appsActive ? "page" : undefined}
      >
        <LayoutGrid className="size-6" strokeWidth={1.75} aria-hidden />
        {appsActive ? (
          <span
            className="absolute bottom-1.5 h-0.5 w-6 rounded-full bg-violet-primary-normal"
            aria-hidden
          />
        ) : null}
      </button>
    </nav>
  );
}
