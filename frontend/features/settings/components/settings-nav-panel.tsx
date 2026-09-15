"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/forms/search-input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { isSettingsNavItemActive } from "@/lib/config/navigation/settings-nav-active";
import {
  WORKSPACE_NAV_ICON_CLASS,
  WORKSPACE_NAV_ITEM_ACTIVE_CLASS,
  WORKSPACE_NAV_ITEM_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_NESTED_LIST_CLASS,
  WORKSPACE_NAV_PANEL_CLASS,
  WORKSPACE_NAV_SCROLL_AREA_CLASS,
  WORKSPACE_NAV_SCROLL_INNER_CLASS,
  WORKSPACE_NAV_SEARCH_WRAP_CLASS,
  WORKSPACE_NAV_SECTION_TRIGGER_CLASS,
} from "@/lib/design/workspace-nav-tokens";

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
  const searchParams = useSearchParams();
  const search = searchParams.toString();
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
    if (!hydrated) return null;
    return (
      filtered.find((section) =>
        section.items.some((item) =>
          isSettingsNavItemActive(pathname, search, item),
        ),
      )?.id ?? null
    );
  }, [filtered, hydrated, pathname, search]);

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
    <div className={WORKSPACE_NAV_PANEL_CLASS}>
      <div className={WORKSPACE_NAV_SEARCH_WRAP_CLASS}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search"
          className="max-w-none"
        />
      </div>
      <ScrollArea className={WORKSPACE_NAV_SCROLL_AREA_CLASS}>
        <div className={WORKSPACE_NAV_SCROLL_INNER_CLASS}>
          {filtered.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No matching settings.
            </p>
          ) : (
            <Accordion
              multiple
              value={openIds}
              onValueChange={(next) => {
                if (Array.isArray(next)) setOpenIds(next);
              }}
            >
              {filtered.map((section) => (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border-0"
                >
                  <AccordionTrigger
                    chevronMode="section"
                    className={WORKSPACE_NAV_SECTION_TRIGGER_CLASS}
                  >
                    {section.label}
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 [&_a]:no-underline">
                    <ul className={WORKSPACE_NAV_NESTED_LIST_CLASS}>
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
        </div>
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
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const active =
    hydrated &&
    isSettingsNavItemActive(pathname, searchParams.toString(), item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        WORKSPACE_NAV_ITEM_CLASS,
        active
          ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
          : WORKSPACE_NAV_ITEM_IDLE_CLASS,
      )}
    >
      <Icon
        className={cn(
          WORKSPACE_NAV_ICON_CLASS,
          active
            ? "text-violet-primary-normal"
            : "text-grey-tertiary-normal",
        )}
        aria-hidden
      />
      <span className="min-w-0 truncate">{item.title}</span>
    </Link>
  );
}
