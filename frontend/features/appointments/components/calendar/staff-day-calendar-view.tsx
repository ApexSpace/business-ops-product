"use client";

import { useMemo } from "react";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import { CalendarCurrentTimeIndicator } from "@/features/appointments/components/calendar/calendar-current-time-indicator";
import {
  GRID_HEIGHT,
  TimeGridColumn,
  TimeGridGutter,
} from "@/features/appointments/components/calendar/time-grid-shared";
import type { StaffMemberOption } from "@/features/appointments/components/calendar/staff-selector";
import { useCalendarCurrentTimeTop } from "@/features/appointments/hooks/use-calendar-current-time";
import { isTodayDateKey } from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import {
  CALENDAR_FIGMA_STAFF_COL_IDEAL_PX,
  CALENDAR_FIGMA_STAFF_COL_MIN_PX,
  CALENDAR_FIGMA_TIME_GUTTER_PX,
} from "@/features/calendars/styles/calendar-figma";
import {
  MOBILE_CAL_COL_WIDTH_PX,
  MOBILE_CAL_STAFF_HEADER_HEIGHT_PX,
  MOBILE_CAL_TIME_GUTTER_PX,
} from "@/features/appointments/styles/mobile-calendar-tokens";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { cn } from "@/lib/utils";

/** Figma staff header % badge — booked share of an 8h day (clamped 0–100). */
function staffUtilizationPercent(
  appointments: Appointment[],
  staffUserId: string,
): number {
  const dayMinutes = 8 * 60;
  let booked = 0;
  for (const appointment of appointments) {
    if (appointment.assignedToId !== staffUserId) continue;
    const start = Date.parse(appointment.startAt);
    const end = Date.parse(appointment.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      continue;
    }
    booked += (end - start) / 60_000;
  }
  return Math.min(100, Math.max(0, Math.round((booked / dayMinutes) * 100)));
}

interface StaffDayCalendarViewProps {
  dateKey: string;
  timezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  staffMembers: StaffMemberOption[];
  appointments: Appointment[];
  isLoading?: boolean;
  className?: string;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentMoveStart?: (
    appointment: Appointment,
    event: React.PointerEvent,
  ) => void;
  onAppointmentResizeStart?: (
    appointment: Appointment,
    event: React.PointerEvent,
  ) => void;
  draggingAppointmentId?: string | null;
  businessHoursSlots?: BusinessHoursSlot[];
  staffSlotsByUserId?: Map<string, BusinessHoursSlot[] | null>;
  onSlotClick: (
    dateKey: string,
    hour: number,
    minute: number,
    assignedToId?: string,
  ) => void;
  /** Figma phone layout — narrow columns, avatar above name, no % badge. */
  density?: "desktop" | "mobile";
}

