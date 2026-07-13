"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Tag, Trash2 } from "lucide-react";
import { listServices } from "@/features/settings/api/services.api";
import type { Service } from "@/lib/types/api";
import { queryKeys } from "@/lib/query/keys";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DRAWER_FIELD_CONTROL_CLASS } from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";
import {
  type AppointmentServiceLineSelection,
  type StaffOption,
  formatDurationLabel,
  formatTimeSlotLabel,
  generateAppointmentTimeSlots,
  generateDurationOptions,
  getChainedStartMinutes,
  rechainServiceLinesAfterChange,
  serviceToLineSelection,
} from "@/features/appointments/utils/appointment-service-lines";

export type { AppointmentServiceLineSelection, StaffOption };

export interface AppointmentServiceLineEditorProps {
  value: AppointmentServiceLineSelection[];
  onChange: (lines: AppointmentServiceLineSelection[]) => void;
  staffOptions: StaffOption[];
  defaultAssignedToId: string;
  appointmentStartMinutes: number;
  /** Editing the first service's "at" time updates the appointment start (Time field). */
  onAppointmentStartMinutesChange?: (minutes: number) => void;
  slotIntervalMinutes?: number;
  currencyCode?: string;
  disabled?: boolean;
  className?: string;
}

const INLINE_SELECT_TRIGGER_CLASS =
  "h-auto w-auto min-w-0 border-0 bg-transparent px-1 py-0.5 text-[13.5px] font-semibold text-primary shadow-none hover:bg-primary/5 focus-visible:ring-0";

