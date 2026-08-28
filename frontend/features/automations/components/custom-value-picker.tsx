"use client";

import { useMemo, useState } from "react";
import { Braces, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAutomationCustomValues } from "@/features/automations/hooks/use-automation-metadata";
import type { CustomValueMetadata } from "@/features/automations/types/metadata";
import { formatMergeTag } from "@/features/automations/utils/insert-merge-tag.util";

type CustomValuePickerProps = {
  onInsert: (mergeTag: string, item: CustomValueMetadata) => void;
  categories?: string[];
  className?: string;
  disabled?: boolean;
  buttonLabel?: string;
};

export function CustomValuePicker({
  onInsert,
  categories,
  className,
  disabled,
  buttonLabel = "Insert custom value",
}: CustomValuePickerProps) {
  const [search, setSearch] = useState("");
  const customValuesQuery = useAutomationCustomValues(
    categories?.length ? { categories: categories.join(",") } : undefined,
  );

  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const groups = customValuesQuery.data ?? [];
    if (!needle) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(needle) ||
            item.key.toLowerCase().includes(needle) ||
            item.mergeTag.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [customValuesQuery.data, search]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || customValuesQuery.isLoading}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn("size-8 text-muted-foreground", className)}
            aria-label={buttonLabel}
            title={buttonLabel}
          >
            <Braces className="size-[18px]" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="flex max-h-[min(20rem,var(--available-height))] w-80 flex-col gap-2 overflow-hidden p-2"
      >
        <div className="relative shrink-0 px-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Custom Values"
            className="h-8 pl-8"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filteredGroups.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No custom values found.
            </p>
          ) : (
            filteredGroups.map((group) => (
              <DropdownMenuGroup key={group.category} className="px-1">
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    className="flex flex-col items-start gap-0.5 py-2"
                    onClick={() => onInsert(formatMergeTag(item.mergeTag), item)}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.mergeTag}
                    </span>
                    {item.example ? (
                      <span className="text-xs text-muted-foreground">
                        e.g. {item.example}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
