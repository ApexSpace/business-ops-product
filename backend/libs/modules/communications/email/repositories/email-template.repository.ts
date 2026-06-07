import { Injectable } from '@nestjs/common';
import { EmailTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class EmailTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusiness(businessId: string): Promise<EmailTemplate[]> {
    return this.prisma.emailTemplate.findMany({
      where: { businessId },
      orderBy: { emailType: 'asc' },
    });
  }

  findByBusinessAndType(
    businessId: string,
    emailType: string,
  ): Promise<EmailTemplate | null> {
    return this.prisma.emailTemplate.findUnique({
      where: { businessId_emailType: { businessId, emailType } },
    });
  }

  upsert(
    businessId: string,
    emailType: string,
    data: {
      subject: string;
      htmlBody: string;
      textBody?: string | null;
      updatedByUserId?: string;
      createdByUserId?: string;
    },
  ): Promise<EmailTemplate> {
    return this.prisma.emailTemplate.upsert({
      where: { businessId_emailType: { businessId, emailType } },
      create: {
        businessId,
        emailType,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody ?? null,
        createdByUserId: data.createdByUserId ?? data.updatedByUserId ?? null,
        updatedByUserId: data.updatedByUserId ?? null,
      },
      update: {
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody ?? null,
        updatedByUserId: data.updatedByUserId ?? null,
      },
    });
  }

  deleteByBusinessAndType(
    businessId: string,
    emailType: string,
  ): Promise<void> {
    return this.prisma.emailTemplate
      .deleteMany({ where: { businessId, emailType } })
      .then(() => undefined);
  }
}