export function StaffDayCalendarView({
  dateKey,
  timezone,
  calendars,
  businessTimezone,
  staffMembers,
  appointments,
  isLoading,
  className,
  onAppointmentClick,
  onAppointmentMoveStart,
  onAppointmentResizeStart,
  draggingAppointmentId,
  businessHoursSlots,
  staffSlotsByUserId,
  onSlotClick,
  density = "desktop",
}: StaffDayCalendarViewProps) {
  const isMobile = density === "mobile";
  const isToday = isTodayDateKey(dateKey, timezone);
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, [dateKey]);
  const columnCount = Math.max(staffMembers.length, 1);
  const timeGutterPx = isMobile
    ? MOBILE_CAL_TIME_GUTTER_PX
    : CALENDAR_FIGMA_TIME_GUTTER_PX;
  const colMin = isMobile
    ? MOBILE_CAL_COL_WIDTH_PX
    : Math.min(
        CALENDAR_FIGMA_STAFF_COL_IDEAL_PX,
        Math.max(CALENDAR_FIGMA_STAFF_COL_MIN_PX, 200),
      );
  const gridTemplate = isMobile
    ? `${timeGutterPx}px repeat(${columnCount}, ${colMin}px)`
    : `${timeGutterPx}px repeat(${columnCount}, minmax(${colMin}px, 1fr))`;
  const minWidth = timeGutterPx + columnCount * colMin;

  const utilizationByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of staffMembers) {
      map.set(
        member.userId,
        staffUtilizationPercent(appointments, member.userId),
      );
    }
    return map;
  }, [appointments, staffMembers]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-white",
        CALENDAR_GRID.card,
        isMobile &&
          "[&_[data-calendar-appointment]]:rounded-[3px] [&_[data-calendar-appointment]]:gap-1 [&_[data-calendar-appointment]]:p-[5px]",
        className,
      )}
      data-calendar-density={density}
    >
      {/* Single scroll host — avoids stacked horizontal scrollbars */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white">
        <div className="min-w-0 bg-white" style={{ minWidth }}>
          <div
            className={cn(
              "sticky top-0 z-30 grid bg-white",
              CALENDAR_GRID.headerRow,
            )}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div
              className="sticky left-0 z-40 shrink-0 border-b border-r border-[color:rgba(126,59,237,0.6)] bg-white"
              style={{ width: timeGutterPx, height: isMobile ? MOBILE_CAL_STAFF_HEADER_HEIGHT_PX : undefined }}
              aria-hidden
            />
            {staffMembers.map((member) => {
              const utilization = utilizationByStaff.get(member.userId) ?? 0;
              if (isMobile) {
                return (
                  <div
                    key={member.userId}
                    className="flex flex-col items-center justify-center gap-1 border-b border-l border-[color:rgba(126,59,237,0.6)] bg-white px-1"
                    style={{ height: MOBILE_CAL_STAFF_HEADER_HEIGHT_PX }}
                  >
                    <ProfileAvatar
                      name={member.label}
                      avatarUrl={member.avatarUrl}
                      className="size-6 shrink-0"
                      fallbackClassName="bg-[#FFD9E5] text-[9px] font-semibold text-[#703253]"
                    />
                    <span className="line-clamp-2 max-w-full text-center text-[11px] font-semibold leading-tight text-violet-primary-normal">
                      {member.label}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={member.userId}
                  className={cn(
                    CALENDAR_GRID.staffHeaderCell,
                    CALENDAR_GRID.column,
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProfileAvatar
                      name={member.label}
                      avatarUrl={member.avatarUrl}
                      className="size-8 shrink-0"
                      fallbackClassName="bg-[#D1D1D1] text-[10px] font-semibold text-[#6B6B6B]"
                    />
                    <span className="min-w-0 truncate text-sm font-semibold text-black-secondary-normal">
                      {member.label}
                    </span>
                  </div>
                  <span className="inline-flex h-6 shrink-0 items-center justify-center rounded-full bg-[#7E3BED] px-2 text-[11px] font-semibold leading-none text-white">
                    {utilization}%
                  </span>
                </div>
              );
            })}
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-grey-tertiary-normal">
              Loading appointments…
            </div>
          ) : (
            <div
              className="relative bg-white"
              style={{ minHeight: GRID_HEIGHT }}
            >
              {currentTimeTop !== null ? (
                <CalendarCurrentTimeIndicator topPx={currentTimeTop} />
              ) : null}
              <div
                className="grid bg-white"
                style={{
                  gridTemplateColumns: gridTemplate,
                  minHeight: GRID_HEIGHT,
                }}
              >
                <TimeGridGutter className={isMobile ? "w-[52px]" : undefined} />
                {staffMembers.map((member) => (
                  <TimeGridColumn
                    key={member.userId}
                    dateKey={dateKey}
                    appointments={appointments}
                    viewTimezone={timezone}
                    calendars={calendars}
                    businessTimezone={businessTimezone}
                    staffUserId={member.userId}
                    highlightToday={isToday}
                    onAppointmentClick={onAppointmentClick}
                    onAppointmentMoveStart={onAppointmentMoveStart}
                    onAppointmentResizeStart={onAppointmentResizeStart}
                    draggingAppointmentId={draggingAppointmentId}
                    businessHoursSlots={businessHoursSlots}
                    staffHoursSlots={
                      staffSlotsByUserId?.get(member.userId) ?? null
                    }
                    onSlotClick={onSlotClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
