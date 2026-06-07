import { Injectable } from '@nestjs/common';
import { BusinessEmailPreference } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class BusinessEmailPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusiness(businessId: string): Promise<BusinessEmailPreference[]> {
    return this.prisma.businessEmailPreference.findMany({
      where: { businessId },
      orderBy: { emailType: 'asc' },
    });
  }

  findByBusinessAndType(
    businessId: string,
    emailType: string,
  ): Promise<BusinessEmailPreference | null> {
    return this.prisma.businessEmailPreference.findUnique({
      where: { businessId_emailType: { businessId, emailType } },
    });
  }

  upsert(
    businessId: string,
    emailType: string,
    enabled: boolean,
  ): Promise<BusinessEmailPreference> {
    return this.prisma.businessEmailPreference.upsert({
      where: { businessId_emailType: { businessId, emailType } },
      create: { businessId, emailType, enabled },
      update: { enabled },
    });
  }

  upsertMany(
    businessId: string,
    items: { emailType: string; enabled: boolean }[],
  ): Promise<BusinessEmailPreference[]> {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.businessEmailPreference.upsert({
          where: {
            businessId_emailType: {
              businessId,
              emailType: item.emailType,
            },
          },
          create: {
            businessId,
            emailType: item.emailType,
            enabled: item.enabled,
          },
          update: { enabled: item.enabled },
        }),
      ),
    );
  }

  deleteByBusinessAndType(
    businessId: string,
    emailType: string,
  ): Promise<void> {
    return this.prisma.businessEmailPreference
      .deleteMany({ where: { businessId, emailType } })
      .then(() => undefined);
  }
}
