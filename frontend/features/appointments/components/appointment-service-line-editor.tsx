"use client";

import { cloneElement, useMemo, useState, type MouseEvent, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { listServices } from "@/features/settings/api/services.api";
import { SearchableSelect } from "@/components/forms/searchable-select";
import type { Service } from "@/lib/types/api";
import { queryKeys } from "@/lib/query/keys";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DrawerTrashIcon } from "@/components/drawer/drawer-icons";
import { AppointmentSelectionServiceCard } from "@/features/appointments/components/drawer/appointment-service-card";
import { useServiceEligibleStaff } from "@/features/appointments/hooks/use-service-eligible-staff";
import {
  APPOINTMENT_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_ICON_BUTTON_CLASS,
  APPOINTMENT_DRAWER_SERVICE_CARD_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
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
  /** Drawer sidebar — single-service select, no “Add another service”. */
  variant?: "default" | "drawer";
  /** Figma filled cards (read-only display) instead of inline provider/time editors. */
  filledDisplay?: boolean;
  /** Controlled service picker — used when add action lives outside the editor. */
  pickerOpen?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
}

const INLINE_SELECT_TRIGGER_CLASS =
  "h-auto w-auto min-w-0 border-0 bg-transparent px-1 py-0.5 text-[13px] font-semibold text-[#7E3BED] shadow-none hover:bg-[#F6F1FE] focus-visible:ring-0";

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
  const { staffOptions: eligibleStaff } = useServiceEligibleStaff(
    line.serviceId,
    staffOptions,
  );
  const staffLabel =
    eligibleStaff.find((s) => s.userId === line.assignedToId)?.label ??
    "Select provider";

  return (
    <div className={APPOINTMENT_DRAWER_SERVICE_CARD_CLASS}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#5C2BB5]">{line.name}</p>
          {line.price ? (
            <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#1A1A1A]">
              {formatMoney(line.price, currencyCode)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className={APPOINTMENT_DRAWER_ICON_BUTTON_CLASS}
          aria-label={`Remove ${line.name}`}
        >
          <DrawerTrashIcon />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-[#9A9A9A]">
        <span className="inline-flex items-center gap-1">
          <span>Provider:</span>
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
              {eligibleStaff.map((staff) => (
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
  variant = "default",
  filledDisplay = false,
  pickerOpen: pickerOpenProp,
  onPickerOpenChange,
}: AppointmentServiceLineEditorProps) {
  const isDrawer = variant === "drawer";
  const [internalPickerOpen, setInternalPickerOpen] = useState(false);
  const pickerOpen = pickerOpenProp ?? internalPickerOpen;
  const setPickerOpen = onPickerOpenChange ?? setInternalPickerOpen;

  const selectedIds = useMemo(
    () => new Set(value.map((line) => line.serviceId)),
    [value],
  );

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
    setPickerOpen(false);
  };

  return (
    <div className={cn(isDrawer ? "space-y-0" : "space-y-3", className)}>
      {value.length > 0 ? (
        <div className="flex flex-col gap-3">
          {value.map((line, index) =>
            filledDisplay ? (
              <AppointmentSelectionServiceCard
                key={`${line.serviceId}-${index}`}
                line={line}
                staffOptions={staffOptions}
                currencyCode={currencyCode}
                onRemove={disabled ? undefined : () => removeLine(index)}
                onAssignedToChange={
                  disabled
                    ? undefined
                    : (userId) => updateLine(index, { assignedToId: userId })
                }
              />
            ) : (
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
            ),
          )}
        </div>
      ) : (
        <AppointmentServiceCombobox
          excludedIds={selectedIds}
          onAdd={handleAdd}
          currencyCode={currencyCode}
          disabled={disabled}
          placeholder="Select a service"
          triggerClassName={cn(APPOINTMENT_DRAWER_FIELD_CLASS, "font-normal")}
          onOpenChange={setPickerOpen}
        />
      )}

      {value.length > 0 && !isDrawer ? (
        pickerOpen ? (
          <AppointmentServiceCombobox
            excludedIds={selectedIds}
            onAdd={handleAdd}
            currencyCode={currencyCode}
            disabled={disabled}
            placeholder="Search services…"
            onOpenChange={setPickerOpen}
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7E3BED] hover:underline disabled:opacity-50"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="size-4" />
            Add another service
          </button>
        )
      ) : null}

      {value.length > 0 && isDrawer && filledDisplay && !onPickerOpenChange && pickerOpen ? (
        <AppointmentServiceCombobox
          excludedIds={selectedIds}
          onAdd={handleAdd}
          currencyCode={currencyCode}
          disabled={disabled}
          placeholder="Search services…"
          triggerClassName={cn(APPOINTMENT_DRAWER_FIELD_CLASS, "font-normal")}
          onOpenChange={setPickerOpen}
        />
      ) : null}
    </div>
  );
}

export interface AppointmentServicePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>;
  value: AppointmentServiceLineSelection[];
  onAdd: (service: Service) => void;
  currencyCode?: string;
}

/** Add-service control. The searchable list is rendered by the parent, not a nested popover. */
export function AppointmentServicePicker({
  open,
  onOpenChange,
  trigger,
}: AppointmentServicePickerProps) {
  return cloneElement(trigger, {
    onClick: (event: MouseEvent<HTMLElement>) => {
      trigger.props.onClick?.(event);
      onOpenChange(!open);
    },
  });
}

export function AppointmentServiceCombobox({
  excludedIds,
  onAdd,
  currencyCode = "USD",
  disabled = false,
  placeholder = "Select a service",
  triggerClassName,
  onOpenChange,
  defaultOpen = false,
}: {
  excludedIds: Set<string> | readonly string[];
  onAdd: (service: Service) => void;
  currencyCode?: string;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const excluded = useMemo(
    () => (excludedIds instanceof Set ? excludedIds : new Set(excludedIds)),
    [excludedIds],
  );

  const { data: servicesPage, isFetching } = useQuery({
    queryKey: queryKeys.services.list({ page: 1, limit: 100, status: "ACTIVE" }),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
  });

  const items = useMemo(
    () =>
      (servicesPage?.items ?? [])
        .filter((service) => !excluded.has(service.id))
        .map((service) => ({
          value: service.id,
          label: servicePickerLabel(service, currencyCode),
        })),
    [servicesPage?.items, excluded, currencyCode],
  );

  return (
    <SearchableSelect
      items={items}
      value={null}
      onValueChange={(id) => {
        const service = (servicesPage?.items ?? []).find((item) => item.id === id);
        if (service) onAdd(service);
      }}
      placeholder={placeholder}
      emptyMessage={isFetching ? "Loading services…" : "No services available"}
      disabled={disabled}
      triggerClassName={triggerClassName}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
    />
  );
}

function servicePickerLabel(service: Service, currencyCode: string) {
  const duration =
    service.clientOccupancyMinutes ?? service.durationMinutes ?? 0;
  const meta = [
    duration > 0 ? `${duration} min` : null,
    service.price ? formatMoney(service.price, currencyCode) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return meta ? `${service.name} — ${meta}` : service.name;
}
