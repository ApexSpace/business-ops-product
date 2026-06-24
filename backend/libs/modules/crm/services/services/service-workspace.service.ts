import {
  buildPublicServiceBookingUrl,
} from '@app/modules/operations/public-booking/utils/public-booking-url.util';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ServiceStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { ServiceCategoryRepository } from '../repositories/service-category.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { ServiceWorkspaceRepository } from '../repositories/service-workspace.repository';
import {
  CreateOptionGroupDto,
  CreateResourceRequirementDto,
  CreateServiceOptionDto,
  PatchServiceDetailsDto,
  PatchServiceOnlineBookingDto,
  ReplaceServiceProductsDto,
  ReplaceServiceStaffDto,
  ReorderIdsDto,
  ServiceProductUsageDto,
  ServiceStaffAssignmentDto,
  UpdateOptionGroupDto,
  UpdateResourceRequirementDto,
  UpdateServiceOptionDto,
} from '../dto/service-workspace.dto';
import { toServiceResponse } from '../mappers/service.mapper';
import { normalizeServiceDetailsPatch } from '../utils/service-details.util';
import { resolveStaffingMode } from '../utils/service-staffing.util';
import { resolveServiceTiming } from '../utils/service-timing.util';

const STUB_RESOURCE_MESSAGE =
  'Resources module coming soon — link equipment or rooms when available.';
const STUB_PRODUCT_MESSAGE =
  'Products / inventory module coming soon — link catalog items when available.';

