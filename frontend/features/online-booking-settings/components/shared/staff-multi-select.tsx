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

const STAFF_MEMBERS_LIMIT = 100;

type StaffOption = { value: string; label: string };

function staffTriggerLabel(selected: string[], options: StaffOption[]): string {
  if (selected.length === 0) return "Select staff members";
  if (selected.length === 1) {
    return (
      options.find((option) => option.value === selected[0])?.label ??
      "1 staff selected"
    );
  }
  return `${selected.length} staff selected`;
}

type OnlineBookingStaffMultiSelectProps = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  label?: string;
};

export function OnlineBookingStaffMultiSelect({
  value,
  onChange,
  disabled = false,
  label = "Excluded staff members",
}: OnlineBookingStaffMultiSelectProps) {
  const query = useQuery({
    queryKey: queryKeys.business.members({
      page: 1,
      limit: STAFF_MEMBERS_LIMIT,
    }),
    queryFn: () =>
      listBusinessMembers({ page: 1, limit: STAFF_MEMBERS_LIMIT }),
  });

  const options = useMemo<StaffOption[]>(() => {
    return (query.data?.items ?? [])
      .filter(
        (member) =>
          member.isServiceProvider && member.status === "ACTIVE",
      )
      .map((member) => {
        const name =
          [member.user.firstName, member.user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || member.user.email;
        return { value: member.userId, label: name };
      });
  }, [query.data]);

  const selectedItems = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  const isLoading = query.isLoading;
  const isError = query.isError;
  const controlDisabled =
    disabled || isLoading || isError || options.length === 0;

  const triggerText = isLoading
    ? "Loading staff…"
    : isError
      ? "Couldn't load staff"
      : options.length === 0
        ? "No service providers found"
        : staffTriggerLabel(value, options);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Combobox.Root
        multiple
        items={options}
        value={selectedItems}
        onValueChange={(next) => onChange(next.map((option) => option.value))}
        disabled={controlDisabled}
        modal={false}
        autoHighlight
        autoComplete="off"
        itemToStringLabel={(item) => item.label}
        isItemEqualToValue={(left, right) => left.value === right.value}
      >
        <ComboboxFieldInput
          disabled={controlDisabled}
          placeholder={triggerText}
          className={cn(CONTROL_HEIGHT_CLASS, "w-full")}
        />
        <ComboboxPopup align="start" className="min-w-[16rem]">
          <Combobox.Empty className={COMBOBOX_EMPTY_CLASS}>
            No matching staff
          </Combobox.Empty>
          <Combobox.List>
            {(option: StaffOption) => (
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
          {value.length > 0 ? (
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => onChange([])}
            >
              Clear selection
            </button>
          ) : null}
        </ComboboxPopup>
      </Combobox.Root>
    </div>
  );
}

export function useOnlineBookingStaffOptions() {
  const query = useQuery({
    queryKey: queryKeys.business.members({
      page: 1,
      limit: STAFF_MEMBERS_LIMIT,
    }),
    queryFn: () =>
      listBusinessMembers({ page: 1, limit: STAFF_MEMBERS_LIMIT }),
  });

  const options = useMemo(() => {
    return (query.data?.items ?? [])
      .filter(
        (member) =>
          member.isServiceProvider && member.status === "ACTIVE",
      )
      .map((member) => {
        const name =
          [member.user.firstName, member.user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || member.user.email;
        return { id: member.userId, label: name };
      });
  }, [query.data?.items]);

  const labelsById = useMemo(
    () => new Map(options.map((option) => [option.id, option.label])),
    [options],
  );

  return { options, labelsById, isLoading: query.isLoading };
}
