import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ClientPackageSource,
  ClientPackageStatus,
  PackageExpirationPolicy,
  PackageHistoryEventType,
  PackageServiceGroupQuantityType,
  Prisma,
} from '@prisma/client';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import {
  AdjustQuantitiesDto,
  ClientPackageDetailResponseDto,
  ClientPackageListItemResponseDto,
  CreateClientPackageDto,
  ListClientPackagesQueryDto,
  TransferPackageDto,
  UpdateExpirationDateDto,
} from '../dto/package.dto';
import {
  toClientPackageDetail,
  toClientPackageListItem,
} from '../mappers/package.mapper';
import { ClientPackageRepository } from '../repositories/client-package.repository';
import { PackageTemplateRepository } from '../repositories/package-template.repository';
import { PackageSalesService } from './package-sales.service';

export interface CreateClientPackageOptions {
  source?: ClientPackageSource;
  stripePaymentIntentId?: string;
  actor?: RequestUser;
  skipSaleRecord?: boolean;
}

@Injectable()
export class ClientPackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientPackageRepository: ClientPackageRepository,
    private readonly templateRepository: PackageTemplateRepository,
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly packageSalesService: PackageSalesService,
  ) {}

  async findAll(
    businessId: string,
    query: ListClientPackagesQueryDto,
  ): Promise<{
    items: ClientPackageListItemResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { skip, take, page, limit } = getPaginationParams(query);
    const { items, total } = await this.clientPackageRepository.findMany(
      businessId,
      {
        skip,
        take,
        contactId: query.contactId,
        search: query.search,
      },
    );
    return {
      items: items.map(toClientPackageListItem),
      meta: { total, page, limit },
    };
  }

  async findOne(
    businessId: string,
    id: string,
  ): Promise<ClientPackageDetailResponseDto> {
    const row = await this.assertClientPackage(businessId, id);
    return toClientPackageDetail(row);
  }

  async findForContact(
    businessId: string,
    contactId: string,
  ): Promise<ClientPackageListItemResponseDto[]> {
    const rows = await this.clientPackageRepository.findActiveForContact(
      businessId,
      contactId,
    );
    return rows.map(toClientPackageListItem);
  }

  async findAvailableForService(
    businessId: string,
    contactId: string,
    serviceId: string,
  ) {
    const rows = await this.clientPackageRepository.findActiveForContact(
      businessId,
      contactId,
    );
    return rows
      .filter((pkg) =>
        pkg.serviceAllocations.some(
          (a) => a.serviceId === serviceId && a.remaining > 0,
        ),
      )
      .map((pkg) => {
        const allocation = pkg.serviceAllocations.find(
          (a) => a.serviceId === serviceId,
        );
        return {
          ...toClientPackageListItem(pkg),
          matchingRemaining: allocation?.remaining ?? 0,
        };
      });
  }

  async createFromPosSale(
    businessId: string,
    invoiceId: string,
    params: {
      packageTemplateId: string;
      ownerContactId: string;
      isDemo?: boolean;
      purchaseDate?: string;
      checkoutItemId: string;
    },
  ): Promise<ClientPackageDetailResponseDto | null> {
    const existing = await this.prisma.clientPackage.findFirst({
      where: { businessId, invoiceId },
    });
    if (existing) {
      const row = await this.assertClientPackage(businessId, existing.id);
      return toClientPackageDetail(row);
    }

    const created = await this.create(
      businessId,
      {
        contactId: params.ownerContactId,
        packageTemplateId: params.packageTemplateId,
        purchaseDate: params.purchaseDate,
        isDemo: params.isDemo ?? false,
      },
      { source: ClientPackageSource.STAFF, skipSaleRecord: true },
    );

    await this.prisma.clientPackage.update({
      where: { id: created.id },
      data: { invoiceId },
    });

    return this.findOne(businessId, created.id);
  }

  async create(
    businessId: string,
    dto: CreateClientPackageDto,
    options: CreateClientPackageOptions = {},
  ): Promise<ClientPackageDetailResponseDto> {
    await this.assertContact(businessId, dto.contactId);
    const template = await this.templateRepository.findById(
      businessId,
      dto.packageTemplateId,
    );
    if (!template) {
      throw new AppException(
        ErrorCode.PACKAGE_TEMPLATE_NOT_FOUND,
        'Package template not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const purchaseDate = dto.purchaseDate
      ? new Date(dto.purchaseDate)
      : new Date();
    let expirationDate =
      dto.expirationDate === null
        ? null
        : dto.expirationDate
          ? new Date(dto.expirationDate)
          : null;

    if (
      !expirationDate &&
      template.expirationPolicy === PackageExpirationPolicy.AFTER_PURCHASE &&
      template.expirationDays
    ) {
      expirationDate = new Date(purchaseDate);
      expirationDate.setDate(
        expirationDate.getDate() + template.expirationDays,
      );
    }

    const allocations = this.buildAllocations(template);

    const row = await this.prisma.$transaction(async (tx) => {
      const clientPackage = await tx.clientPackage.create({
        data: {
          businessId,
          contactId: dto.contactId,
          packageTemplateId: dto.packageTemplateId,
          purchaseDate,
          expirationDate,
          source: options.source ?? ClientPackageSource.STAFF,
          stripePaymentIntentId: options.stripePaymentIntentId ?? null,
          isDemo: dto.isDemo ?? false,
          status: ClientPackageStatus.ACTIVE,
          serviceAllocations: { create: allocations },
          history: {
            create: {
              eventType: PackageHistoryEventType.PURCHASED,
              description: 'Package purchased',
            },
          },
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
          packageTemplate: {
            select: {
              id: true,
              name: true,
              emoji: true,
              totalPrice: true,
            },
          },
          serviceAllocations: {
            include: { service: { select: { id: true, name: true } } },
          },
          history: { orderBy: { createdAt: 'desc' } },
        },
      });
      return clientPackage;
    });

    if (options.actor) {
      await this.auditService.log({
        actorUserId: options.actor.id,
        businessId,
        action: 'client_package.created',
        entityType: 'ClientPackage',
        entityId: row.id,
      });

      if (
        !options.skipSaleRecord &&
        (options.source ?? ClientPackageSource.STAFF) ===
          ClientPackageSource.STAFF &&
        !dto.isDemo
      ) {
        const emoji = template.emoji ? `${template.emoji} ` : '';
        await this.packageSalesService.recordStaffAssignmentSale({
          businessId,
          clientPackageId: row.id,
          contactId: dto.contactId,
          title: `${emoji}${template.name}`.trim(),
          amount: template.totalPrice,
          actorUserId: options.actor.id,
        });
      }
    }

    return toClientPackageDetail(
      await this.assertClientPackage(businessId, row.id),
    );
  }

  async transfer(
    businessId: string,
    id: string,
    dto: TransferPackageDto,
    actor: RequestUser,
  ): Promise<ClientPackageDetailResponseDto> {
    const row = await this.assertClientPackage(businessId, id);
    if (row.status !== ClientPackageStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Only active packages can be transferred',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertContact(businessId, dto.targetContactId);
    const previousContactName =
      row.contact.displayName ??
      [row.contact.firstName, row.contact.lastName].filter(Boolean).join(' ');

    const updated = await this.prisma.$transaction(async (tx) => {
      const pkg = await tx.clientPackage.update({
        where: { id },
        data: { contactId: dto.targetContactId },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
          packageTemplate: {
            select: {
              id: true,
              name: true,
              emoji: true,
              totalPrice: true,
            },
          },
          serviceAllocations: {
            include: { service: { select: { id: true, name: true } } },
          },
          history: { orderBy: { createdAt: 'desc' } },
        },
      });

      await tx.packageHistoryEvent.create({
        data: {
          clientPackageId: id,
          eventType: PackageHistoryEventType.TRANSFERRED_IN,
          description: `Transferred from ${previousContactName}`,
          staffUserId: actor.id,
        },
      });

      return pkg;
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'client_package.transferred',
      entityType: 'ClientPackage',
      entityId: id,
    });

    return toClientPackageDetail(updated);
  }

  async adjustQuantities(
    businessId: string,
    id: string,
    dto: AdjustQuantitiesDto,
    actor: RequestUser,
  ): Promise<ClientPackageDetailResponseDto> {
    const row = await this.assertClientPackage(businessId, id);

    await this.prisma.$transaction(async (tx) => {
      for (const adj of dto.allocations) {
        const allocation = row.serviceAllocations.find(
          (a) => a.serviceId === adj.serviceId,
        );
        if (!allocation) continue;

        const delta = adj.remaining - allocation.remaining;
        await tx.packageServiceAllocation.update({
          where: { id: allocation.id },
          data: { remaining: adj.remaining },
        });

        if (delta !== 0) {
          await tx.packageHistoryEvent.create({
            data: {
              clientPackageId: id,
              eventType: PackageHistoryEventType.ADJUSTED,
              quantityChange: delta,
              serviceId: adj.serviceId,
              staffUserId: actor.id,
              description: `Adjusted remaining to ${adj.remaining}`,
            },
          });
        }
      }
    });

    const refreshed = await this.assertClientPackage(businessId, id);
    await this.syncDepletedStatus(refreshed.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'client_package.quantities_adjusted',
      entityType: 'ClientPackage',
      entityId: id,
    });

    return toClientPackageDetail(
      await this.assertClientPackage(businessId, id),
    );
  }

  async updateExpirationDate(
    businessId: string,
    id: string,
    dto: UpdateExpirationDateDto,
    actor: RequestUser,
  ): Promise<ClientPackageDetailResponseDto> {
    await this.assertClientPackage(businessId, id);
    const expirationDate =
      dto.expirationDate === null || dto.expirationDate === undefined
        ? null
        : new Date(dto.expirationDate);

    await this.prisma.clientPackage.update({
      where: { id },
      data: { expirationDate },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'client_package.expiration_updated',
      entityType: 'ClientPackage',
      entityId: id,
    });

    return toClientPackageDetail(
      await this.assertClientPackage(businessId, id),
    );
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertClientPackage(businessId, id);
    await this.prisma.$transaction([
      this.prisma.clientPackage.update({
        where: { id },
        data: { status: ClientPackageStatus.DELETED },
      }),
      this.prisma.packageHistoryEvent.create({
        data: {
          clientPackageId: id,
          eventType: PackageHistoryEventType.DELETED,
          staffUserId: actor.id,
          description: 'Package deleted',
        },
      }),
    ]);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'client_package.deleted',
      entityType: 'ClientPackage',
      entityId: id,
    });
  }

  async redeemService(
    businessId: string,
    clientPackageId: string,
    serviceId: string,
    staffUserId?: string,
  ) {
    const row = await this.assertClientPackage(businessId, clientPackageId);
    if (row.status !== ClientPackageStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Package is not active',
        HttpStatus.BAD_REQUEST,
      );
    }

    const allocation = row.serviceAllocations.find(
      (a) => a.serviceId === serviceId,
    );
    if (!allocation) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Service not included in this package',
        HttpStatus.NOT_FOUND,
      );
    }
    if (allocation.remaining <= 0) {
      throw new AppException(
        ErrorCode.PACKAGE_SERVICE_EXHAUSTED,
        'No remaining services in this package',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const alloc = await tx.packageServiceAllocation.update({
        where: { id: allocation.id },
        data: { remaining: { decrement: 1 } },
      });

      await tx.packageHistoryEvent.create({
        data: {
          clientPackageId,
          eventType: PackageHistoryEventType.REDEEMED,
          serviceId,
          quantityChange: -1,
          staffUserId: staffUserId ?? null,
          description: 'Service redeemed',
        },
      });

      return alloc;
    });

    await this.syncDepletedStatus(clientPackageId);
    return updated;
  }

  async expirePackages(): Promise<number> {
    const now = new Date();
    const expired = await this.clientPackageRepository.findExpiredActive(now);
    if (expired.length === 0) return 0;

    await this.prisma.$transaction(
      expired.flatMap((pkg) => [
        this.prisma.clientPackage.update({
          where: { id: pkg.id },
          data: { status: ClientPackageStatus.EXPIRED },
        }),
        this.prisma.packageHistoryEvent.create({
          data: {
            clientPackageId: pkg.id,
            eventType: PackageHistoryEventType.EXPIRED,
            description: 'Package expired',
          },
        }),
      ]),
    );

    return expired.length;
  }

  private buildAllocations(
    template: NonNullable<
      Awaited<ReturnType<PackageTemplateRepository['findById']>>
    >,
  ) {
    const allocations: Array<{
      serviceId: string;
      remaining: number;
      initialQty: number;
    }> = [];

    for (const group of template.serviceGroups) {
      const qty =
        group.quantityType === PackageServiceGroupQuantityType.MULTIPLE
          ? group.quantity
          : group.quantity;

      for (const item of group.serviceGroupItems) {
        allocations.push({
          serviceId: item.serviceId,
          remaining: qty,
          initialQty: qty,
        });
      }
    }

    return allocations;
  }

  private async syncDepletedStatus(clientPackageId: string) {
    const allocations = await this.prisma.packageServiceAllocation.findMany({
      where: { clientPackageId },
    });
    const allZero = allocations.every((a) => a.remaining <= 0);
    if (allZero && allocations.length > 0) {
      await this.prisma.clientPackage.update({
        where: { id: clientPackageId },
        data: { status: ClientPackageStatus.DEPLETED },
      });
    }
  }

  private async assertClientPackage(businessId: string, id: string) {
    const row = await this.clientPackageRepository.findById(businessId, id);
    if (!row) {
      throw new AppException(
        ErrorCode.CLIENT_PACKAGE_NOT_FOUND,
        'Client package not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async assertContact(businessId: string, contactId: string) {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