function ServiceLineCard({
  line,
  staffOptions,
  timeSlots,
  durationOptions,
  currencyCode,
  disabled,
  onUpdate,
  onRemove,
}: {
  line: AppointmentServiceLineSelection;
  staffOptions: StaffOption[];
  timeSlots: number[];
  durationOptions: number[];
  currencyCode: string;
  disabled?: boolean;
  onUpdate: (patch: Partial<AppointmentServiceLineSelection>) => void;
  onRemove: () => void;
}) {
  const staffLabel =
    staffOptions.find((s) => s.userId === line.assignedToId)?.label ??
    "Select provider";

  return (
    <div className="rounded-[10px] border-[1.5px] border-border/80 bg-muted/10 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground">{line.name}</p>
          {line.price ? (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {formatMoney(line.price, currencyCode)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive disabled:opacity-50"
          aria-label={`Remove ${line.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span>with</span>
          <Select
            value={line.assignedToId}
            onValueChange={(userId) => {
              if (!userId) return;
              onUpdate({ assignedToId: userId });
            }}
            disabled={disabled}
          >
            <SelectTrigger className={INLINE_SELECT_TRIGGER_CLASS}>
              {staffLabel}
            </SelectTrigger>
            <SelectContent>
              {staffOptions.map((staff) => (
                <SelectItem key={staff.userId} value={staff.userId}>
                  {staff.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>

        <span className="inline-flex items-center gap-1">
          <span>at</span>
          <Select
            value={String(line.startMinutes)}
            onValueChange={(value) =>
              onUpdate({ startMinutes: Number(value) })
            }
            disabled={disabled}
          >
            <SelectTrigger className={INLINE_SELECT_TRIGGER_CLASS}>
              {formatTimeSlotLabel(line.startMinutes)}
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {timeSlots.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatTimeSlotLabel(minutes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>

        <span className="inline-flex items-center gap-1">
          <span>for</span>
          <Select
            value={String(line.occupancyMinutes)}
            onValueChange={(value) =>
              onUpdate({ occupancyMinutes: Number(value) })
            }
            disabled={disabled}
          >
            <SelectTrigger className={INLINE_SELECT_TRIGGER_CLASS}>
              {formatDurationLabel(line.occupancyMinutes)}
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {durationOptions.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatDurationLabel(minutes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </div>
    </div>
  );
}

export function AppointmentServiceLineEditor({
  value,
  onChange,
  staffOptions,
  defaultAssignedToId,
  appointmentStartMinutes,
  onAppointmentStartMinutesChange,
  slotIntervalMinutes = 15,
  currencyCode = "USD",
  disabled = false,
  className,
}: AppointmentServiceLineEditorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: servicesPage, isFetching } = useQuery({
    queryKey: queryKeys.services.list({ page: 1, limit: 100, status: "ACTIVE" }),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const selectedIds = useMemo(
    () => new Set(value.map((line) => line.serviceId)),
    [value],
  );

  const availableServices = useMemo(() => {
    const items = servicesPage?.items ?? [];
    const term = search.trim().toLowerCase();
    return items.filter((service) => {
      if (selectedIds.has(service.id)) return false;
      if (!term) return true;
      return service.name.toLowerCase().includes(term);
    });
  }, [servicesPage?.items, search, selectedIds]);

  const timeSlots = useMemo(
    () => generateAppointmentTimeSlots(slotIntervalMinutes),
    [slotIntervalMinutes],
  );
  const durationOptions = useMemo(() => generateDurationOptions(), []);

  const updateLine = (
    index: number,
    patch: Partial<AppointmentServiceLineSelection>,
  ) => {
    // Changing the first service's start time IS the appointment start — delegate
    // so the Time field and every chained line stay in sync.
    if (
      index === 0 &&
      patch.startMinutes !== undefined &&
      onAppointmentStartMinutesChange
    ) {
      onAppointmentStartMinutesChange(Number(patch.startMinutes));
      return;
    }

    const normalizedPatch = { ...patch };
    if (normalizedPatch.occupancyMinutes !== undefined) {
      normalizedPatch.clientOccupancyMinutes = normalizedPatch.occupancyMinutes;
      normalizedPatch.staffBlockedMinutes = normalizedPatch.occupancyMinutes;
    }

    const next = value.map((line, i) =>
      i === index ? { ...line, ...normalizedPatch } : line,
    );

    if (
      normalizedPatch.startMinutes !== undefined ||
      normalizedPatch.occupancyMinutes !== undefined
    ) {
      onChange(
        rechainServiceLinesAfterChange(next, appointmentStartMinutes, index),
      );
      return;
    }

    onChange(next);
  };

  const removeLine = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleAdd = (service: Service) => {
    const startMinutes = getChainedStartMinutes(
      value,
      value.length,
      appointmentStartMinutes,
    );
    const assignedToId =
      value[value.length - 1]?.assignedToId || defaultAssignedToId;
    onChange([
      ...value,
      serviceToLineSelection(service, { assignedToId, startMinutes }),
    ]);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {value.length > 0 ? (
        <div className="space-y-3">
          {value.map((line, index) => (
            <ServiceLineCard
              key={`${line.serviceId}-${index}`}
              line={line}
              staffOptions={staffOptions}
              timeSlots={timeSlots}
              durationOptions={durationOptions}
              currencyCode={currencyCode}
              disabled={disabled}
              onUpdate={(patch) => updateLine(index, patch)}
              onRemove={() => removeLine(index)}
            />
          ))}
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled}
            className={cn(
              DRAWER_FIELD_CONTROL_CLASS,
              "flex w-full items-center justify-between gap-2 border-input bg-transparent px-3 text-[13.5px] font-normal text-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span className="flex items-center gap-2">
              <Tag className="size-4 opacity-60" />
              Select service
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </PopoverTrigger>
          <ServicePickerPopoverContent
            search={search}
            onSearchChange={setSearch}
            isFetching={isFetching}
            availableServices={availableServices}
            selectedIds={selectedIds}
            currencyCode={currencyCode}
            onAdd={handleAdd}
          />
        </Popover>
      )}

      {value.length > 0 ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline disabled:opacity-50"
          >
            <Plus className="size-4" />
            Add another service
          </PopoverTrigger>
          <ServicePickerPopoverContent
            search={search}
            onSearchChange={setSearch}
            isFetching={isFetching}
            availableServices={availableServices}
            selectedIds={selectedIds}
            currencyCode={currencyCode}
            onAdd={handleAdd}
          />
        </Popover>
      ) : null}
    </div>
  );
}

function ServicePickerPopoverContent({
  search,
  onSearchChange,
  isFetching,
  availableServices,
  selectedIds,
  currencyCode,
  onAdd,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  isFetching: boolean;
  availableServices: Service[];
  selectedIds: Set<string>;
  currencyCode: string;
  onAdd: (service: Service) => void;
}) {
  return (
    <PopoverContent align="start" className="w-[var(--anchor-width)] p-0">
      <div className="border-b p-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search services…"
          autoFocus
          className="h-9"
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1" role="listbox">
        {isFetching ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Loading services…
          </p>
        ) : availableServices.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No services available
          </p>
        ) : (
          availableServices.map((service) => (
            <button
              key={service.id}
              type="button"
              role="option"
              className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAdd(service)}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{service.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {service.clientOccupancyMinutes ?? service.durationMinutes} min
                  {service.price
                    ? ` · ${formatMoney(service.price, currencyCode)}`
                    : ""}
                </span>
              </span>
              {selectedIds.has(service.id) ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : null}
            </button>
          ))
        )}
      </div>
    </PopoverContent>
  );
}
