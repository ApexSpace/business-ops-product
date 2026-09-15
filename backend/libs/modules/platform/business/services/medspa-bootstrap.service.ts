import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { BusinessLocationStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { ChatbotsService } from '@app/modules/communications/chatbots/services/chatbots.service';

/**
 * Seeds a new MedSpa business with essential defaults.
 * Replaces SnapshotApply for the MedSpa-only product — no niche/snapshot selection.
 */
@Injectable()
export class MedSpaBootstrapService {
  private readonly logger = new Logger(MedSpaBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatbotsService))
    private readonly chatbotsService: ChatbotsService,
  ) {}

  async apply(
    businessId: string,
    opts?: {
      name?: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zip?: string | null;
      timezone?: string | null;
    },
  ): Promise<void> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
    });
    if (!business) {
      return;
    }

    await this.ensurePrimaryLocation(businessId, {
      name: opts?.name ?? business.name,
      address: opts?.address ?? business.address,
      city: opts?.city ?? business.city,
      state: opts?.state ?? business.state,
      country: opts?.country ?? business.country,
      zip: opts?.zip ?? business.zip,
      timezone: opts?.timezone ?? business.timezone,
    });

    await this.ensureDefaultPipeline(businessId);
    await this.ensureDefaultTags(businessId);
    await this.ensureDefaultCalendar(businessId, business.timezone);
    await this.chatbotsService.ensureDefaultChatbot(businessId);

    // Mark as bootstrapped without requiring a Snapshot row
    if (!business.snapshotAppliedAt) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: { snapshotAppliedAt: new Date() },
      });
    }

    this.logger.log(`MedSpa bootstrap applied for business ${businessId}`);
  }

  private async ensurePrimaryLocation(
    businessId: string,
    profile: {
      name: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zip?: string | null;
      timezone?: string | null;
    },
  ) {
    const existing = await this.prisma.businessLocation.findFirst({
      where: { businessId, isPrimary: true },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.businessLocation.create({
      data: {
        businessId,
        name: profile.name || 'Main location',
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        zip: profile.zip,
        timezone: profile.timezone,
        status: BusinessLocationStatus.ACTIVE,
        isPrimary: true,
      },
    });
  }

  private async ensureDefaultPipeline(businessId: string) {
    const count = await this.prisma.pipeline.count({
      where: { businessId },
    });
    if (count > 0) {
      return;
    }

    await this.prisma.pipeline.create({
      data: {
        businessId,
        name: 'Sales',
        isDefault: true,
        stages: {
          create: [
            { businessId, name: 'New lead', type: 'OPEN', position: 0 },
            {
              businessId,
              name: 'Consultation booked',
              type: 'OPEN',
              position: 1,
            },
            { businessId, name: 'Won', type: 'WON', position: 2 },
            { businessId, name: 'Lost', type: 'LOST', position: 3 },
          ],
        },
      },
    });
  }

  private async ensureDefaultTags(businessId: string) {
    const count = await this.prisma.tag.count({
      where: { businessId },
    });
    if (count > 0) {
      return;
    }

    const tags = ['VIP', 'New client', 'Membership'];
    await this.prisma.tag.createMany({
      data: tags.map((name) => ({ businessId, name })),
    });
  }

  private async ensureDefaultCalendar(
    businessId: string,
    timezone?: string | null,
  ) {
    const count = await this.prisma.calendar.count({
      where: { businessId, deletedAt: null },
    });
    if (count > 0) {
      return;
    }

    await this.prisma.calendar.create({
      data: {
        businessId,
        name: 'Main calendar',
        timezone: timezone || 'America/New_York',
      },
    });
  }
}
