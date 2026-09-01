"use client";

import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { calculateEventPosition } from "@/features/calendars/utils/calendar-dates";
import {
  offsetIsoByMinutes,
  resolveAppointmentBufferMinutes,
} from "@/features/appointments/utils/resolve-appointment-buffer";

interface TimeGridBufferBandsProps {
  appointments: Appointment[];
  viewTimezone: string;
  showBufferOnCalendar: boolean;
  bufferTimeEnabled: boolean;
}

export function TimeGridBufferBands({
  appointments,
  viewTimezone,
  showBufferOnCalendar,
  bufferTimeEnabled,
}: TimeGridBufferBandsProps) {
  if (!showBufferOnCalendar || !bufferTimeEnabled) {
    return null;
  }

  return (
    <>
      {appointments.map((appointment) => {
        const { bufferBeforeMinutes, bufferAfterMinutes } =
          resolveAppointmentBufferMinutes(appointment, bufferTimeEnabled);

        const bands: Array<{ key: string; startAt: string; endAt: string }> = [];

        if (bufferBeforeMinutes > 0) {
          bands.push({
            key: `${appointment.id}-before`,
            startAt: offsetIsoByMinutes(appointment.startAt, -bufferBeforeMinutes),
            endAt: appointment.startAt,
          });
        }

        if (bufferAfterMinutes > 0) {
          bands.push({
            key: `${appointment.id}-after`,
            startAt: appointment.endAt,
            endAt: offsetIsoByMinutes(appointment.endAt, bufferAfterMinutes),
          });
        }

        return bands.map((band) => {
          const position = calculateEventPosition(
            band.startAt,
            band.endAt,
            undefined,
            undefined,
            undefined,
            undefined,
            viewTimezone,
          );

          return (
            <div
              key={band.key}
              className="pointer-events-none absolute inset-x-1 z-[5] rounded-sm border border-dashed border-[#C4B5FD] bg-[#F6F1FE]/70"
              style={{
                top: position.top,
                height: position.height,
              }}
              aria-hidden
            />
          );
        });
      })}
    </>
  );
}
