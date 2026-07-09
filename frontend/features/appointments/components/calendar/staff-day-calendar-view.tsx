"use client";

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
import {
  formatShortWeekdayForDateKey,
  isTodayDateKey,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { cn } from "@/lib/utils";

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
  onSlotClick: (
    dateKey: string,
    hour: number,
    minute: number,
    assignedToId?: string,
  ) => void;
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
  onSlotClick,
}: StaffDayCalendarViewProps) {
  const isToday = isTodayDateKey(dateKey, timezone);
  const dayNumber = parseDateKeyInTimezone(dateKey, timezone).day;
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, [dateKey]);
  const columnCount = Math.max(staffMembers.length, 1);
  const gridTemplate = `56px repeat(${columnCount}, minmax(120px, 1fr))`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card shadow-elevation-xs",
        CALENDAR_GRID.card,
        className,
      )}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="max-h-[min(75vh,840px)] overflow-auto">
            <div
              className={cn(
                "sticky top-0 z-20 grid bg-card",
                CALENDAR_GRID.headerRow,
              )}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div />
              {staffMembers.map((member) => (
                <div
                  key={member.userId}
                  className={cn(
                    CALENDAR_GRID.column,
                    "flex flex-col items-center gap-1 px-2 py-2.5 text-center",
                    isToday && "bg-primary/[0.04]",
                  )}
                >
                  <ProfileAvatar
                    name={member.label}
                    avatarUrl={member.avatarUrl}
                    className="size-8"
                    fallbackClassName="text-[10px]"
                  />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {member.label.split(" ")[0]}
                  </span>
                  {isToday ? (
                    <span className="text-[10px] text-muted-foreground">
                      {formatShortWeekdayForDateKey(dateKey, timezone)}{" "}
                      {dayNumber}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Loading appointments…
              </div>
            ) : (
              <div className="relative" style={{ minHeight: GRID_HEIGHT }}>
                {currentTimeTop !== null ? (
                  <CalendarCurrentTimeIndicator topPx={currentTimeTop} />
                ) : null}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: gridTemplate,
                    minHeight: GRID_HEIGHT,
                  }}
                >
                  <TimeGridGutter />
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
                      onSlotClick={onSlotClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {!isLoading && appointments.length === 0 ? (
        <p
          className={cn(
            "px-4 py-3 text-center text-sm text-muted-foreground",
            CALENDAR_GRID.footer,
          )}
        >
          No appointments today. Click a time slot to create one.
        </p>
      ) : null}
    </div>
  );
}
