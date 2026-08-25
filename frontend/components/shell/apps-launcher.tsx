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
  active = false,
}: {
  icon: ShellNavItem["icon"];
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-[var(--control-height-sm)] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary",
        active && "bg-primary/15",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

function AppsPanelItem({
  item,
  onNavigate,
}: {
  item: ShellNavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[var(--control-height)] min-w-0 items-center gap-[var(--spacing-2)] rounded-[var(--radius-md)] px-[var(--spacing-2)] py-[var(--spacing-2)] transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/5",
      )}
    >
      <AppsIconWell icon={item.icon} active={active} />
      <span className="truncate text-body-small font-medium text-foreground">
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
    return groupAppsPanelSections(filtered).filter(
      (section) => section.id !== "frequently-used",
    );
  }, [items, query]);

  const hasResults = sections.some((section) => section.items.length > 0);

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      width="conversation"
      title="Apps"
      showCloseButton
      headerClassName="!px-[var(--spacing-4)] !pt-[var(--spacing-4)] !pb-[var(--spacing-2)] sm:!px-[var(--spacing-6)]"
      contentClassName={cn(
        "flex flex-col gap-[var(--spacing-4)]",
        "!px-[var(--spacing-4)] !py-[var(--spacing-2)] sm:!px-[var(--spacing-6)]",
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
        <div className="flex flex-col gap-[var(--spacing-4)]">
          {sections.map((section) => (
            <section
              key={section.id}
              className="flex flex-col gap-[var(--spacing-2)]"
            >
              <h2 className="text-nav-group">{section.label}</h2>
              <div className="grid grid-cols-1 gap-x-[var(--spacing-2)] gap-y-[var(--spacing-2)] sm:grid-cols-2 lg:grid-cols-4">
                {section.items.map((item) => (
                  <AppsPanelItem
                    key={`${section.id}:${item.href}`}
                    item={item}
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
