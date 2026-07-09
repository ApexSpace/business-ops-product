"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
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
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
import { cn } from "@/lib/utils";

const STATUS_ACTION_BUTTON_CLASS =
  "h-8 rounded-full border border-border bg-background px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground shadow-none hover:bg-muted/40";

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

export interface AppointmentStatusActionsProps {
  status: AppointmentStatus;
  relatedCheckoutId: string | null;
  relatedCheckoutStatus: string | null;
  waitingNotifiedAt: string | null;
  disabled?: boolean;
  onStatusChange: (status: AppointmentStatus) => void;
  onNotify: () => void;
  onCheckout: () => void;
  onViewSale: () => void;
}

export function AppointmentStatusBar({
  status,
  relatedCheckoutId,
  relatedCheckoutStatus,
  waitingNotifiedAt,
  disabled = false,
  onStatusChange,
  onNotify,
  onCheckout,
  onViewSale,
}: AppointmentStatusActionsProps) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const displayLabel = getAppointmentStatusDisplayLabel(
    status,
    relatedCheckoutId,
    relatedCheckoutStatus,
  );
  const checkoutOpen = isCheckoutOpen(relatedCheckoutStatus);

  return (
    <div className="rounded-[10px] border border-border/70 bg-muted/15 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              getAppointmentStatusDotClass(status),
            )}
          />
          <span className="text-[14px] font-semibold text-foreground">
            {displayLabel}
          </span>
        </div>

        <AppointmentStatusActions
          status={status}
          relatedCheckoutId={relatedCheckoutId}
          relatedCheckoutStatus={relatedCheckoutStatus}
          disabled={disabled}
          checkInOpen={checkInOpen}
          onCheckInOpenChange={setCheckInOpen}
          onStatusChange={onStatusChange}
          onNotify={onNotify}
          onCheckout={onCheckout}
          onViewSale={onViewSale}
        />
      </div>

      {status === "WAITING" && waitingNotifiedAt ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Notified {formatRelativeNotified(waitingNotifiedAt)}.{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={onNotify}
            className="font-medium text-primary hover:underline disabled:opacity-50"
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
  checkInOpen,
  onCheckInOpenChange,
  onStatusChange,
  onNotify,
  onCheckout,
  onViewSale,
}: Omit<AppointmentStatusActionsProps, "waitingNotifiedAt"> & {
  checkInOpen: boolean;
  onCheckInOpenChange: (open: boolean) => void;
}) {
  const checkoutOpen = isCheckoutOpen(relatedCheckoutStatus);

  if (status === "CONFIRMED") {
    return (
      <Popover open={checkInOpen} onOpenChange={onCheckInOpenChange}>
        <PopoverTrigger
          render={
            <ActionButton
              type="button"
              variant="outline"
              disabled={disabled}
              className={STATUS_ACTION_BUTTON_CLASS}
            >
              Check-in
            </ActionButton>
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
      <div className="flex shrink-0 items-center gap-2">
        <ActionButton
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onNotify}
          className={STATUS_ACTION_BUTTON_CLASS}
        >
          Notify
        </ActionButton>
        <ActionButton
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onStatusChange("IN_SERVICE")}
          className={STATUS_ACTION_BUTTON_CLASS}
        >
          In service
        </ActionButton>
      </div>
    );
  }

  if (status === "IN_SERVICE") {
    if (checkoutOpen && relatedCheckoutId) {
      return (
        <ActionButton
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onCheckout}
          className={STATUS_ACTION_BUTTON_CLASS}
        >
          Continue
        </ActionButton>
      );
    }

    return (
      <ActionButton
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onCheckout}
        className={STATUS_ACTION_BUTTON_CLASS}
      >
        Checkout
      </ActionButton>
    );
  }

  if (status === "COMPLETED" && relatedCheckoutId) {
    return (
      <ActionButton
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onViewSale}
        className={STATUS_ACTION_BUTTON_CLASS}
      >
        View sale
      </ActionButton>
    );
  }

  return null;
}
