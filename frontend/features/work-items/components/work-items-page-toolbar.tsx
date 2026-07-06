"use client";

import { Plus } from "lucide-react";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import { ActionButton } from "@/components/ui/action-button";
import {
  WorkItemsViewSwitcher,
  type WorkItemsView,
} from "@/features/work-items/components/work-items-view-switcher";
import { workItemsStatusFilterItems } from "@/features/work-items/hooks/use-work-items-page-toolbar";
import {
  FILTER_SEARCH_CLASS,
  FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

interface WorkItemsPageToolbarProps {
  workItemsLabel: string;
  countSingular: string;
  search: string;
  status: string;
  serviceId: string;
  assignedToId: string;
  view: WorkItemsView;
  serviceFilterItems: { value: string; label: string }[];
  assigneeFilterItems: { value: string; label: string }[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string | null) => void;
  onServiceIdChange: (value: string | null) => void;
  onAssignedToIdChange: (value: string | null) => void;
  onViewChange: (view: WorkItemsView) => void;
  onAddClick: () => void;
}

function WorkItemFilterSelects({
  status,
  serviceId,
  assignedToId,
  serviceFilterItems,
  assigneeFilterItems,
  onStatusChange,
  onServiceIdChange,
  onAssignedToIdChange,
  className,
}: Pick<
  WorkItemsPageToolbarProps,
  | "status"
  | "serviceId"
  | "assignedToId"
  | "serviceFilterItems"
  | "assigneeFilterItems"
  | "onStatusChange"
  | "onServiceIdChange"
  | "onAssignedToIdChange"
> & { className?: string }) {
  return (
    <FilterBar className={cn("scrollbar-thin", className)}>
      <SearchableSelect
        items={workItemsStatusFilterItems}
        value={status}
        onValueChange={onStatusChange}
        placeholder="Status"
        triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[8.5rem] shrink-0")}
      />
      <SearchableSelect
        items={serviceFilterItems}
        value={serviceId}
        onValueChange={onServiceIdChange}
        placeholder="Service"
        triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[9rem] shrink-0")}
      />
      <SearchableSelect
        items={assigneeFilterItems}
        value={assignedToId}
        onValueChange={onAssignedToIdChange}
        placeholder="Staff"
        triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[9rem] shrink-0")}
      />
    </FilterBar>
  );
}

export function WorkItemsPageToolbar({
  workItemsLabel,
  countSingular,
  search,
  status,
  serviceId,
  assignedToId,
  view,
  serviceFilterItems,
  assigneeFilterItems,
  onSearchChange,
  onStatusChange,
  onServiceIdChange,
  onAssignedToIdChange,
  onViewChange,
  onAddClick,
}: WorkItemsPageToolbarProps) {
  const searchPlaceholder = `Search ${workItemsLabel.toLowerCase()}…`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
      <div className="flex flex-col gap-2 md:hidden">
        <SearchInput
          className={cn(FILTER_SEARCH_CLASS, "w-full")}
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
        <WorkItemFilterSelects
          status={status}
          serviceId={serviceId}
          assignedToId={assignedToId}
          serviceFilterItems={serviceFilterItems}
          assigneeFilterItems={assigneeFilterItems}
          onStatusChange={onStatusChange}
          onServiceIdChange={onServiceIdChange}
          onAssignedToIdChange={onAssignedToIdChange}
        />
        <div className="flex flex-col gap-2">
          <WorkItemsViewSwitcher
            value={view}
            onChange={onViewChange}
            className="w-full [&>button]:flex-1"
          />
          <ActionButton onClick={onAddClick} className="w-full">
            <Plus className="mr-2 size-4" />
            Add {countSingular}
          </ActionButton>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-2 md:flex lg:gap-3">
        <FilterBar className="scrollbar-thin min-w-0 flex-1">
          <SearchInput
            className={cn(FILTER_SEARCH_CLASS, "w-[11rem] shrink-0 lg:w-[13rem]")}
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
          <SearchableSelect
            items={workItemsStatusFilterItems}
            value={status}
            onValueChange={onStatusChange}
            placeholder="Status"
            triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[8.5rem] shrink-0")}
          />
          <SearchableSelect
            items={serviceFilterItems}
            value={serviceId}
            onValueChange={onServiceIdChange}
            placeholder="Service"
            triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[9rem] shrink-0")}
          />
          <SearchableSelect
            items={assigneeFilterItems}
            value={assignedToId}
            onValueChange={onAssignedToIdChange}
            placeholder="Staff"
            triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[9rem] shrink-0")}
          />
        </FilterBar>
        <WorkItemsViewSwitcher
          value={view}
          onChange={onViewChange}
          className="shrink-0"
        />
        <ActionButton onClick={onAddClick} className="shrink-0">
          <Plus className="mr-2 size-4" />
          Add {countSingular}
        </ActionButton>
      </div>
    </div>
  );
}
