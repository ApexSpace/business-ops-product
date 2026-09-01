"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getAppointmentStatusDisplayLabel,
  isCheckoutOpen,
  type AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";
import { APPOINTMENT_STATUS_COLORS } from "@/features/appointments/utils/appointment-calendar-styles";
import {
  APPOINTMENT_DRAWER_STATUS_CTA_CLASS,
  APPOINTMENT_DRAWER_STATUS_PILL_CLASS,
  APPOINTMENT_DRAWER_STATUS_ROW_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { useSalesStaffPermissions } from "@/features/sales/hooks/use-sales-staff-permissions";
import { cn } from "@/lib/utils";

const STATUS_ACTION_BUTTON_CLASS = APPOINTMENT_DRAWER_STATUS_CTA_CLASS;

function formatRelativeNotified(iso: string): string {
  const notifiedAt = new Date(iso).getTime();
  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - notifiedAt) / (60 * 1000)),
  );
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "a minute ago" : `${diffMinutes} minutes ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  return diffHours === 1 ? "an hour ago" : `${diffHours} hours ago`;
}

function formatExpressCountdown(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "Waiting for client to complete";
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Link expired";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `Expires in ${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `Expires in ${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `Expires in ${seconds}s`;
}

export interface AppointmentStatusActionsProps {
  status: AppointmentStatus;
  relatedCheckoutId: string | null;
  relatedCheckoutStatus: string | null;
  waitingNotifiedAt: string | null;
  expressBookingExpiresAt?: string | null;
  waitingStatusEnabled?: boolean;
  disabled?: boolean;
  onStatusChange: (status: AppointmentStatus) => void;
  onNotify: () => void;
  onCheckout: () => void;
  onViewSale: () => void;
  onCompleteExpress?: () => void;
}

export function AppointmentStatusBar({
  status,
  relatedCheckoutId,
  relatedCheckoutStatus,
  waitingNotifiedAt,
  expressBookingExpiresAt = null,
  waitingStatusEnabled = true,
  disabled = false,
  onStatusChange,
  onNotify,
  onCheckout,
  onViewSale,
  onCompleteExpress,
}: AppointmentStatusActionsProps) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [countdownLabel, setCountdownLabel] = useState(() =>
    formatExpressCountdown(expressBookingExpiresAt),
  );
  const displayLabel = getAppointmentStatusDisplayLabel(
    status,
    relatedCheckoutId,
    relatedCheckoutStatus,
  );
  const checkoutOpen = isCheckoutOpen(relatedCheckoutStatus);
  const colors = APPOINTMENT_STATUS_COLORS[status];

  useEffect(() => {
    if (status !== "PENDING_COMPLETION") return;
    const tick = () =>
      setCountdownLabel(formatExpressCountdown(expressBookingExpiresAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status, expressBookingExpiresAt]);

  return (
    <div>
      <div className={APPOINTMENT_DRAWER_STATUS_ROW_CLASS}>
        <span
          className={cn(
            APPOINTMENT_DRAWER_STATUS_PILL_CLASS,
            colors.bg,
            colors.border,
            colors.text,
          )}
        >
          <span className={cn("size-2 shrink-0 rounded-full", colors.dot)} />
          {displayLabel}
        </span>

        <div className="ml-auto flex max-w-full min-w-0 justify-end">
          <AppointmentStatusActions
            status={status}
            relatedCheckoutId={relatedCheckoutId}
            relatedCheckoutStatus={relatedCheckoutStatus}
            disabled={disabled}
            waitingStatusEnabled={waitingStatusEnabled}
            checkInOpen={checkInOpen}
            onCheckInOpenChange={setCheckInOpen}
            onStatusChange={onStatusChange}
            onNotify={onNotify}
            onCheckout={onCheckout}
            onViewSale={onViewSale}
            onCompleteExpress={onCompleteExpress}
          />
        </div>
      </div>

      {status === "PENDING_COMPLETION" ? (
        <p className="mt-2 text-caption text-grey-tertiary-normal">
          {countdownLabel}. Client still needs to finish the booking link.
        </p>
      ) : null}

      {status === "WAITING" && waitingNotifiedAt ? (
        <p className="mt-2 text-caption text-grey-tertiary-normal">
          Notified {formatRelativeNotified(waitingNotifiedAt)}.{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={onNotify}
            className="font-medium text-[#7E3BED] hover:underline disabled:opacity-50"
          >
            Send Again
          </button>
        </p>
      ) : null}

      {status === "IN_SERVICE" && checkoutOpen ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Checkout in progress.
        </p>
      ) : null}
    </div>
  );
}

function AppointmentStatusActions({
  status,
  relatedCheckoutId,
  relatedCheckoutStatus,
  disabled = false,
  waitingStatusEnabled = true,
  checkInOpen,
  onCheckInOpenChange,
  onStatusChange,
  onNotify,
  onCheckout,
  onViewSale,
  onCompleteExpress,
}: Omit<
  AppointmentStatusActionsProps,
  "waitingNotifiedAt" | "expressBookingExpiresAt"
> & {
  checkInOpen: boolean;
  onCheckInOpenChange: (open: boolean) => void;
}) {
  const checkoutOpen = isCheckoutOpen(relatedCheckoutStatus);
  const { canCheckout, canViewOnCalendar, canViewOwn, canViewAll } =
    useSalesStaffPermissions();
  const canViewAttachedSale =
    canViewOnCalendar || canViewOwn || canViewAll || canCheckout;

  if (status === "PENDING_COMPLETION") {
    if (!onCompleteExpress) return null;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onCompleteExpress}
        className={STATUS_ACTION_BUTTON_CLASS}
      >
        Complete
      </button>
    );
  }

  if (status === "UNCONFIRMED") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStatusChange("CONFIRMED")}
        className={STATUS_ACTION_BUTTON_CLASS}
      >
        Confirm
      </button>
    );
  }

  if (status === "CONFIRMED") {
    if (!waitingStatusEnabled) {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onStatusChange("IN_SERVICE")}
          className={STATUS_ACTION_BUTTON_CLASS}
        >
          Check In
        </button>
      );
    }

    return (
      <Popover open={checkInOpen} onOpenChange={onCheckInOpenChange}>
        <PopoverTrigger
          render={
            <button
              type="button"
              disabled={disabled}
              className={STATUS_ACTION_BUTTON_CLASS}
            >
              Check In
            </button>
          }
        />
        <PopoverContent align="end" className="w-44 p-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onStatusChange("WAITING");
              onCheckInOpenChange(false);
            }}
            className="flex w-full rounded-md px-3 py-2 text-left text-[13px] font-medium hover:bg-muted"
          >
            Waiting room
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onStatusChange("IN_SERVICE");
              onCheckInOpenChange(false);
            }}
            className="flex w-full rounded-md px-3 py-2 text-left text-[13px] font-medium hover:bg-muted"
          >
            In service
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  if (status === "WAITING") {
    return (
      <div className="flex max-w-full min-w-0 flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onNotify}
          className={STATUS_ACTION_BUTTON_CLASS}
        >
          Notify
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onStatusChange("IN_SERVICE")}
          className={STATUS_ACTION_BUTTON_CLASS}
        >
          In service
        </button>
      </div>
    );
  }

  if (status === "IN_SERVICE") {
    if (!canCheckout) {
      if (checkoutOpen && relatedCheckoutId && canViewAttachedSale) {
        return (
          <button
            type="button"
            disabled={disabled}
            onClick={onViewSale}
            className={STATUS_ACTION_BUTTON_CLASS}
          >
            View sale
          </button>
        );
      }
      return null;
    }
    if (checkoutOpen && relatedCheckoutId) {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={onCheckout}
          className={STATUS_ACTION_BUTTON_CLASS}
        >
          Continue
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onCheckout}
        className={STATUS_ACTION_BUTTON_CLASS}
      >
        Checkout
      </button>
    );
  }

  if (status === "COMPLETED" && relatedCheckoutId && canViewAttachedSale) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onViewSale}
        className={STATUS_ACTION_BUTTON_CLASS}
      >
        View sale
      </button>
    );
  }

  return null;
}
