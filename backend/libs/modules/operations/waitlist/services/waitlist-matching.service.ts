import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { BookingWaitlistStatus, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { PublicBookingService } from '@app/modules/operations/public-booking/services/public-booking.service';
import { OnlineBookingSettingsRepository } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import { NotificationDispatchService } from '@app/modules/communications/notifications/services/notification-dispatch.service';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';
import {
  WaitlistRepository,
  type WaitlistEntryWithRelations,
} from '../repositories/waitlist.repository';
import {
  parseWaitlistMetadata,
  type WaitlistEntryMetadata,
} from '../utils/waitlist-metadata.util';
import { filterSlotsByTimePreferences } from '../utils/waitlist-time-preferences.util';

@Injectable()
export class WaitlistMatchingService {
  private readonly logger = new Logger(WaitlistMatchingService.name);

  constructor(
    private readonly waitlistRepository: WaitlistRepository,
    @Inject(forwardRef(() => PublicBookingService))
    private readonly publicBookingService: PublicBookingService,
    private readonly settingsRepository: OnlineBookingSettingsRepository,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly membershipRepository: BusinessMembershipRepository,
  ) {}

  async recheckOnCalendarMutation(params: {
    businessId: string;
    staffId?: string;
    dateKey?: string;
  }): Promise<void> {
    const preferredDate = params.dateKey
      ? new Date(`${params.dateKey}T00:00:00.000Z`)
      : undefined;

    const entries = await this.waitlistRepository.findWaitingForRecheck({
      businessId: params.businessId,
      staffId: params.staffId,
      preferredDate,
    });

    for (const entry of entries) {
      try {
        await this.recheckEntry(entry);
      } catch (err) {
        this.logger.warn(
          `Waitlist recheck failed for entry ${entry.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  async recheckEntry(entry: WaitlistEntryWithRelations): Promise<void> {
    if (
      entry.status !== BookingWaitlistStatus.WAITING &&
      entry.status !== BookingWaitlistStatus.MATCHED
    ) {
      return;
    }

    const metadata = parseWaitlistMetadata(entry.metadata);
    const serviceLines =
      metadata.serviceLines?.length
        ? metadata.serviceLines
        : [{ serviceId: entry.serviceId, staffId: entry.staffId }];

    const preferredDate = entry.preferredDate.toISOString().slice(0, 10);
    const days = await this.publicBookingService.findSlotsForWaitlistEntry({
      businessId: entry.businessId,
      serviceLines,
      preferredDate,
    });

    const context = await this.settingsRepository.findBookingContextByBusinessId(
      entry.businessId,
    );
    const timezone = resolveBookingTimezone(
      context?.timezone,
      context?.business.timezone,
    );

    const daySlots =
      days.find((day) => day.date === preferredDate)?.slots ?? [];
    const availableSlots = daySlots.filter((slot) => slot.available);
    const matchedSlots = filterSlotsByTimePreferences(
      availableSlots,
      {
        preferredMorning: entry.preferredMorning,
        preferredAfternoon: entry.preferredAfternoon,
        preferredEvening: entry.preferredEvening,
      },
      timezone,
    );

    const previousMetadata = parseWaitlistMetadata(entry.metadata);
    const hadMatch = (previousMetadata.matchedOpenings?.length ?? 0) > 0;
    const hasMatch = matchedSlots.length > 0;

    if (!hasMatch) {
      if (entry.status === BookingWaitlistStatus.MATCHED) {
        await this.waitlistRepository.updateIfOpen(entry.id, {
          status: BookingWaitlistStatus.WAITING,
          metadata: {
            ...previousMetadata,
            matchedOpenings: [],
            matchedAt: undefined,
          } as unknown as Prisma.InputJsonValue,
        });
      }
      return;
    }

    const nextMetadata: WaitlistEntryMetadata = {
      ...previousMetadata,
      serviceLines,
      matchedOpenings: matchedSlots,
      matchedAt: new Date().toISOString(),
    };

    const updated = await this.waitlistRepository.updateIfOpen(entry.id, {
      status: BookingWaitlistStatus.MATCHED,
      metadata: nextMetadata as unknown as Prisma.InputJsonValue,
    });

    if (!updated) {
      return;
    }

    if (!hadMatch) {
      void this.notifyStaffOpeningAvailable(updated).catch(() => undefined);
    }
  }

  private async notifyStaffOpeningAvailable(
    entry: WaitlistEntryWithRelations,
  ): Promise<void> {
    const context = await this.settingsRepository.findBookingContextByBusinessId(
      entry.businessId,
    );
    if (!context) return;

    const contactName = [entry.contact.firstName, entry.contact.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const preferredDate = DateTime.fromJSDate(entry.preferredDate, {
      zone: resolveBookingTimezone(context.timezone, context.business.timezone),
    }).toFormat('cccc, LLL d, yyyy');

    const members = await this.membershipRepository.findOwnersAndAdmins(
      entry.businessId,
    );

    for (const member of members) {
      void this.notificationDispatch
        .dispatch({
          businessId: entry.businessId,
          notificationKey: 'booking.waitlist_opening_available',
          toEmail: member.user.email,
          toPhone: null,
          userId: member.userId,
          entityType: 'BookingWaitlistEntry',
          entityId: entry.id,
          fromName: context.business.name,
          idempotencyKey: `waitlist-opening-${entry.id}-${member.userId}`,
          missingRecipient: 'skip',
          variables: {
            'business.name': context.business.name,
            'contact.name': contactName,
            'waitlist.service_name': entry.service.name,
            'waitlist.preferred_date': preferredDate,
            'waitlist.staff_name': entry.staff
              ? [entry.staff.firstName, entry.staff.lastName]
                  .filter(Boolean)
                  .join(' ')
              : 'Anyone',
          },
        })
        .catch(() => undefined);
    }
  }
}
