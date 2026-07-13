import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Service,
  ServiceCategory,
  ServiceOnlineBookingSettings,
  ServiceOptionGroup,
  ServiceProductUsage,
  ServiceResourceRequirement,
  ServiceStaff,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const workspaceInclude = {
  category: true,
  onlineBookingSettings: { include: { calendar: true } },
  staffAssignments: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  resourceRequirements: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      resource: {
        select: { id: true, name: true, resourceType: true, status: true },
      },
    },
  },
  productUsages: { orderBy: { sortOrder: 'asc' as const } },
  optionGroups: {
    orderBy: { sortOrder: 'asc' as const },
    include: { options: { orderBy: { sortOrder: 'asc' as const } } },
  },
} satisfies Prisma.ServiceInclude;

export type ServiceWorkspaceEntity = Prisma.ServiceGetPayload<{
  include: typeof workspaceInclude;
}>;

export type ServiceTreeCategory = ServiceCategory & {
  services: Pick<Service, 'id' | 'name' | 'status' | 'isDemo' | 'sortOrder'>[];
};

@Injectable()
export class ServiceWorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkspace(
    businessId: string,
    serviceId: string,
  ): Promise<ServiceWorkspaceEntity | null> {
    return this.prisma.service.findFirst({
      where: { businessId, id: serviceId, deletedAt: null },
      include: workspaceInclude,
    });
  }

  findTree(businessId: string): Promise<ServiceTreeCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: { businessId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        services: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            status: true,
            isDemo: true,
            sortOrder: true,
          },
        },
      },
    });
  }

  async nextServiceSortOrder(
    businessId: string,
    categoryId: string,
  ): Promise<number> {
    const max = await this.prisma.service.aggregate({
      where: { businessId, categoryId, deletedAt: null },
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  createOnlineBookingSettings(
    businessId: string,
    serviceId: string,
  ): Promise<ServiceOnlineBookingSettings> {
    return this.prisma.serviceOnlineBookingSettings.create({
      data: { businessId, serviceId },
    });
  }

  upsertOnlineBookingSettings(
    businessId: string,
    serviceId: string,
    data: Prisma.ServiceOnlineBookingSettingsUpdateInput,
  ): Promise<ServiceOnlineBookingSettings> {
    return this.prisma.serviceOnlineBookingSettings.upsert({
      where: { serviceId },
      create: {
        businessId,
        serviceId,
        onlineBookingEnabled: true,
      },
      update: data,
    });
  }

  replaceStaff(
    businessId: string,
    serviceId: string,
    rows: Prisma.ServiceStaffCreateManyInput[],
  ): Promise<ServiceStaff[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceStaff.deleteMany({ where: { serviceId, businessId } });
      if (rows.length > 0) {
        await tx.serviceStaff.createMany({ data: rows });
      }
      return tx.serviceStaff.findMany({
        where: { serviceId, businessId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });
  }

  updateStaffRow(
    businessId: string,
    serviceId: string,
    userId: string,
    data: Prisma.ServiceStaffUpdateInput,
  ): Promise<ServiceStaff | null> {
    return this.prisma.serviceStaff
      .updateMany({
        where: { businessId, serviceId, userId },
        data: data,
      })
      .then(async (result) => {
        if (result.count === 0) {
          return null;
        }
        return this.prisma.serviceStaff.findFirst({
          where: { businessId, serviceId, userId },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
      });
  }

  countEnabledStaff(businessId: string, serviceId: string): Promise<number> {
    return this.prisma.serviceStaff.count({
      where: { businessId, serviceId, isEnabled: true },
    });
  }

  countResourceRequirements(
    businessId: string,
    serviceId: string,
  ): Promise<number> {
    return this.prisma.serviceResourceRequirement.count({
      where: { businessId, serviceId },
    });
  }

  deleteProductUsages(businessId: string, serviceId: string): Promise<void> {
    return this.prisma.serviceProductUsage
      .deleteMany({ where: { businessId, serviceId } })
      .then(() => undefined);
  }

  replaceProductUsages(
    businessId: string,
    serviceId: string,
    rows: Prisma.ServiceProductUsageCreateManyInput[],
  ): Promise<ServiceProductUsage[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceProductUsage.deleteMany({
        where: { businessId, serviceId },
      });
      if (rows.length > 0) {
        await tx.serviceProductUsage.createMany({ data: rows });
      }
      return tx.serviceProductUsage.findMany({
        where: { businessId, serviceId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  createResourceRequirement(
    data: Prisma.ServiceResourceRequirementCreateInput,
  ): Promise<ServiceResourceRequirement> {
    return this.prisma.serviceResourceRequirement.create({
      data,
      include: {
        resource: {
          select: { id: true, name: true, resourceType: true, status: true },
        },
      },
    });
  }

  findResourceRequirement(
    businessId: string,
    serviceId: string,
    id: string,
  ): Promise<ServiceResourceRequirement | null> {
    return this.prisma.serviceResourceRequirement.findFirst({
      where: { id, businessId, serviceId },
    });
  }

  updateResourceRequirement(
    businessId: string,
    serviceId: string,
    id: string,
    data: Prisma.ServiceResourceRequirementUpdateManyMutationInput,
  ): Promise<ServiceResourceRequirement | null> {
    return this.prisma.serviceResourceRequirement
      .updateMany({ where: { id, businessId, serviceId }, data })
      .then(async (r) => {
        if (r.count === 0) {
          return null;
        }
        return this.prisma.serviceResourceRequirement.findFirst({
          where: { id, businessId, serviceId },
          include: {
            resource: {
              select: {
                id: true,
                name: true,
                resourceType: true,
                status: true,
              },
            },
          },
        });
      });
  }

  deleteResourceRequirement(
    businessId: string,
    serviceId: string,
    id: string,
  ): Promise<boolean> {
    return this.prisma.serviceResourceRequirement
      .deleteMany({ where: { id, businessId, serviceId } })
      .then((r) => r.count > 0);
  }

  createOptionGroup(
    data: Prisma.ServiceOptionGroupCreateInput,
  ): Promise<ServiceOptionGroup> {
    return this.prisma.serviceOptionGroup.create({
      data,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  updateOptionGroup(
    businessId: string,
    serviceId: string,
    groupId: string,
    data: Prisma.ServiceOptionGroupUpdateInput,
  ) {
    return this.prisma.serviceOptionGroup
      .updateMany({
        where: { id: groupId, businessId, serviceId },
        data: data as never,
      })
      .then(async (r) => {
        if (r.count === 0) {
          return null;
        }
        return this.prisma.serviceOptionGroup.findFirst({
          where: { id: groupId, businessId, serviceId },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        });
      });
  }

  deleteOptionGroup(
    businessId: string,
    serviceId: string,
    groupId: string,
  ): Promise<boolean> {
    return this.prisma.serviceOptionGroup
      .deleteMany({ where: { id: groupId, businessId, serviceId } })
      .then((r) => r.count > 0);
  }

  createOption(data: Prisma.ServiceOptionCreateInput) {
    return this.prisma.serviceOption.create({ data });
  }

  updateOption(
    groupId: string,
    optionId: string,
    data: Prisma.ServiceOptionUpdateInput,
  ) {
    return this.prisma.serviceOption
      .updateMany({
        where: { id: optionId, groupId },
        data: data as never,
      })
      .then(async (r) => {
        if (r.count === 0) {
          return null;
        }
        return this.prisma.serviceOption.findFirst({
          where: { id: optionId, groupId },
        });
      });
  }

  deleteOption(groupId: string, optionId: string): Promise<boolean> {
    return this.prisma.serviceOption
      .deleteMany({ where: { id: optionId, groupId } })
      .then((r) => r.count > 0);
  }

  reorderOptionGroups(
    businessId: string,
    serviceId: string,
    orderedIds: string[],
  ) {
    return this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.serviceOptionGroup.updateMany({
          where: { id, businessId, serviceId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  reorderOptions(groupId: string, orderedIds: string[]) {
    return this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.serviceOption.updateMany({
          where: { id, groupId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  findStaffAssignment(
    businessId: string,
    serviceId: string,
    userId: string,
  ): Promise<ServiceStaff | null> {
    return this.prisma.serviceStaff.findFirst({
      where: { businessId, serviceId, userId },
    });
  }

  findOnlineBookingSettings(
    businessId: string,
    serviceId: string,
  ): Promise<ServiceOnlineBookingSettings | null> {
    return this.prisma.serviceOnlineBookingSettings.findFirst({
      where: { businessId, serviceId },
    });
  }
}
