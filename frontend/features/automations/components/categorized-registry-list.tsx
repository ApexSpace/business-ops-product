"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AutomationCategory } from "@/features/automations/types/metadata";
import {
  filterRegistryItems,
  groupRegistryItemsByCategory,
} from "@/features/automations/utils/metadata-grouping.util";
import { ImplementationStatusBadge } from "@/features/automations/components/implementation-status-badge";
import type { ImplementationStatus } from "@/features/automations/types/metadata";

export type CategorizedRegistryItem = {
  key: string;
  category: string;
  label: string;
  description: string;
  implementationStatus?: ImplementationStatus;
  activatable?: boolean;
};

type CategorizedRegistryListProps = {
  items: CategorizedRegistryItem[];
  categories: AutomationCategory[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  emptyLabel?: string;
  searchPlaceholder?: string;
  className?: string;
  /** Max height class for the scrollable list area (search stays fixed above). */
  listClassName?: string;
};

export const registryPickerPopoverClassName =
  "flex w-[min(28rem,calc(100vw-2rem))] max-h-[min(24rem,var(--available-height))] flex-col overflow-hidden p-3";

export function CategorizedRegistryList({
  items,
  categories,
  search,
  onSearchChange,
  selectedKey,
  onSelect,
  emptyLabel = "No items match your search.",
  searchPlaceholder = "Search…",
  className,
  listClassName,
}: CategorizedRegistryListProps) {
  const filtered = useMemo(
    () => filterRegistryItems(items, search),
    [items, search],
  );
  const groups = useMemo(
    () => groupRegistryItemsByCategory(filtered, categories),
    [filtered, categories],
  );
  const accordionKey = groups.map((group) => group.category.key).join("|");

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>

      {groups.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain rounded-md border",
            listClassName ?? "max-h-72",
          )}
        >
          <Accordion
            key={accordionKey}
            multiple
            defaultValue={groups.map((group) => group.category.key)}
            className="px-2"
          >
          {groups.map((group) => (
            <AccordionItem key={group.category.key} value={group.category.key}>
              <AccordionTrigger className="px-1">
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-2">
                  <span className="truncate font-medium">
                    {group.category.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {group.items.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-1">
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const selected = selectedKey === item.key;
                    const disabled = item.activatable === false;
                    const content = (
                      <>
                        <span className="flex min-w-0 items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block font-medium leading-snug">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                              {item.key}
                            </span>
                          </span>
                          {item.implementationStatus ? (
                            <ImplementationStatusBadge
                              status={item.implementationStatus}
                            />
                          ) : null}
                        </span>
                      </>
                    );

                    if (!onSelect) {
                      return (
                        <li
                          key={item.key}
                          className="rounded-md border border-transparent px-2 py-2"
                        >
                          {content}
                        </li>
                      );
                    }

                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (!disabled) onSelect(item.key);
                          }}
                          className={cn(
                            "w-full rounded-md border px-2 py-2 text-left transition-colors",
                            disabled
                              ? "cursor-not-allowed opacity-60"
                              : "hover:bg-accent",
                            selected
                              ? "border-primary bg-accent/70"
                              : "border-transparent",
                          )}
                        >
                          {content}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        </div>
      )}
    </div>
  );
}
