"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/lib/types/shell-nav";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { isNavItemActive } from "./sidebar-nav-utils";
import {
  captureExtrasOriginWidth,
  countCoreNavbarItems,
  countFittingNavbarItems,
  packItemsIntoWidth,
  readFlexGapPx,
} from "@/lib/config/navigation/navbar-overflow";

type NavbarTone = "onBrand" | "default";

const NAVBAR_TAB_LAYOUT_CLASS =
  "h-[var(--shell-navbar-tab-height)] rounded-[var(--shell-navbar-tab-radius)] px-[var(--shell-navbar-tab-padding-x)] py-[var(--shell-navbar-tab-padding-y)]";

const NAVBAR_TAB_CONTENT_CLASS =
  "inline-flex items-center gap-[var(--shell-navbar-tab-icon-gap)]";

const NAVBAR_TAB_ICON_CLASS =
  "size-[var(--shell-navbar-tab-icon-size)] shrink-0";

function NavbarTabContent({ item }: { item: ShellNavItem }) {
  const Icon = item.icon;
  return (
    <>
      <Icon className={NAVBAR_TAB_ICON_CLASS} aria-hidden />
      <span className="whitespace-nowrap">{item.title}</span>
    </>
  );
}

interface DashboardNavbarLinkProps {
  item: ShellNavItem;
  onNavigate?: () => void;
  tone?: NavbarTone;
  className?: string;
  tabIndex?: number;
}

export function DashboardNavbarLink({
  item,
  onNavigate,
  tone = "onBrand",
  className,
  tabIndex,
}: DashboardNavbarLinkProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);
  const onBrand = tone === "onBrand";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      tabIndex={tabIndex}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex shrink-0 items-center justify-center",
        "text-body-small font-semibold tracking-normal transition-colors",
        onBrand
          ? cn(
              NAVBAR_TAB_LAYOUT_CLASS,
              "text-[var(--shell-navbar-foreground)]",
            )
          : cn(
              "h-10 rounded-lg px-4 text-foreground hover:bg-muted",
              active && "bg-muted",
            ),
        className,
      )}
    >
      <span className={cn("relative leading-none", NAVBAR_TAB_CONTENT_CLASS)}>
        <NavbarTabContent item={item} />
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

function NavbarItemWidthProbe({ item }: { item: ShellNavItem }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        "text-body-small font-semibold tracking-normal",
        NAVBAR_TAB_LAYOUT_CLASS,
      )}
    >
      <span className={NAVBAR_TAB_CONTENT_CLASS}>
        <NavbarTabContent item={item} />
      </span>
    </span>
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
  const containerRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const extrasOriginWidthRef = useRef<number | null>(null);
  const coreCount = countCoreNavbarItems(
    items.map((item) => item.navbarPriority),
  );
  const [visibleCount, setVisibleCount] = useState(coreCount);

  useLayoutEffect(() => {
    extrasOriginWidthRef.current = null;
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      const probes = [...measure.children] as HTMLElement[];
      const itemWidths = probes.map((el) => el.getBoundingClientRect().width);
      if (itemWidths.some((width) => width <= 0)) {
        return;
      }

      const availableWidth = container.clientWidth;
      const gap = readFlexGapPx(measure);
      const coreVisible = packItemsIntoWidth(
        itemWidths.slice(0, coreCount),
        availableWidth,
        gap,
      );
      extrasOriginWidthRef.current = captureExtrasOriginWidth(
        availableWidth,
        coreVisible,
        coreCount,
        extrasOriginWidthRef.current,
      );

      const nextCount = countFittingNavbarItems({
        availableWidth,
        itemWidths,
        gap,
        coreCount,
        extrasOriginWidth: extrasOriginWidthRef.current ?? availableWidth,
      });
      setVisibleCount(nextCount);
    };

    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(measure);
    update();

    return () => {
      observer.disconnect();
    };
  }, [items, coreCount]);

  if (items.length === 0) return null;

  const visibleItems = items.slice(0, visibleCount);

  return (
    <nav
      ref={containerRef}
      aria-label="Primary"
      className={cn(
        "relative min-w-0",
        tone === "onBrand" ? "h-[var(--shell-navbar-tab-height)]" : "h-10",
        className,
      )}
    >
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-[var(--spacing-2)] whitespace-nowrap"
      >
        {items.map((item) => (
          <NavbarItemWidthProbe key={item.href} item={item} />
        ))}
      </div>
      <div className="flex h-full min-w-0 items-center gap-[var(--spacing-2)] overflow-hidden">
        {visibleItems.map((item) => (
          <DashboardNavbarLink
            key={item.href}
            item={item}
            onNavigate={onNavigate}
            tone={tone}
          />
        ))}
      </div>
    </nav>
  );
}