@Injectable()
export class ServiceWorkspaceService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly categoryRepository: ServiceCategoryRepository,
    private readonly workspaceRepository: ServiceWorkspaceRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
  ) {}

  private getFrontendUrl(): string {
    return process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
  }

  private async requireService(businessId: string, serviceId: string) {
    const service = await this.serviceRepository.findByIdWithCategory(
      businessId,
      serviceId,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return service;
  }

  async getTree(businessId: string) {
    const categories = await this.workspaceRepository.findTree(businessId);
    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        services: c.services,
      })),
    };
  }

  async getWorkspace(businessId: string, serviceId: string) {
    const workspace = await this.workspaceRepository.findWorkspace(
      businessId,
      serviceId,
    );
    if (!workspace) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const timing = resolveServiceTiming({
      durationMinutes: workspace.durationMinutes,
      hasProcessingTime: workspace.hasProcessingTime,
      processingDurationMinutes: workspace.processingDurationMinutes,
      finishDurationMinutes: workspace.finishDurationMinutes,
      hasBufferTime: workspace.hasBufferTime,
      bufferBeforeMinutes: workspace.bufferBeforeMinutes,
      bufferAfterMinutes: workspace.bufferAfterMinutes,
    });

    const productsCostTotal = workspace.productUsages.reduce((sum, row) => {
      if (!row.unitCost) {
        return sum;
      }
      return sum + Number(row.unitCost) * Number(row.quantity);
    }, 0);

    return {
      service: toServiceResponse(workspace),
      timing,
      staff: workspace.staffAssignments.map((row) => ({
        id: row.id,
        userId: row.userId,
        user: row.user,
        isEnabled: row.isEnabled,
        durationMinutes: row.durationMinutes,
        price: row.price?.toString() ?? null,
        commissionType: row.commissionType,
        commissionValue: row.commissionValue?.toString() ?? null,
        onlineBookingEnabled: row.onlineBookingEnabled,
        sortOrder: row.sortOrder,
      })),
      onlineBooking: workspace.onlineBookingSettings
        ? {
            ...workspace.onlineBookingSettings,
            calendarSlug:
              workspace.onlineBookingSettings.calendar?.publicSlug ?? null,
          }
        : null,
      resourceRequirements: workspace.resourceRequirements.map((r) => ({
        id: r.id,
        label: r.label,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        quantity: r.quantity,
        notes: r.notes,
        sortOrder: r.sortOrder,
        linked: r.resourceId != null,
        stubMessage: r.resourceId == null ? STUB_RESOURCE_MESSAGE : null,
      })),
      products: workspace.productUsages.map((p) => ({
        id: p.id,
        productId: p.productId,
        variantId: p.variantId,
        label: p.label,
        quantity: p.quantity.toString(),
        unitCost: p.unitCost?.toString() ?? null,
        sortOrder: p.sortOrder,
        linked: p.productId != null,
        stubMessage: p.productId == null ? STUB_PRODUCT_MESSAGE : null,
      })),
      productsCostTotal: productsCostTotal.toFixed(2),
      optionGroups: workspace.optionGroups,
      staffingMode: resolveStaffingMode(workspace),
    };
  }

  async patchDetails(
    businessId: string,
    serviceId: string,
    dto: PatchServiceDetailsDto,
    actor: RequestUser,
  ) {
    const existing = await this.requireService(businessId, serviceId);

    if (dto.categoryId) {
      const category = await this.categoryRepository.findById(
        businessId,
        dto.categoryId,
      );
      if (!category) {
        throw new AppException(
          ErrorCode.SERVICE_CATEGORY_NOT_FOUND,
          'Service category not found',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    let normalized: Prisma.ServiceUpdateInput;
    try {
      normalized = normalizeServiceDetailsPatch(existing, dto);
    } catch {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'requiresNoStaff and requiresTwoStaff cannot both be enabled',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      dto.status === ServiceStatus.ACTIVE ||
      (dto.status === undefined && existing.status === ServiceStatus.ACTIVE)
    ) {
      await this.assertActivationRules(
        businessId,
        serviceId,
        {
          requiresNoStaff:
            (normalized.requiresNoStaff as boolean) ?? existing.requiresNoStaff,
          requiresTwoStaff:
            (normalized.requiresTwoStaff as boolean) ??
            existing.requiresTwoStaff,
          status: dto.status ?? existing.status,
        },
      );
    }

    const usesProducts =
      (normalized.usesProducts as boolean | undefined) ?? existing.usesProducts;
    if (!usesProducts && existing.usesProducts) {
      await this.workspaceRepository.deleteProductUsages(businessId, serviceId);
    }

    const data: Prisma.ServiceUpdateInput = {
      ...normalized,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.price !== undefined
        ? {
            price:
              dto.price === null ? null : new Prisma.Decimal(dto.price),
          }
        : {}),
      ...(dto.categoryId !== undefined
        ? { category: { connect: { id: dto.categoryId } } }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.isDemo !== undefined ? { isDemo: dto.isDemo } : {}),
    };

    const updated = await this.serviceRepository.update(
      businessId,
      serviceId,
      data,
    );
    if (!updated) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.details_updated',
      entityType: 'Service',
      entityId: serviceId,
    });

    return toServiceResponse(updated);
  }

  private async assertActivationRules(
    businessId: string,
    serviceId: string,
    flags: {
      requiresNoStaff: boolean;
      requiresTwoStaff: boolean;
      status: ServiceStatus;
    },
  ) {
    if (flags.status !== ServiceStatus.ACTIVE) {
      return;
    }
    if (flags.requiresNoStaff) {
      const count = await this.workspaceRepository.countResourceRequirements(
        businessId,
        serviceId,
      );
      if (count < 1) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'Resource-only services require at least one resource requirement before activation',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (flags.requiresTwoStaff) {
      const enabled = await this.workspaceRepository.countEnabledStaff(
        businessId,
        serviceId,
      );
      if (enabled !== 2) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'Two-staff services require exactly two enabled staff assignments before activation',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async replaceStaff(
    businessId: string,
    serviceId: string,
    dto: ReplaceServiceStaffDto,
    actor: RequestUser,
  ) {
    const service = await this.requireService(businessId, serviceId);
    if (service.requiresNoStaff) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This service does not use staff assignments',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const row of dto.staff) {
      await this.assertMember(businessId, row.userId);
    }

    const rows = dto.staff.map((row, index) =>
      this.toStaffCreateRow(businessId, serviceId, row, index),
    );
    const staff = await this.workspaceRepository.replaceStaff(
      businessId,
      serviceId,
      rows,
    );

    if (service.status === ServiceStatus.ACTIVE) {
      await this.assertActivationRules(businessId, serviceId, {
        requiresNoStaff: service.requiresNoStaff,
        requiresTwoStaff: service.requiresTwoStaff,
        status: service.status,
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.staff_updated',
      entityType: 'Service',
      entityId: serviceId,
    });

    return { staff };
  }

  private toStaffCreateRow(
    businessId: string,
    serviceId: string,
    row: ServiceStaffAssignmentDto,
    index: number,
  ): Prisma.ServiceStaffCreateManyInput {
    return {
      businessId,
      serviceId,
      userId: row.userId,
      isEnabled: row.isEnabled ?? true,
      durationMinutes: row.durationMinutes ?? null,
      price:
        row.price !== undefined && row.price !== null
          ? new Prisma.Decimal(row.price)
          : null,
      commissionType: row.commissionType ?? null,
      commissionValue:
        row.commissionValue !== undefined && row.commissionValue !== null
          ? new Prisma.Decimal(row.commissionValue)
          : null,
      onlineBookingEnabled: row.onlineBookingEnabled ?? true,
      sortOrder: index,
    };
  }

  async patchStaff(
    businessId: string,
    serviceId: string,
    userId: string,
    dto: ServiceStaffAssignmentDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const updated = await this.workspaceRepository.updateStaffRow(
      businessId,
      serviceId,
      userId,
      {
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.price !== undefined
          ? {
              price:
                dto.price === null ? null : new Prisma.Decimal(dto.price),
            }
          : {}),
        ...(dto.commissionType !== undefined
          ? { commissionType: dto.commissionType }
          : {}),
        ...(dto.commissionValue !== undefined
          ? {
              commissionValue:
                dto.commissionValue === null
                  ? null
                  : new Prisma.Decimal(dto.commissionValue),
            }
          : {}),
        ...(dto.onlineBookingEnabled !== undefined
          ? { onlineBookingEnabled: dto.onlineBookingEnabled }
          : {}),
      },
    );
    if (!updated) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Staff assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.staff_updated',
      entityType: 'Service',
      entityId: serviceId,
      metadata: { userId },
    });

    return { staff: updated };
  }

  async getOnlineBooking(businessId: string, serviceId: string) {
    await this.requireService(businessId, serviceId);
    const settings = await this.workspaceRepository.findOnlineBookingSettings(
      businessId,
      serviceId,
    );
    return { settings };
  }

  async patchOnlineBooking(
    businessId: string,
    serviceId: string,
    dto: PatchServiceOnlineBookingDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const settings = await this.workspaceRepository.upsertOnlineBookingSettings(
      businessId,
      serviceId,
      {
        ...(dto.onlineBookingEnabled !== undefined
          ? { onlineBookingEnabled: dto.onlineBookingEnabled }
          : {}),
        ...(dto.calendarId !== undefined
          ? dto.calendarId
            ? { calendar: { connect: { id: dto.calendarId } } }
            : { calendar: { disconnect: true } }
          : {}),
        ...(dto.customizePriceDisplay !== undefined
          ? { customizePriceDisplay: dto.customizePriceDisplay }
          : {}),
        ...(dto.showPromptToCall !== undefined
          ? { showPromptToCall: dto.showPromptToCall }
          : {}),
        ...(dto.requireHomeAddress !== undefined
          ? { requireHomeAddress: dto.requireHomeAddress }
          : {}),
        ...(dto.requireCreditCard !== undefined
          ? { requireCreditCard: dto.requireCreditCard }
          : {}),
        ...(dto.requirePaymentAtBooking !== undefined
          ? { requirePaymentAtBooking: dto.requirePaymentAtBooking }
          : {}),
      },
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.online_booking_updated',
      entityType: 'Service',
      entityId: serviceId,
    });

    return { settings };
  }

  async getDirectLinks(businessId: string, serviceId: string) {
    await this.requireService(businessId, serviceId);
    const settings = await this.workspaceRepository.findOnlineBookingSettings(
      businessId,
      serviceId,
    );
    const slug = settings?.calendar?.publicSlug;
    const frontendUrl = this.getFrontendUrl();
    if (!slug || !frontendUrl) {
      return {
        serviceLink: null,
        staffLinks: [],
        hint: 'Configure a calendar with public booking enabled and select it in Online Booking settings.',
      };
    }

    const serviceLink = buildPublicServiceBookingUrl(frontendUrl, slug, {
      serviceId,
    });
    const staffRows = await this.workspaceRepository.findWorkspace(
      businessId,
      serviceId,
    );
    const staffLinks =
      staffRows?.staffAssignments
        .filter((s) => s.isEnabled && s.onlineBookingEnabled)
        .map((s) => ({
          userId: s.userId,
          url: buildPublicServiceBookingUrl(frontendUrl, slug, {
            serviceId,
            staffId: s.userId,
          }),
        })) ?? [];

    return { serviceLink, staffLinks, hint: null };
  }

  async listResourceRequirements(businessId: string, serviceId: string) {
    const workspace = await this.getWorkspace(businessId, serviceId);
    return { items: workspace.resourceRequirements };
  }

  async createResourceRequirement(
    businessId: string,
    serviceId: string,
    dto: CreateResourceRequirementDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const count = await this.workspaceRepository.countResourceRequirements(
      businessId,
      serviceId,
    );
    const row = await this.workspaceRepository.createResourceRequirement({
      business: { connect: { id: businessId } },
      service: { connect: { id: serviceId } },
      label: dto.label.trim(),
      resourceType: dto.resourceType,
      resourceId: dto.resourceId ?? null,
      quantity: dto.quantity ?? 1,
      notes: dto.notes?.trim() || null,
      sortOrder: count,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.resource_requirement_created',
      entityType: 'Service',
      entityId: serviceId,
    });

    return {
      ...row,
      linked: row.resourceId != null,
      stubMessage: row.resourceId == null ? STUB_RESOURCE_MESSAGE : null,
    };
  }

  async updateResourceRequirement(
    businessId: string,
    serviceId: string,
    reqId: string,
    dto: UpdateResourceRequirementDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const row = await this.workspaceRepository.updateResourceRequirement(
      businessId,
      serviceId,
      reqId,
      {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.resourceType !== undefined
          ? { resourceType: dto.resourceType }
          : {}),
        ...(dto.resourceId !== undefined ? { resourceId: dto.resourceId } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    );
    if (!row) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Resource requirement not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.resource_requirement_updated',
      entityType: 'Service',
      entityId: serviceId,
    });

    return {
      ...row,
      linked: row.resourceId != null,
      stubMessage: row.resourceId == null ? STUB_RESOURCE_MESSAGE : null,
    };
  }

  async deleteResourceRequirement(
    businessId: string,
    serviceId: string,
    reqId: string,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const deleted = await this.workspaceRepository.deleteResourceRequirement(
      businessId,
      serviceId,
      reqId,
    );
    if (!deleted) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Resource requirement not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.resource_requirement_deleted',
      entityType: 'Service',
      entityId: serviceId,
    });

    return { success: true };
  }

  async listProducts(businessId: string, serviceId: string) {
    const workspace = await this.getWorkspace(businessId, serviceId);
    return {
      items: workspace.products,
      productsCostTotal: workspace.productsCostTotal,
    };
  }

  async replaceProducts(
    businessId: string,
    serviceId: string,
    dto: ReplaceServiceProductsDto,
    actor: RequestUser,
  ) {
    const service = await this.requireService(businessId, serviceId);
    if (!service.usesProducts) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Enable "uses products" on this service first',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rows = dto.products.map((p, index) =>
      this.toProductRow(businessId, serviceId, p, index),
    );
    const items = await this.workspaceRepository.replaceProductUsages(
      businessId,
      serviceId,
      rows,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.products_updated',
      entityType: 'Service',
      entityId: serviceId,
    });

    return {
      items: items.map((p) => ({
        ...p,
        quantity: p.quantity.toString(),
        unitCost: p.unitCost?.toString() ?? null,
        linked: p.productId != null,
        stubMessage: p.productId == null ? STUB_PRODUCT_MESSAGE : null,
        variantId: p.variantId,
      })),
    };
  }

  private toProductRow(
    businessId: string,
    serviceId: string,
    row: ServiceProductUsageDto,
    index: number,
  ): Prisma.ServiceProductUsageCreateManyInput {
    return {
      businessId,
      serviceId,
      productId: row.productId ?? null,
      variantId: row.variantId ?? null,
      label: row.label.trim(),
      quantity: new Prisma.Decimal(row.quantity ?? 1),
      unitCost:
        row.unitCost !== undefined && row.unitCost !== null
          ? new Prisma.Decimal(row.unitCost)
          : null,
      sortOrder: index,
    };
  }

  async createOptionGroup(
    businessId: string,
    serviceId: string,
    dto: CreateOptionGroupDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    this.validateOptionGroup(dto.minSelections ?? 0, dto.maxSelections ?? null);

    const workspace = await this.workspaceRepository.findWorkspace(
      businessId,
      serviceId,
    );
    const sortOrder = workspace?.optionGroups.length ?? 0;

    const group = await this.workspaceRepository.createOptionGroup({
      business: { connect: { id: businessId } },
      service: { connect: { id: serviceId } },
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      required: dto.required ?? false,
      minSelections: dto.minSelections ?? 0,
      maxSelections: dto.maxSelections ?? null,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.option_group_created',
      entityType: 'Service',
      entityId: serviceId,
    });

    return group;
  }

  async updateOptionGroup(
    businessId: string,
    serviceId: string,
    groupId: string,
    dto: UpdateOptionGroupDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    if (dto.minSelections !== undefined || dto.maxSelections !== undefined) {
      this.validateOptionGroup(
        dto.minSelections ?? 0,
        dto.maxSelections ?? null,
      );
    }

    const group = await this.workspaceRepository.updateOptionGroup(
      businessId,
      serviceId,
      groupId,
      {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.minSelections !== undefined
          ? { minSelections: dto.minSelections }
          : {}),
        ...(dto.maxSelections !== undefined
          ? { maxSelections: dto.maxSelections }
          : {}),
      },
    );
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Option group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.option_group_updated',
      entityType: 'Service',
      entityId: serviceId,
    });

    return group;
  }

  async deleteOptionGroup(
    businessId: string,
    serviceId: string,
    groupId: string,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const deleted = await this.workspaceRepository.deleteOptionGroup(
      businessId,
      serviceId,
      groupId,
    );
    if (!deleted) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Option group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.option_group_deleted',
      entityType: 'Service',
      entityId: serviceId,
    });

    return { success: true };
  }

  async createOption(
    businessId: string,
    serviceId: string,
    groupId: string,
    dto: CreateServiceOptionDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const group = await this.workspaceRepository.updateOptionGroup(
      businessId,
      serviceId,
      groupId,
      {},
    );
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Option group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const option = await this.workspaceRepository.createOption({
      group: { connect: { id: groupId } },
      name: dto.name.trim(),
      priceAdjustment: new Prisma.Decimal(dto.priceAdjustment ?? 0),
      durationAdjustmentMinutes: dto.durationAdjustmentMinutes ?? 0,
      isActive: dto.isActive ?? true,
      sortOrder: group.options.length,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.option_created',
      entityType: 'Service',
      entityId: serviceId,
    });

    return option;
  }

  async updateOption(
    businessId: string,
    serviceId: string,
    groupId: string,
    optionId: string,
    dto: UpdateServiceOptionDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const option = await this.workspaceRepository.updateOption(
      groupId,
      optionId,
      {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.priceAdjustment !== undefined
          ? { priceAdjustment: new Prisma.Decimal(dto.priceAdjustment) }
          : {}),
        ...(dto.durationAdjustmentMinutes !== undefined
          ? { durationAdjustmentMinutes: dto.durationAdjustmentMinutes }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    );
    if (!option) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Option not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.option_updated',
      entityType: 'Service',
      entityId: serviceId,
    });

    return option;
  }

  async deleteOption(
    businessId: string,
    serviceId: string,
    groupId: string,
    optionId: string,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    const deleted = await this.workspaceRepository.deleteOption(
      groupId,
      optionId,
    );
    if (!deleted) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Option not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.option_deleted',
      entityType: 'Service',
      entityId: serviceId,
    });

    return { success: true };
  }

  async reorderOptionGroups(
    businessId: string,
    serviceId: string,
    dto: ReorderIdsDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    await this.workspaceRepository.reorderOptionGroups(
      businessId,
      serviceId,
      dto.orderedIds,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.option_groups_reordered',
      entityType: 'Service',
      entityId: serviceId,
    });

    return { success: true };
  }

  async reorderOptions(
    businessId: string,
    serviceId: string,
    groupId: string,
    dto: ReorderIdsDto,
    actor: RequestUser,
  ) {
    await this.requireService(businessId, serviceId);
    await this.workspaceRepository.reorderOptions(groupId, dto.orderedIds);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.options_reordered',
      entityType: 'Service',
      entityId: serviceId,
    });

    return { success: true };
  }

  private validateOptionGroup(
    minSelections: number,
    maxSelections: number | null,
  ) {
    if (maxSelections != null && minSelections > maxSelections) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'minSelections cannot exceed maxSelections',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertMember(businessId: string, userId: string) {
    const membership =
      await this.membershipRepository.findActiveByUserAndBusiness(
        userId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.ASSIGNEE_NOT_MEMBER,
        'Staff member is not an active member of this business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
