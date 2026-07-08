"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import {
  DrawerShell,
  DRAWER_SHELL_HEADER_ACTION_CLASS,
} from "@/components/layout/drawer-shell";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getAppointment,
  getAppointmentActivity,
} from "@/features/appointments/api/appointments.api";
import {
  APPOINTMENT_STATUS_OPTIONS,
  formatAppointmentStatus,
  type AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
import { useAppointmentStatusMutation } from "@/features/appointments/hooks/use-appointment-status-mutation";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { resolveAppointmentDisplayTimezone } from "@/features/calendars/utils/timezone";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import {
  AppointmentBookingDetails,
  AppointmentClientBlock,
  AppointmentContactDetailsRows,
  AppointmentDateTimeBar,
  AppointmentServicesList,
} from "./appointment-drawer-sections";

export interface AppointmentDetailDrawerProps {
  appointmentId: string | null;
  variant?: "panel" | "sheet";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEdit: () => void;
  onClose: () => void;
  onMessageClick: (contactId: string) => void;
  onCheckout: (appointmentId: string) => void;
  onViewSale: (checkoutId: string) => void;
  onStatusChange?: (status: AppointmentStatus) => void;
  onCancel?: (appointmentId: string) => void;
  onDelete?: (appointmentId: string) => void;
}

function StatusQuickAction({
  status,
  relatedCheckoutId,
  onInService,
  onCheckout,
  onViewSale,
}: {
  status: AppointmentStatus;
  relatedCheckoutId: string | null;
  onInService: () => void;
  onCheckout: () => void;
  onViewSale: () => void;
}) {
  if (status === "WAITING") {
    return (
      <ActionButton size="sm" onClick={onInService}>
        In service
      </ActionButton>
    );
  }

  if (status === "COMPLETED" && relatedCheckoutId) {
    return (
      <ActionButton size="sm" variant="outline" onClick={onViewSale}>
        View sale
      </ActionButton>
    );
  }

  if (status !== "COMPLETED" && status !== "CANCELLED" && status !== "NO_SHOW") {
    return (
      <ActionButton size="sm" onClick={onCheckout}>
        Checkout
      </ActionButton>
    );
  }

  return null;
}

export function AppointmentDetailDrawer({
  appointmentId,
  variant = "panel",
  open = true,
  onOpenChange,
  onEdit,
  onClose,
  onMessageClick,
  onCheckout,
  onViewSale,
  onStatusChange,
  onCancel,
  onDelete,
}: AppointmentDetailDrawerProps) {
  const { data: business } = useCurrentBusiness();
  const statusMutation = useAppointmentStatusMutation(appointmentId);

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: appointment, isLoading } = useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId ?? ""),
    queryFn: () => getAppointment(appointmentId!),
    enabled: Boolean(appointmentId),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["appointments", "detail", appointmentId, "activity"],
    queryFn: () => getAppointmentActivity(appointmentId!),
    enabled: Boolean(appointmentId),
  });

  const timezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        appointment?.calendarId,
        calendars?.items,
      ),
    [business?.timezone, appointment?.calendarId, calendars?.items],
  );

  const currencyCode = business?.taxesAndCurrency?.currencyCode ?? "USD";

  const handleStatusChange = (status: AppointmentStatus) => {
    statusMutation.mutate(status, {
      onSuccess: () => onStatusChange?.(status),
    });
  };

  if (!appointmentId) return null;

  const headerActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton
              aria-label="Appointment actions"
              className={DRAWER_SHELL_HEADER_ACTION_CLASS}
            >
              <MoreHorizontal className="size-4" />
            </IconButton>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          {APPOINTMENT_STATUS_OPTIONS.map((option) => {
            const isCurrent = appointment?.status === option.value;
            return (
              <DropdownMenuItem
                key={option.value}
                disabled={isCurrent || statusMutation.isPending}
                onClick={() => handleStatusChange(option.value)}
              >
                <span
                  className={cn(
                    "mr-2 size-2 rounded-full",
                    getAppointmentStatusDotClass(option.value),
                  )}
                />
                {option.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          {onCancel && appointment?.status !== "CANCELLED" ? (
            <DropdownMenuItem
              onClick={() => onCancel(appointmentId)}
              className="text-destructive focus:text-destructive"
            >
              Cancel appointment
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <DropdownMenuItem
              onClick={() => onDelete(appointmentId)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <IconButton
        aria-label="Edit appointment"
        onClick={onEdit}
        className={DRAWER_SHELL_HEADER_ACTION_CLASS}
      >
        <Pencil className="size-4" />
      </IconButton>
      {variant === "panel" ? (
        <IconButton
          aria-label="Close appointment details"
          onClick={onClose}
          className={DRAWER_SHELL_HEADER_ACTION_CLASS}
        >
          <X className="size-4" />
        </IconButton>
      ) : null}
    </>
  );

  return (
    <DrawerShell
      variant={variant}
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange?.(nextOpen);
        if (!nextOpen) onClose();
      }}
      title="Appointment"
      headerActions={headerActions}
      showCloseButton={variant === "sheet"}
    >
      {isLoading || !appointment ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border/70 bg-muted/15 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  getAppointmentStatusDotClass(appointment.status),
                )}
              />
              <span className="text-[14px] font-semibold text-foreground">
                {formatAppointmentStatus(appointment.status)}
              </span>
            </div>
            <StatusQuickAction
              status={appointment.status}
              relatedCheckoutId={appointment.relatedCheckoutId}
              onInService={() => handleStatusChange("IN_SERVICE")}
              onCheckout={() => onCheckout(appointment.id)}
              onViewSale={() => {
                if (appointment.relatedCheckoutId) {
                  onViewSale(appointment.relatedCheckoutId);
                }
              }}
            />
          </div>

          <AppointmentDateTimeBar
            startAt={appointment.startAt}
            endAt={appointment.endAt}
            timezone={timezone}
          />

          <AppointmentClientBlock
            contact={appointment.contact}
            timezone={timezone}
            onMessageClick={() => onMessageClick(appointment.contactId)}
          />

          <AppointmentContactDetailsRows contact={appointment.contact} />

          <AppointmentServicesList
            services={appointment.services ?? []}
            timezone={timezone}
            currencyCode={currencyCode}
          />

          {appointment.notes?.trim() ? (
            <div className="border-t border-border/60 pt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
                {appointment.notes}
              </p>
            </div>
          ) : null}

          <AppointmentBookingDetails
            items={activity?.items ?? []}
            isLoading={activityLoading}
          />
        </div>
      )}
    </DrawerShell>
  );
}
