import type { Appointment } from "@/features/appointments/schemas/appointment-profile";

export function resolveAppointmentBufferMinutes(
  appointment: Appointment,
  bufferTimeEnabled: boolean,
): { bufferBeforeMinutes: number; bufferAfterMinutes: number } {
  if (!bufferTimeEnabled || appointment.isTimeBlock) {
    return { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 };
  }

  const line = appointment.services?.[0];
  const service = line?.service;
  if (!service?.hasBufferTime) {
    return { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 };
  }

  return {
    bufferBeforeMinutes: service.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: service.bufferAfterMinutes ?? 0,
  };
}

export function offsetIsoByMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}
