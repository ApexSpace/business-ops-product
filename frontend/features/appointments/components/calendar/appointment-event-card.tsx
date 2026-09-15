"use client";

import type { ReactNode } from "react";
import { ImageIcon, Timer } from "lucide-react";
import {
  getAppointmentServiceSummaryLabel,
  getContactDisplayName,
  getAppointmentSyncIndicator,
  type Appointment,
} from "@/features/appointments/schemas/appointment-profile";
import {
  formatAppointmentCardTimeRange,
  getAppointmentCardTheme,
  getAppointmentEventStyle,
} from "@/features/appointments/utils/appointment-calendar-styles";
import { useCalendarDisplayRuntime } from "@/features/calendar-display-settings/context/calendar-display-runtime-context";
import {
  calendarEventCardMetrics,
  calendarEventVisibleLines,
} from "@/features/calendars/utils/calendar-event-density";
import { formatTime } from "@/features/calendars/utils/calendar-dates";
import { cn } from "@/lib/utils";

export type AppointmentEventCardVariant = "grid" | "month";

interface AppointmentEventCardProps {
  appointment: Appointment;
  timeZone?: string;
  variant?: AppointmentEventCardVariant;
  /** Pixel height of the grid block — controls secondary lines in day/week views. */
  eventHeight?: number;
  className?: string;
  onClick?: () => void;
  onMoveStart?: (event: React.PointerEvent) => void;
  onResizeStart?: (event: React.PointerEvent) => void;
  isDragging?: boolean;
}

function CardLine({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <p
      className={cn(
        "min-w-0 shrink-0 truncate overflow-hidden whitespace-nowrap",
        className,
      )}
      style={style}
    >
      {children}
    </p>
  );
}

export function AppointmentEventCard({
  appointment,
  timeZone,
  variant = "grid",
  eventHeight,
  className,
  onClick,
  onMoveStart,
  onResizeStart,
  isDragging = false,
}: AppointmentEventCardProps) {
  const { slotHeightPx } = useCalendarDisplayRuntime();
  const metrics = calendarEventCardMetrics(slotHeightPx);
  const theme = getAppointmentCardTheme(appointment);
  const { className: eventClass, style } = getAppointmentEventStyle(appointment);
  const contactName = getContactDisplayName(appointment.contact, {
    guestFirstName: appointment.guestFirstName,
    guestEmail: appointment.guestEmail,
  });
  const serviceLabel =
    getAppointmentServiceSummaryLabel(appointment) ?? appointment.title;
  const timeRange = formatAppointmentCardTimeRange(
    appointment.startAt,
    appointment.endAt,
    timeZone,
  );
  const syncIndicator = getAppointmentSyncIndicator(appointment);
  const hasPhotos = Boolean(
    appointment.hasPhotos || (appointment.photoFileIds?.length ?? 0) > 0,
  );
  const isPendingExpress = appointment.status === "PENDING_COMPLETION";
  const interactive = Boolean(onClick);
  const draggable = Boolean(onMoveStart);

  const visible =
    variant === "grid" && eventHeight !== undefined
      ? calendarEventVisibleLines(eventHeight, metrics)
      : { showClient: true, showTime: true };

  const showClient =
    variant === "grid" && Boolean(contactName) && visible.showClient;
  const showTime = variant === "grid" && visible.showTime;

  const titleClass =
    metrics.density === "compact"
      ? "text-[11px] font-semibold leading-3"
      : metrics.density === "comfortable"
        ? "text-[12px] font-bold leading-[14px]"
        : "text-[13px] font-bold leading-4";

  const secondaryClass =
    metrics.density === "compact"
      ? "text-[10px] font-normal leading-[11px]"
      : metrics.density === "comfortable"
        ? "text-[11px] font-normal leading-3"
        : "text-[11px] font-normal leading-[14px]";

  const iconClass =
    metrics.density === "compact" ? "size-2.5" : "size-3";

  return (
    <div
      data-calendar-appointment=""
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onClick?.();
              }
            }
          : undefined
      }
      onPointerDown={
        draggable
          ? (event) => {
              if ((event.target as HTMLElement).closest("[data-resize-handle]")) {
                return;
              }
              onMoveStart?.(event);
            }
          : undefined
      }
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-md)] border border-solid text-left",
        variant === "month" && "gap-0.5 px-1.5 py-1",
        interactive &&
          "cursor-pointer transition-[box-shadow,transform] hover:shadow-md active:scale-[0.995]",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-80 ring-2 ring-[#7E3BED]/50",
        eventClass,
        className,
      )}
      style={{
        ...style,
        ...(variant === "grid"
          ? {
              paddingTop: metrics.padY,
              paddingBottom: metrics.padY,
              paddingLeft: metrics.padX,
              paddingRight: metrics.padX,
              gap: metrics.gap,
            }
          : undefined),
      }}
    >
      <div className="flex min-h-0 min-w-0 shrink-0 items-start gap-1">
        <CardLine className={cn("flex-1", titleClass)}>
          {serviceLabel}
        </CardLine>
        {hasPhotos ? (
          <span
            className="mt-0.5 shrink-0 text-current opacity-80"
            title="Has attached photos"
          >
            <ImageIcon className={iconClass} aria-hidden />
          </span>
        ) : null}
        {isPendingExpress ? (
          <span
            className="mt-0.5 shrink-0 text-current opacity-90"
            title="Pending Express Booking completion"
          >
            <Timer className={iconClass} aria-hidden />
          </span>
        ) : null}
        {syncIndicator ? (
          <span
            className={cn(
              "shrink-0 rounded px-1 py-0 text-[9px] font-medium leading-none no-underline",
              syncIndicator.variant === "google-error" &&
                "bg-destructive/15 text-destructive",
              syncIndicator.variant === "google-import" &&
                "bg-blue-500/15 text-blue-700 dark:text-blue-300",
              syncIndicator.variant === "google-sync" &&
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
            )}
            title={appointment.googleSyncWarning ?? syncIndicator.label}
          >
            {syncIndicator.label}
          </span>
        ) : null}
      </div>

      {showClient ? (
        <CardLine className={secondaryClass}>
          <span style={{ color: theme.textMuted }}>{contactName}</span>
        </CardLine>
      ) : null}

      {showTime ? (
        <CardLine className={secondaryClass}>{timeRange}</CardLine>
      ) : null}

      {variant === "month" ? (
        <CardLine className="text-[10px] leading-3 opacity-80">
          {formatTime(appointment.startAt, timeZone)}
        </CardLine>
      ) : null}

      {onResizeStart && variant === "grid" && metrics.density !== "compact" ? (
        <div
          data-resize-handle=""
          role="presentation"
          onPointerDown={(event) => onResizeStart(event)}
          className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-b-[8px] hover:bg-black/5"
        />
      ) : onResizeStart && variant === "grid" ? (
        <div
          data-resize-handle=""
          role="presentation"
          onPointerDown={(event) => onResizeStart(event)}
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        />
      ) : null}
    </div>
  );
}
