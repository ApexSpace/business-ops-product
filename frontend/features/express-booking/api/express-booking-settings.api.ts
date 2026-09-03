import {
  getOnlineBookingSettings,
  updateOnlineBookingPreferences,
  type OnlineBookingSettings,
} from "@/features/online-booking-settings/api/online-booking-settings.api";

export type ExpressBookingSettings = Pick<
  OnlineBookingSettings,
  | "expressBookingEnabled"
  | "expressBookingAutoEnable"
  | "expressBookingTimeLimitMinutes"
  | "expressRequireCard"
  | "expressRequireDeposit"
  | "expressDepositType"
  | "expressDepositAmount"
  | "expressAllowPhotoUpload"
  | "photoUploadPrompt"
  | "cancellationPolicyVersion"
>;

export type UpdateExpressBookingPreferencesBody = Partial<
  Pick<
    OnlineBookingSettings,
    | "expressBookingEnabled"
    | "expressBookingAutoEnable"
    | "expressBookingTimeLimitMinutes"
    | "expressRequireCard"
    | "expressRequireDeposit"
    | "expressDepositType"
    | "expressDepositAmount"
    | "expressAllowPhotoUpload"
    | "photoUploadPrompt"
  >
>;

export function getExpressBookingSettings() {
  return getOnlineBookingSettings();
}

export function updateExpressBookingPreferences(
  body: UpdateExpressBookingPreferencesBody,
) {
  return updateOnlineBookingPreferences(body);
}
