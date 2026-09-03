import { Injectable } from '@nestjs/common';
import {
  BusinessCheckoutAdvancedSettings,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { DEFAULT_CHECKOUT_ADVANCED_SETTINGS } from '../constants/default-checkout-advanced-settings';

@Injectable()
export class CheckoutAdvancedSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(
    businessId: string,
  ): Promise<BusinessCheckoutAdvancedSettings | null> {
    return this.prisma.businessCheckoutAdvancedSettings.findUnique({
      where: { businessId },
    });
  }

  ensureSettings(
    businessId: string,
  ): Promise<BusinessCheckoutAdvancedSettings> {
    return this.prisma.businessCheckoutAdvancedSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        ...DEFAULT_CHECKOUT_ADVANCED_SETTINGS,
      },
      update: {},
    });
  }

  update(
    businessId: string,
    data: Prisma.BusinessCheckoutAdvancedSettingsUpdateInput,
  ): Promise<BusinessCheckoutAdvancedSettings> {
    return this.prisma.businessCheckoutAdvancedSettings.update({
      where: { businessId },
      data,
    });
  }
}
