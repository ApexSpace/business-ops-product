import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  ContactAdjustmentResponseDto,
  CreateContactAdjustmentDto,
  UpdateContactAdjustmentDto,
} from '../dto/contact-adjustment.dto';
import { ContactRepository } from '../repositories/contact.repository';
import {
  ContactAdjustmentRepository,
  type ContactAdjustmentWithService,
} from '../repositories/contact-adjustment.repository';

@Injectable()
export class ContactAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactRepository: ContactRepository,
    private readonly adjustmentRepository: ContactAdjustmentRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    contactId: string,
  ): Promise<ContactAdjustmentResponseDto[]> {
    await this.assertContact(businessId, contactId);
    const rows = await this.adjustmentRepository.findMany(
      businessId,
      contactId,
    );
    return rows.map((row) => this.toResponse(row));
  }

  async create(
    businessId: string,
    contactId: string,
    dto: CreateContactAdjustmentDto,
    actor: RequestUser,
  ): Promise<ContactAdjustmentResponseDto> {
    await this.assertContact(businessId, contactId);
    await this.assertService(businessId, dto.serviceId);

    const existing = await this.adjustmentRepository.findByContactAndService(
      businessId,
      contactId,
      dto.serviceId,
    );
    if (existing) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'An adjustment for this service already exists',
        HttpStatus.CONFLICT,
      );
    }

    const row = await this.adjustmentRepository.create({
      businessId,
      contactId,
      serviceId: dto.serviceId,
      durationMinutes: dto.durationMinutes,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.adjustment.created',
      entityType: 'Contact',
      entityId: contactId,
      metadata: {
        adjustmentId: row.id,
        serviceId: dto.serviceId,
        durationMinutes: dto.durationMinutes,
      },
    });

    return this.toResponse(row);
  }

  async update(
    businessId: string,
    contactId: string,
    adjustmentId: string,
    dto: UpdateContactAdjustmentDto,
    actor: RequestUser,
  ): Promise<ContactAdjustmentResponseDto> {
    await this.assertContact(businessId, contactId);
    const existing = await this.adjustmentRepository.findById(
      businessId,
      contactId,
      adjustmentId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Adjustment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const row = await this.adjustmentRepository.update(adjustmentId, {
      durationMinutes: dto.durationMinutes,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.adjustment.updated',
      entityType: 'Contact',
      entityId: contactId,
      metadata: {
        adjustmentId,
        durationMinutes: dto.durationMinutes,
      },
    });

    return this.toResponse(row);
  }

  async remove(
    businessId: string,
    contactId: string,
    adjustmentId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertContact(businessId, contactId);
    const existing = await this.adjustmentRepository.findById(
      businessId,
      contactId,
      adjustmentId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Adjustment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.adjustmentRepository.delete(adjustmentId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.adjustment.deleted',
      entityType: 'Contact',
      entityId: contactId,
      metadata: { adjustmentId },
    });
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

  private async assertService(businessId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId, deletedAt: null },
    });
    if (!service) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private toResponse(
    row: ContactAdjustmentWithService,
  ): ContactAdjustmentResponseDto {
    return {
      id: row.id,
      contactId: row.contactId,
      serviceId: row.serviceId,
      serviceName: row.service.name,
      durationMinutes: row.durationMinutes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
