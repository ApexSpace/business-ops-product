import type {
  AppointmentAutomatedMessageOffsetUnit,
  AppointmentAutomatedMessageTrigger,
} from "@/features/appointment-automated-messages/api/appointment-automated-messages.api";

export function formatBeforeStartLabel(
  offsetValue: number,
  offsetUnit: AppointmentAutomatedMessageOffsetUnit,
): string {
  if (offsetUnit === "DAYS") {
    if (offsetValue === 1) return "1 day before appointment";
    return `${offsetValue} days before appointment`;
  }
  if (offsetValue === 3) {
    return "Same day as appointment (~3 hours before)";
  }
  if (offsetValue === 1) return "1 hour before appointment";
  return `${offsetValue} hours before appointment`;
}

export function formatTriggerBannerLabel(
  trigger: AppointmentAutomatedMessageTrigger,
): string {
  if (trigger.kind === "IMMEDIATE") {
    return "Immediately when booked.";
  }
  if (trigger.offsetValue != null && trigger.offsetUnit) {
    return formatBeforeStartLabel(trigger.offsetValue, trigger.offsetUnit);
  }
  return "Before appointment";
}
