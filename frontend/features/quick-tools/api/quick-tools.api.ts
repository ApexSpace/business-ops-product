import { api } from "@/lib/api/client";

export type QuickToolsDateRangeBody = {
  staffUserIds: string[];
  fromDate: string;
  toDate?: string;
};

export type SetNotWorkingBody = QuickToolsDateRangeBody & {
  reason?: string;
};

export type QuickToolsSkippedDate = {
  userId: string;
  date: string;
  reason: string;
};

export type QuickToolsAppointmentsByStaff = {
  userId: string;
  count: number;
};

export type SetNotWorkingPreview = {
  daysAffected: number;
  exceptionsToCreate: number;
  skipped: QuickToolsSkippedDate[];
  appointmentCount: number;
  appointmentsByStaff: QuickToolsAppointmentsByStaff[];
};

export type SetNotWorkingApplyResult = {
  daysAffected: number;
  exceptionsCreated: number;
  skippedCount: number;
};

export type RemoveNotWorkingPreview = {
  daysAffected: number;
  exceptionsToRemove: number;
  appointmentCount: number;
  appointmentsByStaff: QuickToolsAppointmentsByStaff[];
};

export type RemoveNotWorkingApplyResult = {
  daysAffected: number;
  exceptionsRemoved: number;
};

export function previewSetNotWorking(body: SetNotWorkingBody) {
  return api.post<SetNotWorkingPreview>(
    "quick-tools/set-not-working/preview",
    body,
  );
}

export function applySetNotWorking(body: SetNotWorkingBody) {
  return api.post<SetNotWorkingApplyResult>(
    "quick-tools/set-not-working",
    body,
  );
}

export function previewRemoveNotWorking(body: QuickToolsDateRangeBody) {
  return api.post<RemoveNotWorkingPreview>(
    "quick-tools/remove-not-working/preview",
    body,
  );
}

export function applyRemoveNotWorking(body: QuickToolsDateRangeBody) {
  return api.post<RemoveNotWorkingApplyResult>(
    "quick-tools/remove-not-working",
    body,
  );
}
