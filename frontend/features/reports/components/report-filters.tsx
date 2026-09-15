"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { listOffers } from "@/features/offers/api/offers.api";
import { ReportStaffMultiFilter } from "@/features/reports/components/report-staff-multi-filter";
import { queryKeys } from "@/lib/query/keys";
import type {
  ReportFilterField,
  ReportFilterOption,
  ReportFilterValues,
} from "@/features/reports/types";
import {
  buildReportDateRangeOptions,
  describeReportDateRangeBounds,
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

function useEntityOptions(field: ReportFilterField, enabled: boolean) {
  const isOffer = field.key === "offerId";
  const query = useQuery({
    queryKey: queryKeys.offers.list(),
    queryFn: () => listOffers({ limit: 100 }),
    enabled: enabled && isOffer && !field.options?.length,
  });

  return useMemo<ReportFilterOption[]>(() => {
    if (field.options?.length) return field.options;
    if (isOffer) {
      return (query.data?.items ?? []).map((offer) => ({
        value: offer.id,
        label: offer.name,
      }));
    }
    return [];
  }, [field.options, isOffer, query.data]);
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

  useEffect(() => {
    if (field.key !== "offerId" || value != null || options.length === 0) {
      return;
    }
    onChange(field.key, options[0]!.value);
  }, [field.key, onChange, options, value]);

  if (field.key === "offerId") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <SearchableSelect
          items={options}
          value={value}
          onValueChange={(next) => {
            if (next != null) onChange(field.key, next);
          }}
          placeholder="Select offer…"
          searchPlaceholder="Search offers…"
          emptyMessage="No offers found"
          searchable={options.length > 6}
        />
      </div>
    );
  }

  const itemsKey = options
    .map((option) => `${option.value}:${option.label}`)
    .join("|");

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <Select
        key={itemsKey}
        items={options}
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
            <SelectItem
              key={option.value}
              value={option.value}
              label={option.label}
            >
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
  const mode = field.dateRangeMode === "months" ? "months" : "full";
  const options = useMemo(() => buildReportDateRangeOptions(new Date(), mode), [mode]);
  const preset =
    typeof values[field.key] === "string"
      ? (values[field.key] as string)
      : options[0]?.value ?? "today";
  const fromDate =
    typeof values.fromDate === "string" ? (values.fromDate as string) : "";
  const toDate =
    typeof values.toDate === "string" ? (values.toDate as string) : "";
  const customRangeInvalid =
    isCustomDateRange(preset) &&
    Boolean(fromDate) &&
    Boolean(toDate) &&
    fromDate > toDate;

  const initialClientBounds = useMemo(
    () =>
      mode === "months"
        ? describeReportDateRangeBounds(preset, fromDate, toDate)
        : null,
    [mode, preset, fromDate, toDate],
  );

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
      {initialClientBounds ? (
        <p className="text-xs text-muted-foreground">
          Initial clients are clients who had their first appointment in the
          selected period ({initialClientBounds.label}).
        </p>
      ) : mode === "months" && isCustomDateRange(preset) ? (
        <p className="text-xs text-muted-foreground">
          Initial clients are clients who had their first appointment in the
          selected custom period.
        </p>
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

function SingleDateField({
  field,
  values,
  onChange,
}: {
  field: ReportFilterField;
  values: ReportFilterValues;
  onChange: ReportFiltersProps["onChange"];
}) {
  const value =
    typeof values[field.key] === "string"
      ? (values[field.key] as string)
      : new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </div>
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
          case "single_date":
            return (
              <SingleDateField
                key={field.key}
                field={field}
                values={values}
                onChange={onChange}
              />
            );
          case "staff_multi":
            return (
              <ReportStaffMultiFilter
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
