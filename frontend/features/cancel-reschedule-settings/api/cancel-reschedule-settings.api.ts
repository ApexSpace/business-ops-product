import { api } from "@/lib/api/client";

export type SelfCancellationMode =
  | "DISABLED"
  | "WITHIN_MINUTES_OF_ONLINE_BOOKING"
  | "UNTIL_HOURS_BEFORE_APPOINTMENT";

export type SelfRescheduleMode = "DISABLED" | "UNTIL_HOURS_BEFORE_APPOINTMENT";

export interface CancelRescheduleSettings {
  cancellationPolicyHtml: string | null;
  cancellationPolicySms: string | null;
  requirePolicyAgreement: boolean;
  selfCancellationMode: SelfCancellationMode;
  selfCancellationMinutes: number;
  selfCancellationHoursBefore: number;
  selfRescheduleMode: SelfRescheduleMode;
  selfRescheduleHoursBefore: number;
  lateCancellationHoursBefore: number;
}

export type UpdateCancellationPolicyBody = Partial<{
  cancellationPolicyHtml: string | null;
  cancellationPolicySms: string | null;
  requirePolicyAgreement: boolean;
}>;

export type UpdateSelfServiceBody = {
  selfCancellationMode: SelfCancellationMode;
  selfCancellationMinutes?: number;
  selfCancellationHoursBefore?: number;
  selfRescheduleMode: SelfRescheduleMode;
  selfRescheduleHoursBefore?: number;
};

export type UpdateLateCancellationBody = {
  lateCancellationHoursBefore: number;
};

export function getCancelRescheduleSettings() {
  return api.get<CancelRescheduleSettings>("cancel-reschedule-settings");
}

export function updateCancellationPolicy(body: UpdateCancellationPolicyBody) {
  return api.patch<CancelRescheduleSettings>(
    "cancel-reschedule-settings/cancellation-policy",
    body,
  );
}

export function updateSelfServiceSettings(body: UpdateSelfServiceBody) {
  return api.patch<CancelRescheduleSettings>(
    "cancel-reschedule-settings/self-service",
    body,
  );
}

export function updateLateCancellation(body: UpdateLateCancellationBody) {
  return api.patch<CancelRescheduleSettings>(
    "cancel-reschedule-settings/late-cancellation",
    body,
  );
}
