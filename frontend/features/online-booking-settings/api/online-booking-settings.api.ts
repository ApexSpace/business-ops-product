import { api } from "@/lib/api/client";

import type {
  BusinessHoursResponse,
  StaffWorkScheduleResponse,
} from "@/features/business-hours/types";
import type { BusinessHoursSlot } from "@/features/business-hours/types";

export function getBusinessHours() {
  return api.get<BusinessHoursResponse>("online-booking-settings/business-hours");
}

export function updateBusinessHours(body: { slots: BusinessHoursSlot[] }) {
  return api.put<BusinessHoursResponse>(
    "online-booking-settings/business-hours",
    body,
  );
}

export function getStaffWorkSchedule(userId: string) {
  return api.get<StaffWorkScheduleResponse>(
    `online-booking-settings/staff/${userId}/work-schedule`,
  );
}

export function updateStaffWorkSchedule(
  userId: string,
  body: { useBusinessHours?: boolean; slots?: BusinessHoursSlot[] },
) {
  return api.put<StaffWorkScheduleResponse>(
    `online-booking-settings/staff/${userId}/work-schedule`,
    body,
  );
}

export interface OnlineBookingSettings {
  id: string;
  businessId: string;
  publicSlug: string | null;
  onlineBookingEnabled: boolean;
  publicBookingUrl: string | null;
  embedUrl: string | null;
  embedCode: string | null;
  overlayUrl: string | null;
  embedEnabled: boolean;
  overlayEnabled: boolean;
  minimumNoticeMinutes: number;
  maxBookingDays: number;
  avoidGapsEnabled: boolean;
  avoidGapsMaxGapMinutes: number | null;
  avoidGapsMinGapMinutes: number | null;
  avoidGapsTimeBlockMode: string;
  avoidGapsEmptyDayMode: string;
  avoidGapsMultiProviderMode: string;
  allowMultipleServices: boolean;
  allowDuplicateServices: boolean;
  singleStaffOnly: boolean;
  collectPhotosEnabled: boolean;
  photoUploadPrompt: string | null;
  waitlistEnabled: boolean;
  expressBookingEnabled: boolean;
  expressBookingAutoEnable: boolean;
  expressBookingTimeLimitMinutes: number;
  expressRequireCard: boolean;
  expressRequireDeposit: boolean;
  expressDepositType: string;
  expressDepositAmount: string | null;
  expressAllowPhotoUpload: boolean;
  cancellationPolicyVersion: string;
  randomizeStaffOrder: boolean;
  showGenderOptions: boolean;
  showAnyoneOption: boolean;
  anyoneAssignmentMode: string;
  anyoneExcludedStaffIds: string[];
  slotIntervalMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  timezone: string;
  locationType: string;
  locationValue: string | null;
  requireApproval: boolean;
  autoConfirm: boolean;
  formSettings: Record<string, unknown>;
  confirmationSettings: Record<string, unknown>;
  widgetSettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
}

export function getOnlineBookingSettings() {
  return api.get<OnlineBookingSettings>("online-booking-settings");
}

export function updateOnlineBookingSetup(body: Record<string, unknown>) {
  return api.patch<OnlineBookingSettings>("online-booking-settings/setup", body);
}

export function updateOnlineBookingPreferences(body: Record<string, unknown>) {
  return api.patch<OnlineBookingSettings>(
    "online-booking-settings/preferences",
    body,
  );
}

export function updateOnlineBookingStaffSelection(body: Record<string, unknown>) {
  return api.patch<OnlineBookingSettings>(
    "online-booking-settings/staff-selection",
    body,
  );
}
