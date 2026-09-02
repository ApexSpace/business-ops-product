import type { BusinessCancelRescheduleSettings } from '@prisma/client';
import { CancelRescheduleSettingsResponseDto } from '../dto/cancel-reschedule-settings.dto';

export function toCancelRescheduleSettingsResponse(
  settings: BusinessCancelRescheduleSettings,
): CancelRescheduleSettingsResponseDto {
  return {
    cancellationPolicyHtml: settings.cancellationPolicyHtml,
    cancellationPolicySms: settings.cancellationPolicySms,
    requirePolicyAgreement: settings.requirePolicyAgreement,
    selfCancellationMode: settings.selfCancellationMode,
    selfCancellationMinutes: settings.selfCancellationMinutes,
    selfCancellationHoursBefore: settings.selfCancellationHoursBefore,
    selfRescheduleMode: settings.selfRescheduleMode,
    selfRescheduleHoursBefore: settings.selfRescheduleHoursBefore,
    lateCancellationHoursBefore: settings.lateCancellationHoursBefore,
  };
}
