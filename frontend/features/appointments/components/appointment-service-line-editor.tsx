"use client";

import { useMemo, useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DrawerChevronIcon, DrawerTrashIcon } from "@/components/drawer/drawer-icons";
import { AppointmentSelectionServiceCard } from "@/features/appointments/components/drawer/appointment-service-card";
import { useServiceEligibleStaff } from "@/features/appointments/hooks/use-service-eligible-staff";
import {
  APPOINTMENT_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_ICON_BUTTON_CLASS,
  APPOINTMENT_DRAWER_SERVICE_CARD_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PICKER_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PICKER_ITEM_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PICKER_ITEM_META_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PICKER_ITEM_NAME_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PICKER_SEARCH_CLASS,
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

const APPOINTMENT_SERVICE_PICKER_POPOVER_PROPS = {
  align: "start" as const,
  side: "bottom" as const,
  sideOffset: 6,
  /** Prefer opening below; shift within viewport instead of flipping over content. */
  collisionAvoidance: { side: "shift" as const, align: "shift" as const },
  collisionPadding: 12,
};

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
  const [search, setSearch] = useState("");

  const { data: servicesPage, isFetching } = useQuery({
    queryKey: queryKeys.services.list({ page: 1, limit: 100, status: "ACTIVE" }),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: pickerOpen,
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
    setPickerOpen(false);
  };

  const servicePicker = (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      {value.length === 0 || !filledDisplay ? (
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            APPOINTMENT_DRAWER_FIELD_CLASS,
            "flex w-full items-center justify-between gap-2 text-[14px] font-normal text-[#9A9A9A] hover:bg-[#F6F1FE]/40 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span>Select a service</span>
          <DrawerChevronIcon direction="down" />
        </PopoverTrigger>
      ) : (
        <PopoverTrigger className="sr-only" tabIndex={-1} aria-hidden>
          Add service
        </PopoverTrigger>
      )}
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
  );

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
        servicePicker
      )}

      {value.length > 0 && !isDrawer ? (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7E3BED] hover:underline disabled:opacity-50"
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

      {value.length > 0 && isDrawer && filledDisplay && !onPickerOpenChange
        ? servicePicker
        : null}
    </div>
  );
}

export interface AppointmentServicePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  value: AppointmentServiceLineSelection[];
  onAdd: (service: Service) => void;
  currencyCode?: string;
}

/** Service picker anchored to an external trigger (e.g. Add Service row). */
export function AppointmentServicePicker({
  open,
  onOpenChange,
  trigger,
  value,
  onAdd,
  currencyCode = "USD",
}: AppointmentServicePickerProps) {
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

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger} />
      <ServicePickerPopoverContent
        search={search}
        onSearchChange={setSearch}
        isFetching={isFetching}
        availableServices={availableServices}
        selectedIds={selectedIds}
        currencyCode={currencyCode}
        onAdd={(service) => {
          onAdd(service);
          setSearch("");
          onOpenChange(false);
        }}
      />
    </Popover>
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
    <PopoverContent
      {...APPOINTMENT_SERVICE_PICKER_POPOVER_PROPS}
      className={APPOINTMENT_DRAWER_SERVICE_PICKER_CLASS}
    >
      <div className="border-b border-[#EEEAE6] px-3 py-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search services…"
          autoFocus
          className={APPOINTMENT_DRAWER_SERVICE_PICKER_SEARCH_CLASS}
        />
      </div>
      <div
        className="max-h-52 overflow-y-auto overscroll-contain px-2 py-2"
        role="listbox"
        aria-label="Services"
      >
        {isFetching ? (
          <div className="flex justify-center px-2 py-6">
            <LoadingState variant="inline" label="Loading services…" />
          </div>
        ) : availableServices.length === 0 ? (
          <EmptyState compact title="No services available" className="py-6" />
        ) : (
          availableServices.map((service) => {
            const duration =
              service.clientOccupancyMinutes ?? service.durationMinutes ?? 0;
            const meta = [
              duration > 0 ? `${duration} min` : null,
              service.price
                ? formatMoney(service.price, currencyCode)
                : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <button
                key={service.id}
                type="button"
                role="option"
                aria-selected={selectedIds.has(service.id)}
                className={APPOINTMENT_DRAWER_SERVICE_PICKER_ITEM_CLASS}
                onClick={() => onAdd(service)}
              >
                <span className={APPOINTMENT_DRAWER_SERVICE_PICKER_ITEM_NAME_CLASS}>
                  {service.name}
                </span>
                {meta ? (
                  <span className={APPOINTMENT_DRAWER_SERVICE_PICKER_ITEM_META_CLASS}>
                    {meta}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </PopoverContent>
  );
}
