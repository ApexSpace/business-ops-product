"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import type {
  ReportFilterField,
  ReportFilterOption,
  ReportFilterValues,
} from "@/features/reports/types";

const STAFF_MEMBERS_LIMIT = 100;

export function useReportStaffOptions(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.business.members({
      page: 1,
      limit: STAFF_MEMBERS_LIMIT,
    }),
    queryFn: () =>
      listBusinessMembers({ page: 1, limit: STAFF_MEMBERS_LIMIT }),
    enabled,
  });

  const options = useMemo<ReportFilterOption[]>(
    () =>
      (query.data?.items ?? []).map((member) => {
        const name =
          [member.user.firstName, member.user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || "Unnamed";
        return { value: member.userId, label: name };
      }),
    [query.data],
  );

  return {
    options,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

function staffTriggerLabel(
  selected: string[],
  options: ReportFilterOption[],
): string {
  if (selected.length === 0) return "All staff";
  if (selected.length === 1) {
    return (
      options.find((option) => option.value === selected[0])?.label ??
      "1 staff selected"
    );
  }
  if (selected.length === 2) {
    const first =
      options.find((option) => option.value === selected[0])?.label ?? "Staff";
    const second =
      options.find((option) => option.value === selected[1])?.label ?? "Staff";
    return `${first}, ${second}`;
  }
  const first =
    options.find((option) => option.value === selected[0])?.label ?? "Staff";
  const second =
    options.find((option) => option.value === selected[1])?.label ?? "Staff";
  return `${first}, ${second}, and ${selected.length - 2} others`;
}

type ReportStaffMultiFilterProps = {
  field: ReportFilterField;
  values: ReportFilterValues;
  onChange: (key: string, value: ReportFilterValues[string]) => void;
};

/**
 * Shared multi-select staff filter used by report definitions with
 * `type: "staff_multi"` (BI Sales, BI Appointments, Sales Summary, etc.).
 */
export function ReportStaffMultiFilter({
  field,
  values,
  onChange,
}: ReportStaffMultiFilterProps) {
  const { options, isLoading, isError } = useReportStaffOptions(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = Array.isArray(values[field.key])
    ? (values[field.key] as string[])
    : [];

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [options, search]);

  function toggle(value: string, checked: boolean) {
    const next = checked
      ? [...selected, value]
      : selected.filter((id) => id !== value);
    onChange(field.key, next);
  }

  const disabled = isLoading || isError || options.length === 0;
  const triggerText = isLoading
    ? "Loading staff…"
    : isError
      ? "Couldn’t load staff"
      : options.length === 0
        ? "No staff members found"
        : staffTriggerLabel(selected, options);

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger
          type="button"
          disabled={disabled}
          className={cn(
            "glass-control flex w-full min-w-0 items-center justify-between gap-1.5 rounded-[var(--radius-control)] border border-input px-3 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-150 select-none",
            CONTROL_HEIGHT_CLASS,
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary-tint",
            "disabled:cursor-not-allowed disabled:opacity-50",
            selected.length === 0 && !isLoading && !isError
              ? "text-muted-foreground"
              : "text-foreground",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{triggerText}</span>
          <NavArrowIcon direction="down" size="lg" className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--anchor-width) min-w-[16rem] gap-2 p-2"
        >
          {options.length > 6 ? (
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff…"
              className="h-8"
            />
          ) : null}
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No matching staff
              </p>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) =>
                      toggle(option.value, checked === true)
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 ? (
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => onChange(field.key, [])}
            >
              Clear selection (all staff)
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
