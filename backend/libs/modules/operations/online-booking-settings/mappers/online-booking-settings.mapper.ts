import { BusinessOnlineBookingSettings } from '@prisma/client';
import { OnlineBookingSettingsResponseDto } from '../dto/online-booking-settings.dto';

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

export function toOnlineBookingSettingsResponse(params: {
  settings: BusinessOnlineBookingSettings;
  publicBookingUrl: string | null;
  embedUrl: string | null;
  embedCode: string | null;
  overlayUrl: string | null;
}): OnlineBookingSettingsResponseDto {
  const { settings } = params;
  return {
    id: settings.id,
    businessId: settings.businessId,
    publicSlug: settings.publicSlug,
    onlineBookingEnabled: settings.onlineBookingEnabled,
    publicBookingUrl: params.publicBookingUrl,
    embedUrl: params.embedUrl,
    embedCode: params.embedCode,
    overlayUrl: params.overlayUrl,
    embedEnabled: settings.embedEnabled,
    overlayEnabled: settings.overlayEnabled,
    minimumNoticeMinutes: settings.minimumNoticeMinutes,
    maxBookingDays: settings.maxBookingDays,
    avoidGapsEnabled: settings.avoidGapsEnabled,
    avoidGapsMaxGapMinutes: settings.avoidGapsMaxGapMinutes,
    avoidGapsMinGapMinutes: settings.avoidGapsMinGapMinutes,
    avoidGapsTimeBlockMode: settings.avoidGapsTimeBlockMode,
    avoidGapsEmptyDayMode: settings.avoidGapsEmptyDayMode,
    avoidGapsMultiProviderMode: settings.avoidGapsMultiProviderMode,
    allowMultipleServices: settings.allowMultipleServices,
    allowDuplicateServices: settings.allowDuplicateServices,
    singleStaffOnly: settings.singleStaffOnly,
    collectPhotosEnabled: settings.collectPhotosEnabled,
    photoUploadPrompt: settings.photoUploadPrompt,
    waitlistEnabled: settings.waitlistEnabled,
    expressBookingEnabled: settings.expressBookingEnabled,
    expressBookingAutoEnable: settings.expressBookingAutoEnable,
    expressBookingTimeLimitMinutes: settings.expressBookingTimeLimitMinutes,
    expressRequireCard: settings.expressRequireCard,
    expressRequireDeposit: settings.expressRequireDeposit,
    expressDepositType: settings.expressDepositType,
    expressDepositAmount:
      settings.expressDepositAmount != null
        ? String(settings.expressDepositAmount)
        : null,
    expressAllowPhotoUpload: settings.expressAllowPhotoUpload,
    cancellationPolicyVersion: settings.cancellationPolicyVersion,
    randomizeStaffOrder: settings.randomizeStaffOrder,
    showGenderOptions: settings.showGenderOptions,
    showAnyoneOption: settings.showAnyoneOption,
    anyoneAssignmentMode: settings.anyoneAssignmentMode,
    anyoneExcludedStaffIds: readStringArray(settings.anyoneExcludedStaffIds),
    slotIntervalMinutes: settings.slotIntervalMinutes,
    bufferBeforeMinutes: settings.bufferBeforeMinutes,
    bufferAfterMinutes: settings.bufferAfterMinutes,
    timezone: settings.timezone,
    locationType: settings.locationType,
    locationValue: settings.locationValue,
    requireApproval: settings.requireApproval,
    autoConfirm: settings.autoConfirm,
    formSettings: readJsonRecord(settings.formSettings),
    confirmationSettings: readJsonRecord(settings.confirmationSettings),
    widgetSettings: readJsonRecord(settings.widgetSettings),
    notificationSettings: readJsonRecord(settings.notificationSettings),
  };
}
