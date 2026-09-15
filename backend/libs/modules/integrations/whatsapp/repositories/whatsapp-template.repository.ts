import { Injectable } from '@nestjs/common';
import {
  Prisma,
  WhatsAppMessageTemplate,
  WhatsAppTemplateCategory,
  WhatsAppTemplateStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export interface WhatsAppTemplateListFilters {
  skip: number;
  take: number;
  wabaId: string;
  search?: string;
  status?: WhatsAppTemplateStatus;
  category?: WhatsAppTemplateCategory;
  sortBy: 'name' | 'updatedAt' | 'createdAt' | 'status';
  sortDir: 'asc' | 'desc';
}

@Injectable()
export class WhatsAppTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    businessId: string,
    filters: WhatsAppTemplateListFilters,
  ): Promise<{ items: WhatsAppMessageTemplate[]; total: number }> {
    const where = this.buildWhere(businessId, filters);

    return Promise.all([
      this.prisma.whatsAppMessageTemplate.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { [filters.sortBy]: filters.sortDir },
      }),
      this.prisma.whatsAppMessageTemplate.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findApproved(
    businessId: string,
    wabaId: string,
  ): Promise<WhatsAppMessageTemplate[]> {
    return this.prisma.whatsAppMessageTemplate.findMany({
      where: {
        businessId,
        wabaId,
        status: 'APPROVED',
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<WhatsAppMessageTemplate | null> {
    return this.prisma.whatsAppMessageTemplate.findFirst({
      where: { id, businessId },
    });
  }

  findByNameLanguage(
    businessId: string,
    wabaId: string,
    name: string,
    language: string,
  ): Promise<WhatsAppMessageTemplate | null> {
    return this.prisma.whatsAppMessageTemplate.findFirst({
      where: {
        businessId,
        wabaId,
        name,
        language,
      },
    });
  }

  create(data: {
    businessId: string;
    wabaId: string;
    name: string;
    language: string;
    category: WhatsAppTemplateCategory;
    status?: WhatsAppTemplateStatus;
    parameterFormat?: string;
    metaTemplateId?: string | null;
    components: Prisma.InputJsonValue;
    bodyPreview?: string | null;
    rejectionReason?: string | null;
    qualityScore?: Prisma.InputJsonValue;
    submittedAt?: Date | null;
    lastSyncedAt?: Date | null;
    createdByUserId?: string | null;
  }): Promise<WhatsAppMessageTemplate> {
    return this.prisma.whatsAppMessageTemplate.create({ data });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.WhatsAppMessageTemplateUpdateInput,
  ): Promise<WhatsAppMessageTemplate> {
    return this.prisma.whatsAppMessageTemplate.update({
      where: { id },
      data,
    });
  }

  upsertByNameLanguage(data: {
    businessId: string;
    wabaId: string;
    name: string;
    language: string;
    category: WhatsAppTemplateCategory;
    status: WhatsAppTemplateStatus;
    parameterFormat: string;
    metaTemplateId: string | null;
    components: Prisma.InputJsonValue;
    bodyPreview: string | null;
    rejectionReason: string | null;
    qualityScore?: Prisma.InputJsonValue;
    lastSyncedAt?: Date | null;
  }): Promise<WhatsAppMessageTemplate> {
    return this.prisma.whatsAppMessageTemplate.upsert({
      where: {
        businessId_name_language: {
          businessId: data.businessId,
          name: data.name,
          language: data.language,
        },
      },
      create: {
        ...data,
        submittedAt: data.lastSyncedAt ?? new Date(),
      },
      update: {
        wabaId: data.wabaId,
        category: data.category,
        status: data.status,
        parameterFormat: data.parameterFormat,
        metaTemplateId: data.metaTemplateId,
        components: data.components,
        bodyPreview: data.bodyPreview,
        rejectionReason: data.rejectionReason,
        qualityScore: data.qualityScore,
        lastSyncedAt: data.lastSyncedAt ?? new Date(),
      },
    });
  }

  delete(businessId: string, id: string): Promise<void> {
    return this.prisma.whatsAppMessageTemplate
      .delete({ where: { id } })
      .then(() => undefined);
  }

  deleteOtherWabas(businessId: string, keepWabaId: string): Promise<number> {
    return this.prisma.whatsAppMessageTemplate
      .deleteMany({
        where: {
          businessId,
          wabaId: { not: keepWabaId },
        },
      })
      .then((result) => result.count);
  }

  deleteByWabaExcept(
    businessId: string,
    wabaId: string,
    keep: Array<{ name: string; language: string }>,
  ): Promise<number> {
    const keepKeys = new Set(
      keep.map((item) => `${item.name}:${item.language}`),
    );

    return this.prisma.whatsAppMessageTemplate
      .findMany({
        where: { businessId, wabaId },
        select: { id: true, name: true, language: true },
      })
      .then((rows) => {
        const deleteIds = rows
          .filter((row) => !keepKeys.has(`${row.name}:${row.language}`))
          .map((row) => row.id);

        if (deleteIds.length === 0) {
          return 0;
        }

        return this.prisma.whatsAppMessageTemplate
          .deleteMany({ where: { id: { in: deleteIds } } })
          .then((result) => result.count);
      });
  }

  updateStatusByWebhook(input: {
    wabaId: string;
    name: string;
    language: string;
    status: WhatsAppTemplateStatus;
    rejectionReason: string | null;
    metaTemplateId: string | null;
  }): Promise<number> {
    return this.prisma.whatsAppMessageTemplate
      .updateMany({
        where: {
          wabaId: input.wabaId,
          name: input.name,
          language: input.language,
        },
        data: {
          status: input.status,
          rejectionReason: input.rejectionReason,
          metaTemplateId: input.metaTemplateId ?? undefined,
          lastSyncedAt: new Date(),
        },
      })
      .then((result) => result.count);
  }

  private buildWhere(
    businessId: string,
    filters: WhatsAppTemplateListFilters,
  ): Prisma.WhatsAppMessageTemplateWhereInput {
    const where: Prisma.WhatsAppMessageTemplateWhereInput = {
      businessId,
      wabaId: filters.wabaId,
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bodyPreview: { contains: search, mode: 'insensitive' } },
        { language: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
