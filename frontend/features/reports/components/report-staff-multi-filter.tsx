"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxFieldInput,
  ComboboxItemIndicator,
  ComboboxPopup,
  COMBOBOX_EMPTY_CLASS,
  COMBOBOX_ITEM_CLASS,
} from "@/components/ui/combobox";
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
        return { value: member.userId, label: name,
};
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
  const selected = Array.isArray(values[field.key])
    ? (values[field.key] as string[])
    : [];

  const selectedItems = useMemo(
    () => options.filter((option) => selected.includes(option.value)),
    [options, selected],
  );

  function toggleAllClear() {
    onChange(field.key, []);
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
      <Combobox.Root
        multiple
        items={options}
        value={selectedItems}
        onValueChange={(next) =>
          onChange(
            field.key,
            next.map((option) => option.value),
          )
        }
        disabled={disabled}
        modal={false}
        autoHighlight
        autoComplete="off"
        itemToStringLabel={(item) => item.label}
        isItemEqualToValue={(left, right) => left.value === right.value}
      >
        <ComboboxFieldInput
          disabled={disabled}
          placeholder={triggerText}
          className={cn(CONTROL_HEIGHT_CLASS, "w-full")}
        />
        <ComboboxPopup align="start" className="min-w-[16rem]">
          <Combobox.Empty className={COMBOBOX_EMPTY_CLASS}>
            No matching staff
          </Combobox.Empty>
          <Combobox.List>
            {(option: ReportFilterOption) => (
              <Combobox.Item
                key={option.value}
                value={option}
                className={COMBOBOX_ITEM_CLASS}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <ComboboxItemIndicator />
              </Combobox.Item>
            )}
          </Combobox.List>
          {selected.length > 0 ? (
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={toggleAllClear}
            >
              Clear selection (all staff)
            </button>
          ) : null}
        </ComboboxPopup>
      </Combobox.Root>
    </div>
  );
}
