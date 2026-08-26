"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchInput } from "@/components/forms/search-input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_NAV_ITEM_ACTIVE_CLASS,
  WORKSPACE_NAV_ITEM_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_PANEL_CLASS,
  WORKSPACE_NAV_SECTION_TRIGGER_CLASS,
} from "@/lib/design/workspace-nav-tokens";
import type { ReportCategoryGroup } from "@/features/reports/types";

type ReportCatalogSidebarProps = {
  groups: ReportCategoryGroup[];
  selectedKey: string | null;
  onSelect: (reportKey: string) => void;
  isLoading: boolean;
};

function reportMatchesQuery(
  title: string,
  description: string,
  key: string,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    title.toLowerCase().includes(q) ||
    description.toLowerCase().includes(q) ||
    key.toLowerCase().includes(q)
  );
}

export function ReportCatalogSidebar({
  groups,
  selectedKey,
  onSelect,
  isLoading,
}: ReportCatalogSidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        reports: group.reports.filter((report) =>
          reportMatchesQuery(
            report.title,
            report.description,
            report.key,
            q,
          ),
        ),
      }))
      .filter((group) => group.reports.length > 0);
  }, [groups, query]);

  const activeSectionId = useMemo(() => {
    if (!selectedKey) return null;
    return (
      filtered.find((group) =>
        group.reports.some((report) => report.key === selectedKey),
      )?.category ?? null
    );
  }, [filtered, selectedKey]);

  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => {
    if (query.trim()) {
      setOpenIds(filtered.map((group) => group.category));
      return;
    }
    if (activeSectionId) {
      setOpenIds((prev) =>
        prev.includes(activeSectionId) ? prev : [...prev, activeSectionId],
      );
      return;
    }
    if (filtered[0] && openIds.length === 0) {
      setOpenIds([filtered[0].category]);
    }
  }, [activeSectionId, filtered, query]);

  return (
    <div className={WORKSPACE_NAV_PANEL_CLASS}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search reports"
        className="max-w-none"
      />
      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">
            {query.trim() ? "No matching reports." : "No reports available."}
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
            {filtered.map((group) => (
              <AccordionItem
                key={group.category}
                value={group.category}
                className="border-0"
              >
                <AccordionTrigger className={WORKSPACE_NAV_SECTION_TRIGGER_CLASS}>
                  {group.categoryLabel}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <ul className="flex flex-col gap-1">
                    {group.reports.map((report) => {
                      const active = report.key === selectedKey;
                      return (
                        <li key={report.key}>
                          <button
                            type="button"
                            onClick={() => onSelect(report.key)}
                            className={cn(
                              "w-full text-left",
                              WORKSPACE_NAV_ITEM_CLASS,
                              active
                                ? WORKSPACE_NAV_ITEM_ACTIVE_CLASS
                                : WORKSPACE_NAV_ITEM_IDLE_CLASS,
                            )}
                          >
                            <span className="min-w-0 break-words leading-snug">
                              {report.title}
                            </span>
                          </button>
                        </li>
                      );
                    })}
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
