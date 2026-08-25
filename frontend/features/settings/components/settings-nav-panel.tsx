"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchInput } from "@/components/forms/search-input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isNavItemActive } from "@/components/shell/sidebar-nav-utils";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

function isSettingsIndexPath(pathname: string): boolean {
  return pathname === "/business/settings" || pathname === "/business/settings/";
}

function itemMatchesQuery(item: ShellNavItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.title.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
  );
}

export function SettingsNavPanel({
  sections,
  onNavigate,
}: {
  sections: ShellNavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => itemMatchesQuery(item, q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, sections]);

  const activeSectionId = useMemo(() => {
    if (!hydrated || isSettingsIndexPath(pathname)) return null;
    return (
      filtered.find((section) =>
        section.items.some((item) => isNavItemActive(pathname, item)),
      )?.id ?? null
    );
  }, [filtered, hydrated, pathname]);

  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => {
    if (query.trim()) {
      setOpenIds(filtered.map((section) => section.id));
      return;
    }
    if (activeSectionId) {
      setOpenIds((prev) =>
        prev.includes(activeSectionId) ? prev : [...prev, activeSectionId],
      );
      return;
    }
    if (filtered[0] && openIds.length === 0) {
      setOpenIds([filtered[0].id]);
    }
  }, [activeSectionId, filtered, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search settings"
        className="max-w-none"
      />
      <ScrollArea className="min-h-0 flex-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">
            No matching settings.
          </p>
        ) : (
          <Accordion
            multiple
            value={openIds}
            onValueChange={(next) => {
              if (Array.isArray(next)) setOpenIds(next);
            }}
            className="pr-2"
          >
            {filtered.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border-0"
              >
                <AccordionTrigger className="px-2 py-2.5 text-sm font-semibold text-foreground hover:no-underline">
                  {section.label}
                </AccordionTrigger>
                <AccordionContent className="pb-2 [&_a]:no-underline">
                  <ul className="flex flex-col gap-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <SettingsNavLink item={item} onNavigate={onNavigate} />
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>
    </div>
  );
}

function SettingsNavLink({
  item,
  onNavigate,
}: {
  item: ShellNavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active =
    hydrated &&
    !isSettingsIndexPath(pathname) &&
    isNavItemActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-[var(--control-height)] min-w-0 items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-l-2 border-primary bg-primary-tint font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <span className="min-w-0 break-words leading-snug">{item.title}</span>
    </Link>
  );
}
