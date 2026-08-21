"use client";

import { useEffect } from "react";
import {
  DrawerPlusIcon,
  DrawerPlusSquareButton,
  DrawerTrashIcon,
} from "@/components/drawer/drawer-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { formatTimeInTimezone } from "@/features/calendars/utils/timezone";
import type { AppointmentServiceLine } from "@/features/appointments/schemas/appointment-profile";
import { getMemberDisplayName } from "@/features/appointments/schemas/appointment-profile";
import {
  formatTimeSlotLabel,
  type AppointmentServiceLineSelection,
  type StaffOption,
} from "@/features/appointments/utils/appointment-service-lines";
import { useServiceEligibleStaff } from "@/features/appointments/hooks/use-service-eligible-staff";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  APPOINTMENT_DRAWER_ADD_ACTION_CLASS,
  APPOINTMENT_DRAWER_ADD_ACTION_OUTLINE_CLASS,
  APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS,
  APPOINTMENT_DRAWER_ICON_BUTTON_CLASS,
  APPOINTMENT_DRAWER_PROVIDER_SELECT_TRIGGER_CLASS,
  APPOINTMENT_DRAWER_SERVICE_CARD_CLASS,
  APPOINTMENT_DRAWER_SERVICE_META_ROW_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PRICE_CLASS,
  APPOINTMENT_DRAWER_SERVICE_PROVIDER_CLASS,
  APPOINTMENT_DRAWER_SERVICE_TIME_CLASS,
  APPOINTMENT_DRAWER_SERVICE_TITLE_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

function formatDurationMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours * 60 + remainder} min` : `${hours * 60} min`;
}

export interface AppointmentServiceCardProps {
  line: AppointmentServiceLine;
  timezone: string;
  currencyCode?: string;
  onRemove?: () => void;
  className?: string;
}

export function AppointmentServiceCard({
  line,
  timezone,
  currencyCode = "USD",
  onRemove,
  className,
}: AppointmentServiceCardProps) {
  const staffName = line.assignedTo
    ? getMemberDisplayName(line.assignedTo)
    : "Unassigned";
  const lineTime = line.startAt
    ? formatTimeInTimezone(line.startAt, timezone)
    : null;
  const duration =
    line.durationMinutes ?? line.service.durationMinutes ?? null;
  const price = line.price ?? line.service.price;
  const timeDuration =
    lineTime && duration
      ? `${lineTime} (${formatDurationMinutes(duration)})`
      : lineTime || (duration ? formatDurationMinutes(duration) : null);

  return (
    <div className={cn(APPOINTMENT_DRAWER_SERVICE_CARD_CLASS, className)}>
      <div className="flex min-h-11 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={APPOINTMENT_DRAWER_SERVICE_TITLE_CLASS}>
            {line.service.name}
          </p>
          {price ? (
            <p className={APPOINTMENT_DRAWER_SERVICE_PRICE_CLASS}>
              {formatMoney(price, currencyCode)}
            </p>
          ) : null}
        </div>
        {onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${line.service.name}`}
            className={cn(
              APPOINTMENT_DRAWER_ICON_BUTTON_CLASS,
              "size-6 text-violet-primary-darker [&>svg]:size-6",
            )}
            onClick={onRemove}
          >
            <DrawerTrashIcon className="size-6" />
          </button>
        ) : null}
      </div>
      <div className={APPOINTMENT_DRAWER_SERVICE_META_ROW_CLASS}>
        <span className={APPOINTMENT_DRAWER_SERVICE_PROVIDER_CLASS}>
          Provider: {staffName}
        </span>
        {timeDuration ? (
          <span className={APPOINTMENT_DRAWER_SERVICE_TIME_CLASS}>
            {timeDuration}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export interface AppointmentSelectionServiceCardProps {
  line: AppointmentServiceLineSelection;
  staffOptions: StaffOption[];
  currencyCode?: string;
  onRemove?: () => void;
  onAssignedToChange?: (userId: string) => void;
  className?: string;
}

/** Service card for create/edit forms before save. */
export function AppointmentSelectionServiceCard({
  line,
  staffOptions,
  currencyCode = "USD",
  onRemove,
  onAssignedToChange,
  className,
}: AppointmentSelectionServiceCardProps) {
  const { staffOptions: eligibleStaff } = useServiceEligibleStaff(
    line.serviceId,
    staffOptions,
  );
  const staffName =
    eligibleStaff.find((staff) => staff.userId === line.assignedToId)?.label ??
    "Select provider";
  const lineTime = formatTimeSlotLabel(line.startMinutes);
  // Figma service meta uses total minutes, e.g. "10:30 AM (120 min)".
  const timeDuration = `${lineTime} (${line.occupancyMinutes} min)`;
  const canChangeProvider =
    Boolean(onAssignedToChange) && eligibleStaff.length > 0;

  useEffect(() => {
    if (!onAssignedToChange || eligibleStaff.length === 0) return;
    if (eligibleStaff.some((staff) => staff.userId === line.assignedToId)) {
      return;
    }
    onAssignedToChange(eligibleStaff[0]!.userId);
  }, [eligibleStaff, line.assignedToId, onAssignedToChange]);

  return (
    <div className={cn(APPOINTMENT_DRAWER_SERVICE_CARD_CLASS, className)}>
      <div className="flex min-h-11 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={APPOINTMENT_DRAWER_SERVICE_TITLE_CLASS}>{line.name}</p>
          {line.price ? (
            <p className={APPOINTMENT_DRAWER_SERVICE_PRICE_CLASS}>
              {formatMoney(line.price, currencyCode)}
            </p>
          ) : null}
        </div>
        {onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${line.name}`}
            className={cn(
              APPOINTMENT_DRAWER_ICON_BUTTON_CLASS,
              "size-6 text-violet-primary-darker [&>svg]:size-6",
            )}
            onClick={onRemove}
          >
            <DrawerTrashIcon className="size-6" />
          </button>
        ) : null}
      </div>
      <div className={APPOINTMENT_DRAWER_SERVICE_META_ROW_CLASS}>
        {canChangeProvider ? (
          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-[14px] font-medium leading-[18px] text-[#6B6B6B]">
              Provider:
            </span>
            <Select
              value={line.assignedToId || undefined}
              onValueChange={(userId) => {
                if (!userId) return;
                onAssignedToChange?.(userId);
              }}
            >
              <SelectTrigger
                aria-label="Change provider"
                className={APPOINTMENT_DRAWER_PROVIDER_SELECT_TRIGGER_CLASS}
              >
                <span className="min-w-0 truncate">{staffName}</span>
              </SelectTrigger>
              <SelectContent
                align="start"
                side="bottom"
                className="max-h-60 min-w-[200px]"
              >
                {eligibleStaff.map((staff) => (
                  <SelectItem key={staff.userId} value={staff.userId}>
                    {staff.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className={APPOINTMENT_DRAWER_SERVICE_PROVIDER_CLASS}>
            Provider: {staffName}
          </span>
        )}
        <span className={APPOINTMENT_DRAWER_SERVICE_TIME_CLASS}>
          {timeDuration}
        </span>
      </div>
    </div>
  );
}

export interface AppointmentAddActionsProps {
  onAddService?: () => void;
  onAddNote?: () => void;
  /** Figma: link row (default) or outlined secondary buttons (update mobile). */
  variant?: "link" | "outline";
  className?: string;
}

export function AppointmentAddActions({
  onAddService,
  onAddNote,
  variant = "link",
  className,
}: AppointmentAddActionsProps) {
  if (!onAddService && !onAddNote) return null;
  const isOutline = variant === "outline";
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center",
        isOutline ? "gap-3" : "gap-6",
        className,
      )}
    >
      {onAddService ? (
        <button
          type="button"
          className={
            isOutline
              ? APPOINTMENT_DRAWER_ADD_ACTION_OUTLINE_CLASS
              : APPOINTMENT_DRAWER_ADD_ACTION_CLASS
          }
          onClick={onAddService}
        >
          {isOutline ? null : (
            <span className={APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS}>
              <DrawerPlusIcon className="size-4 text-white" />
            </span>
          )}
          {isOutline ? "+ Add Service" : "Add Service"}
        </button>
      ) : null}
      {onAddNote ? (
        <button
          type="button"
          className={
            isOutline
              ? APPOINTMENT_DRAWER_ADD_ACTION_OUTLINE_CLASS
              : APPOINTMENT_DRAWER_ADD_ACTION_CLASS
          }
          onClick={onAddNote}
        >
          {isOutline ? null : (
            <span className={APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS}>
              <DrawerPlusIcon className="size-4 text-white" />
            </span>
          )}
          {isOutline ? "+ Add Note" : "Add Note"}
        </button>
      ) : null}
    </div>
  );
}

export { DrawerPlusSquareButton };
