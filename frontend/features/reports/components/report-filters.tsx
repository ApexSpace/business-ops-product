"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { listOffers } from "@/features/offers/api/offers.api";
import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import type {
  ReportFilterField,
  ReportFilterOption,
  ReportFilterValues,
} from "@/features/reports/types";
import {
  buildReportDateRangeOptions,
  isCustomDateRange,
} from "@/features/reports/utils/report-date-range-options";

type ReportFiltersProps = {
  fields: ReportFilterField[];
  values: ReportFilterValues;
  onChange: (key: string, value: ReportFilterValues[string]) => void;
};

function isFieldVisible(
  field: ReportFilterField,
  values: ReportFilterValues,
): boolean {
  if (!field.visibleWhen) return true;
  return values[field.visibleWhen.key] === field.visibleWhen.equals;
}

const STAFF_MEMBERS_LIMIT = 100;

function useStaffOptions(enabled: boolean) {
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

function useEntityOptions(field: ReportFilterField, enabled: boolean) {
  const isOffer = field.key === "offerId";
  const query = useQuery({
    queryKey: queryKeys.offers.list(),
    queryFn: () => listOffers(),
    enabled: enabled && isOffer,
  });

  return useMemo<ReportFilterOption[]>(() => {
    if (field.options?.length) return field.options;
    if (isOffer) {
      return (query.data ?? []).map((offer) => ({
        value: offer.id,
        label: offer.name,
      }));
    }
    return [];
  }, [field.options, isOffer, query.data]);
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
  return `${selected.length} staff selected`;
}

function StaffMultiField({
  field,
  values,
  onChange,
}: {
  field: ReportFilterField;
  values: ReportFilterValues;
  onChange: ReportFiltersProps["onChange"];
}) {
  const { options, isLoading, isError } = useStaffOptions(true);
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
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
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

function EntitySelectField({
  field,
  values,
  onChange,
}: {
  field: ReportFilterField;
  values: ReportFilterValues;
  onChange: ReportFiltersProps["onChange"];
}) {
  const options = useEntityOptions(field, true);
  const value =
    typeof values[field.key] === "string"
      ? (values[field.key] as string)
      : null;

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next != null) onChange(field.key, next);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OptionSelectField({
  field,
  values,
  onChange,
}: {
  field: ReportFilterField;
  values: ReportFilterValues;
  onChange: ReportFiltersProps["onChange"];
}) {
  const options = field.options ?? [];
  const value =
    typeof values[field.key] === "string"
      ? (values[field.key] as string)
      : null;

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next != null) onChange(field.key, next);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateRangeField({
  field,
  values,
  onChange,
}: {
  field: ReportFilterField;
  values: ReportFilterValues;
  onChange: ReportFiltersProps["onChange"];
}) {
  const options = useMemo(() => buildReportDateRangeOptions(), []);
  const preset =
    typeof values[field.key] === "string"
      ? (values[field.key] as string)
      : "today";
  const fromDate =
    typeof values.fromDate === "string" ? (values.fromDate as string) : "";
  const toDate =
    typeof values.toDate === "string" ? (values.toDate as string) : "";
  const customRangeInvalid =
    isCustomDateRange(preset) &&
    Boolean(fromDate) &&
    Boolean(toDate) &&
    fromDate > toDate;

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      {customRangeInvalid ? (
        <p className="text-xs text-destructive">
          Start date needs to be before end date.
        </p>
      ) : null}
      <Select
        value={preset}
        onValueChange={(next) => onChange(field.key, next)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCustomDateRange(preset) ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => onChange("fromDate", event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => onChange("toDate", event.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BooleanField({
  field,
  values,
  onChange,
}: {
  field: ReportFilterField;
  values: ReportFilterValues;
  onChange: ReportFiltersProps["onChange"];
}) {
  const checked = values[field.key] === true;
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm">{field.label}</span>
      <Switch
        checked={checked}
        onCheckedChange={(next) => onChange(field.key, next)}
      />
    </label>
  );
}

export function ReportFilters({ fields, values, onChange }: ReportFiltersProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (!isFieldVisible(field, values)) return null;

        switch (field.type) {
          case "date_range":
            return (
              <DateRangeField
                key={field.key}
                field={field}
                values={values}
                onChange={onChange}
              />
            );
          case "staff_multi":
            return (
              <StaffMultiField
                key={field.key}
                field={field}
                values={values}
                onChange={onChange}
              />
            );
          case "boolean":
          case "staff_toggle":
            return (
              <BooleanField
                key={field.key}
                field={field}
                values={values}
                onChange={onChange}
              />
            );
          case "entity_select":
            return (
              <EntitySelectField
                key={field.key}
                field={field}
                values={values}
                onChange={onChange}
              />
            );
          case "group_by":
          case "sort_by":
          case "select":
            return (
              <OptionSelectField
                key={field.key}
                field={field}
                values={values}
                onChange={onChange}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
