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
import { isTodayDateKey } from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import {
  CALENDAR_FIGMA_STAFF_COL_MIN_PX,
  CALENDAR_FIGMA_TIME_GUTTER_PX,
} from "@/features/calendars/styles/calendar-figma";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
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
  businessHoursSlots?: BusinessHoursSlot[];
  staffSlotsByUserId?: Map<string, BusinessHoursSlot[] | null>;
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
  businessHoursSlots,
  staffSlotsByUserId,
  onSlotClick,
}: StaffDayCalendarViewProps) {
  const isToday = isTodayDateKey(dateKey, timezone);
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, [dateKey]);
  const columnCount = Math.max(staffMembers.length, 1);
  const gridTemplate = `${CALENDAR_FIGMA_TIME_GUTTER_PX}px repeat(${columnCount}, minmax(${CALENDAR_FIGMA_STAFF_COL_MIN_PX}px, 1fr))`;
  const minWidth = CALENDAR_FIGMA_TIME_GUTTER_PX + columnCount * CALENDAR_FIGMA_STAFF_COL_MIN_PX;

  return (
    <div className={cn("overflow-hidden bg-white", CALENDAR_GRID.card, className)}>
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <div className="max-h-[min(75vh,844px)] overflow-auto">
            <div
              className={cn(
                "sticky top-0 z-30 grid",
                CALENDAR_GRID.headerRow,
              )}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="w-20 shrink-0" aria-hidden />
              {staffMembers.map((member) => (
                <div
                  key={member.userId}
                  className={cn(
                    CALENDAR_GRID.column,
                    "flex h-12 items-center gap-2 px-3 py-2 sm:h-14 sm:gap-2.5 sm:px-4",
                    isToday && "bg-[#F6F1FE]",
                  )}
                >
                  <ProfileAvatar
                    name={member.label}
                    avatarUrl={member.avatarUrl}
                    className="size-7 shrink-0 sm:size-8"
                    fallbackClassName="bg-[#D1D1D1] text-[10px] font-semibold text-[#6B6B6B]"
                  />
                  <span className="min-w-0 truncate text-xs font-semibold text-black-secondary-normal sm:text-sm">
                    {member.label}
                  </span>
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-grey-tertiary-normal">
                Loading appointments…
              </div>
            ) : (
              <div
                className="relative overflow-hidden"
                style={{ minHeight: GRID_HEIGHT }}
              >
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
      {!isLoading && appointments.length === 0 ? (
        <p
          className={cn(
            "px-4 py-3 text-center text-sm text-grey-tertiary-normal",
            CALENDAR_GRID.footer,
          )}
        >
          No appointments today. Click a time slot to create one.
        </p>
      ) : null}
    </div>
  );
}
