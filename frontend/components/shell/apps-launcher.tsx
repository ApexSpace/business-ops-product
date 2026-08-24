"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search } from "lucide-react";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/lib/types/shell-nav";
import { isNavItemActive } from "./sidebar-nav-utils";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import {
  APPS_MANAGE_HREF,
  AppsManageIcon,
  filterAppsPanelItems,
  groupAppsPanelSections,
} from "@/lib/config/navigation/business-nav-catalog";

interface AppsLauncherSheetProps {
  items: ShellNavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AppsIconWell({
  icon: Icon,
  featured = false,
  active = false,
}: {
  icon: ShellNavItem["icon"];
  featured?: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary",
        featured
          ? "size-[var(--control-height)]"
          : "size-[var(--control-height-sm)]",
        active && "bg-primary/15",
      )}
    >
      <Icon className={featured ? "size-5" : "size-4"} aria-hidden />
    </span>
  );
}

function AppsPanelItem({
  item,
  layout,
  onNavigate,
}: {
  item: ShellNavItem;
  layout: "featured" | "grid";
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);
  const featured = layout === "featured";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-h-[var(--control-height)] rounded-[var(--radius-md)] transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/5",
        featured
          ? "flex flex-col items-center justify-center gap-[var(--spacing-2)] px-[var(--spacing-2)] py-[var(--spacing-4)] text-center"
          : "flex items-center gap-[var(--spacing-2)] px-[var(--spacing-2)] py-[var(--spacing-2)]",
      )}
    >
      <AppsIconWell icon={item.icon} featured={featured} active={active} />
      <span
        className={cn(
          "text-body-small text-foreground",
          featured ? "line-clamp-2 font-medium" : "truncate font-medium",
        )}
      >
        {item.title}
      </span>
    </Link>
  );
}

export function AppsLauncherSheet({
  items,
  open,
  onOpenChange,
}: AppsLauncherSheetProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const sections = useMemo(() => {
    const filtered = filterAppsPanelItems(items, query);
    const grouped = groupAppsPanelSections(filtered);
    if (query.trim()) {
      return grouped.filter((section) => section.id !== "frequently-used");
    }
    return grouped;
  }, [items, query]);

  const hasResults = sections.some((section) => section.items.length > 0);

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      width="split"
      title="Apps"
      showCloseButton
      contentClassName={cn(
        "flex flex-col gap-[var(--spacing-6)]",
        "px-[var(--spacing-6)] py-[var(--spacing-4)]",
      )}
      footerClassName="justify-center"
      footer={
        <Link
          href={APPS_MANAGE_HREF}
          onClick={() => onOpenChange(false)}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "gap-[var(--spacing-2)]",
          )}
        >
          <AppsManageIcon className="size-4" aria-hidden />
          Manage apps
        </Link>
      }
    >
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Search apps and settings
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-[var(--spacing-4)] size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={searchRef}
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search apps and settings"
          autoComplete="off"
          className="ps-[calc(var(--spacing-6)+var(--spacing-4))]"
        />
      </div>

      {hasResults ? (
        <div className="flex flex-col gap-[var(--spacing-6)]">
          {sections.map((section) => (
            <section
              key={section.id}
              className="flex flex-col gap-[var(--spacing-2)]"
            >
              <h2 className="text-nav-group">{section.label}</h2>
              <div
                className={
                  section.layout === "featured"
                    ? "grid grid-cols-3 gap-[var(--spacing-2)] sm:grid-cols-4 lg:grid-cols-5"
                    : "grid grid-cols-1 gap-[var(--spacing-2)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                }
              >
                {section.items.map((item) => (
                  <AppsPanelItem
                    key={`${section.id}:${item.href}`}
                    item={item}
                    layout={section.layout}
                    onNavigate={() => onOpenChange(false)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-body-small text-muted-foreground">
          No apps match your search.
        </p>
      )}
    </DrawerShell>
  );
}

interface AppsLauncherProps {
  items: ShellNavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sidebar trigger + sheet (platform / legacy shell). */
export function AppsLauncher({ items, open, onOpenChange }: AppsLauncherProps) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const appsActive =
    hydrated && items.some((item) => isNavItemActive(pathname, item));

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          onClick={() => onOpenChange(true)}
          isActive={appsActive}
          tooltip="Apps"
          className={cn(
            "glass-hover relative h-9 gap-2.5 rounded-[10px] px-3 text-[13px] font-normal text-[#5b6478] transition-[background-color,color,box-shadow] duration-150",
            "hover:bg-white/55 hover:text-[#12172b]",
            "data-active:border data-active:border-[color:var(--glass-border)] data-active:bg-white data-active:font-semibold data-active:text-[#12172b] data-active:shadow-[0_2px_8px_rgba(18,23,43,0.06)]",
          )}
        >
          <LayoutGrid
            className={cn(
              "size-4 shrink-0",
              appsActive ? "text-primary" : "text-[#98a1b5]",
            )}
          />
          <span className="truncate">Apps</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <AppsLauncherSheet
        items={items}
        open={open}
        onOpenChange={onOpenChange}
      />
    </>
  );
}
