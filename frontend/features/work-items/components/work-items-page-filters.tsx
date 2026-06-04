"use client";

import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import {
  FILTER_SEARCH_CLASS,
  FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";
import { workItemsStatusFilterItems } from "@/features/work-items/hooks/use-work-items-page-toolbar";

export function WorkItemsPageFilters({
  workItemsLabel,
  search,
  status,
  serviceId,
  assignedToId,
  serviceFilterItems,
  assigneeFilterItems,
  onSearchChange,
  onStatusChange,
  onServiceIdChange,
  onAssignedToIdChange,
}: {
  workItemsLabel: string;
  search: string;
  status: string;
  serviceId: string;
  assignedToId: string;
  serviceFilterItems: { value: string; label: string }[];
  assigneeFilterItems: { value: string; label: string }[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string | null) => void;
  onServiceIdChange: (value: string | null) => void;
  onAssignedToIdChange: (value: string | null) => void;
}) {
  return (
    <FilterBar className="shrink-0 flex-nowrap items-center gap-2 sm:gap-3">
      <SearchInput
        className={cn(FILTER_SEARCH_CLASS, "w-[13rem] sm:w-[17rem]")}
        value={search}
        onChange={onSearchChange}
        placeholder={`Search ${workItemsLabel.toLowerCase()}…`}
      />
      <SearchableSelect
        items={workItemsStatusFilterItems}
        value={status}
        onValueChange={onStatusChange}
        placeholder="Status"
        triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[9.5rem]")}
      />
      <SearchableSelect
        items={serviceFilterItems}
        value={serviceId}
        onValueChange={onServiceIdChange}
        placeholder="Service"
        triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[11rem]")}
      />
      <SearchableSelect
        items={assigneeFilterItems}
        value={assignedToId}
        onValueChange={onAssignedToIdChange}
        placeholder="Staff"
        triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[11rem]")}
      />
    </FilterBar>
  );
}
