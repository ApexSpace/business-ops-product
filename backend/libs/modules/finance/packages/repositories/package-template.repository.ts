import { Injectable } from '@nestjs/common';
import { ClientPackageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const serviceSelect = {
  id: true,
  name: true,
  price: true,
} as const;

const serviceGroupInclude = {
  serviceGroupItems: {
    include: { service: { select: serviceSelect } },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.PackageServiceGroupInclude;

const templateInclude = {
  serviceGroups: {
    include: serviceGroupInclude,
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.PackageTemplateInclude;

export type PackageTemplateRow = Prisma.PackageTemplateGetPayload<{
  include: typeof templateInclude;
}>;

@Injectable()
export class PackageTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.PackageTemplateWhereInput,
  ): Prisma.PackageTemplateWhereInput {
    return { businessId, ...extra };
  }

  findMany(businessId: string): Promise<PackageTemplateRow[]> {
    return this.prisma.packageTemplate.findMany({
      where: this.activeWhere(businessId),
      include: templateInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<PackageTemplateRow | null> {
    return this.prisma.packageTemplate.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: templateInclude,
    });
  }

  findByIdForBusiness(
    businessId: string,
    id: string,
  ): Promise<PackageTemplateRow | null> {
    return this.findById(businessId, id);
  }

  findPublicTemplate(
    businessId: string,
    templateId: string,
  ): Promise<PackageTemplateRow | null> {
    return this.prisma.packageTemplate.findFirst({
      where: {
        businessId,
        id: templateId,
        onlineSalesEnabled: true,
      },
      include: templateInclude,
    });
  }

  findOnlineTemplates(businessId: string): Promise<PackageTemplateRow[]> {
    return this.prisma.packageTemplate.findMany({
      where: { businessId, onlineSalesEnabled: true },
      include: templateInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  create(
    businessId: string,
    data: Omit<Prisma.PackageTemplateCreateInput, 'business'>,
  ): Promise<PackageTemplateRow> {
    return this.prisma.packageTemplate.create({
      data: {
        ...data,
        business: { connect: { id: businessId } },
      },
      include: templateInclude,
    });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.PackageTemplateUpdateInput,
  ): Promise<PackageTemplateRow> {
    return this.prisma.packageTemplate.update({
      where: { id },
      data,
      include: templateInclude,
    });
  }

  async delete(businessId: string, id: string): Promise<void> {
    const row = await this.findById(businessId, id);
    if (!row) return;
    await this.prisma.packageTemplate.delete({ where: { id } });
  }

  countActiveClientPackages(
    businessId: string,
    templateId: string,
  ): Promise<number> {
    return this.prisma.clientPackage.count({
      where: {
        businessId,
        packageTemplateId: templateId,
        status: ClientPackageStatus.ACTIVE,
      },
    });
  }

  async reorder(businessId: string, orderedIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.packageTemplate.updateMany({
          where: { id, businessId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async nextSortOrder(businessId: string): Promise<number> {
    const max = await this.prisma.packageTemplate.aggregate({
      where: { businessId },
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }
}
