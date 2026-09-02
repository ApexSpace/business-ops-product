import type { ExpressBookingSettings } from "@/features/express-booking/api/express-booking-settings.api";

export const EXPRESS_TIME_LIMIT_OPTIONS = [
  15, 30, 60, 120, 240, 480, 1440,
] as const;

export function formatExpressTimeLimitLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return "1 hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export function formatExpressDepositLabel(
  depositType: string,
  depositAmount: string | null,
): string {
  if (depositType === "FULL") return "Full payment";
  if (depositType === "PERCENTAGE") {
    return `${depositAmount ?? "0"}% deposit`;
  }
  if (depositType === "FIXED") {
    return `$${depositAmount ?? "0"} deposit`;
  }
  return "Deposit required";
}

export function formatExpressDefaultSettingsSummary(
  settings: Pick<
    ExpressBookingSettings,
    | "expressBookingAutoEnable"
    | "expressBookingTimeLimitMinutes"
    | "expressRequireCard"
    | "expressRequireDeposit"
    | "expressDepositType"
    | "expressDepositAmount"
  >,
): string {
  const parts = [
    formatExpressTimeLimitLabel(settings.expressBookingTimeLimitMinutes),
  ];

  if (settings.expressBookingAutoEnable) {
    parts.push("Auto-enable for new appointments");
  }

  if (settings.expressRequireCard) {
    parts.push("Card required");
  }

  if (settings.expressRequireDeposit) {
    parts.push(
      formatExpressDepositLabel(
        settings.expressDepositType,
        settings.expressDepositAmount,
      ),
    );
  } else {
    parts.push("No payment required");
  }

  return parts.join(" · ");
}

export function formatExpressPhotosSummary(
  settings: Pick<
    ExpressBookingSettings,
    "expressAllowPhotoUpload" | "photoUploadPrompt"
  >,
): string {
  if (!settings.expressAllowPhotoUpload) {
    return "Photo upload disabled";
  }

  const prompt = settings.photoUploadPrompt?.trim();
  if (!prompt) {
    return "Photo upload enabled · Default prompt";
  }

  const preview =
    prompt.length > 80 ? `${prompt.slice(0, 80).trim()}…` : prompt;
  return `Photo upload enabled · ${preview}`;
}
