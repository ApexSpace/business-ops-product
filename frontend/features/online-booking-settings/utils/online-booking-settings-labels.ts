import type { OnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";

export function formatBookingWindowSummary(
  settings: Pick<
    OnlineBookingSettings,
    "maxBookingDays" | "minimumNoticeMinutes"
  >,
): string {
  return `Maximum advance booking (${settings.maxBookingDays} days); Minimum prior time required (${settings.minimumNoticeMinutes} minutes)`;
}

export function formatAvoidGapsSummary(
  settings: Pick<OnlineBookingSettings, "avoidGapsEnabled">,
): string {
  return settings.avoidGapsEnabled
    ? "Avoid gaps between appointments (On)"
    : "Avoid gaps between appointments (Off)";
}

export function formatCollectPhotosSummary(
  settings: Pick<
    OnlineBookingSettings,
    "collectPhotosEnabled" | "photoUploadPrompt"
  >,
): string {
  const enabled = settings.collectPhotosEnabled ? "Yes" : "No";
  const prompt = settings.photoUploadPrompt?.trim();
  if (!settings.collectPhotosEnabled) {
    return `Enabled: ${enabled}`;
  }
  return prompt
    ? `Enabled: ${enabled}; Photo upload prompt: ${prompt}`
    : `Enabled: ${enabled}`;
}

export function formatAnyoneAssignmentModeLabel(mode: string): string {
  return mode === "ORDER" ? "By staff order" : "Randomly";
}

export function formatAnyoneAssignmentsSummary(
  settings: Pick<
    OnlineBookingSettings,
    "anyoneAssignmentMode" | "anyoneExcludedStaffIds"
  >,
  staffLabelsById: Map<string, string>,
): string {
  const mode = formatAnyoneAssignmentModeLabel(settings.anyoneAssignmentMode);
  const excluded = settings.anyoneExcludedStaffIds ?? [];
  const excludedLabel =
    excluded.length === 0
      ? "—"
      : excluded
          .map((id) => staffLabelsById.get(id) ?? id)
          .join(", ");
  return `Assign staff members: ${mode}; Excluded staff members: ${excludedLabel}`;
}
