import { Injectable } from '@nestjs/common';
import {
  BusinessCancelRescheduleSettings,
  Prisma,
  SelfCancellationMode,
  SelfRescheduleMode,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  DEFAULT_LATE_CANCELLATION_HOURS,
  DEFAULT_ONLINE_BOOKING_GRACE_MINUTES,
} from '../utils/cancel-reschedule-behavior.util';

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

@Injectable()
export class CancelRescheduleSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(
    businessId: string,
  ): Promise<BusinessCancelRescheduleSettings | null> {
    return this.prisma.businessCancelRescheduleSettings.findUnique({
      where: { businessId },
    });
  }

  async ensureSettings(
    businessId: string,
  ): Promise<BusinessCancelRescheduleSettings> {
    const existing = await this.findByBusinessId(businessId);
    if (existing) {
      return existing;
    }

    const onlineBooking =
      await this.prisma.businessOnlineBookingSettings.findUnique({
        where: { businessId },
      });
    const formSettings = readJsonRecord(onlineBooking?.formSettings);
    const policyText =
      typeof formSettings.cancellationPolicyText === 'string'
        ? formSettings.cancellationPolicyText
        : null;

    return this.prisma.businessCancelRescheduleSettings.create({
      data: {
        businessId,
        cancellationPolicyHtml: policyText,
        requirePolicyAgreement: Boolean(formSettings.requirePolicyAgreement),
        selfCancellationMode: SelfCancellationMode.DISABLED,
        selfCancellationMinutes: DEFAULT_ONLINE_BOOKING_GRACE_MINUTES,
        selfCancellationHoursBefore: DEFAULT_LATE_CANCELLATION_HOURS,
        selfRescheduleMode: SelfRescheduleMode.DISABLED,
        selfRescheduleHoursBefore: DEFAULT_LATE_CANCELLATION_HOURS,
        lateCancellationHoursBefore: DEFAULT_LATE_CANCELLATION_HOURS,
      },
    });
  }

  upsert(
    businessId: string,
    data: Prisma.BusinessCancelRescheduleSettingsUpdateInput,
  ): Promise<BusinessCancelRescheduleSettings> {
    return this.prisma.businessCancelRescheduleSettings.update({
      where: { businessId },
      data,
    });
  }
}
