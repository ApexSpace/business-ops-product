"use client";

/**
 * Legacy section helpers — prefer drawer components for new UI.
 * Kept for `resolveAppointmentUpdatedBy` and any residual imports.
 */

import type {
  Appointment,
  AppointmentUserSummary,
} from "@/features/appointments/schemas/appointment-profile";
import { getMemberDisplayName } from "@/features/appointments/schemas/appointment-profile";

export function resolveAppointmentUpdatedBy(
  items: { action: string; actor: AppointmentUserSummary | null }[],
): string | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (
      (item.action === "appointment.updated" ||
        item.action === "appointment.status_changed") &&
      item.actor
    ) {
      return getMemberDisplayName(item.actor);
    }
  }
  return null;
}

export type { Appointment };
