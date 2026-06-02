"use client";

import { SearchableSelect } from "@/components/forms/searchable-select";
import { SearchInput } from "@/components/forms/search-input";
import { APPOINTMENT_STATUS_OPTIONS } from "@/lib/appointment-profile";
import type { Calendar } from "@/lib/calendar-profile";
import type { BusinessMember } from "@/types/api";
import {
  FILTER_SEARCH_CLASS,
  FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/control-styles";
import { cn } from "@/lib/utils";

interface CalendarFiltersProps {
  showSearch?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  calendarId: string;
  onCalendarIdChange: (value: string) => void;
  assignedToId: string;
  onAssignedToIdChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  calendars?: Calendar[];
  members?: BusinessMember[];
  className?: string;
}

export function CalendarFilters({
  showSearch = false,
  search = "",
  onSearchChange,
  calendarId,
  onCalendarIdChange,
  assignedToId,
  onAssignedToIdChange,
  status,
  onStatusChange,
  calendars = [],
  members = [],
  className,
}: CalendarFiltersProps) {
  const calendarItems = [
    { value: "", label: "All calendars" },
    ...calendars.map((c) => ({ value: c.id, label: c.name })),
  ];

  const staffItems = [
    { value: "", label: "All staff" },
    ...members.map((m) => ({
      value: m.userId,
      label:
        [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
        m.user.email,
    })),
  ];

  const statusItems = [
    { value: "", label: "All statuses" },
    ...APPOINTMENT_STATUS_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
    })),
  ];

  const triggerClassName = cn(
    FILTER_SELECT_TRIGGER_CLASS,
    "w-[min(9.5rem,28vw)] min-w-[7rem]",
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-nowrap items-center gap-2",
        className,
      )}
    >
      {showSearch && onSearchChange ? (
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search…"
          className={cn(FILTER_SEARCH_CLASS, "min-w-[7rem] max-w-[12rem]")}
        />
      ) : null}
      <SearchableSelect
        value={calendarId}
        onValueChange={(v) => onCalendarIdChange(v ?? "")}
        items={calendarItems}
        placeholder="Calendar"
        triggerClassName={triggerClassName}
      />
      <SearchableSelect
        value={assignedToId}
        onValueChange={(v) => onAssignedToIdChange(v ?? "")}
        items={staffItems}
        placeholder="Staff"
        triggerClassName={triggerClassName}
      />
      <SearchableSelect
        value={status}
        onValueChange={(v) => onStatusChange(v ?? "")}
        items={statusItems}
        placeholder="Status"
        triggerClassName={triggerClassName}
      />
    </div>
  );
}
