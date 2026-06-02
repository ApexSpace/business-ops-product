import { HttpStatus, Injectable } from '@nestjs/common';
import { Business } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  FinancialSettingsResponseDto,
  UpdateFinancialSettingsDto,
} from '../dto/financial-settings.dto';
import { BusinessRepository } from '../repositories/business.repository';
import { BusinessFinancialSettings } from '../types/financial-settings.types';
import {
  extractFinancialSettings,
  formatDocumentNumber,
  mergeFinancialSettings,
  parseDocumentSequence,
  wrapFinancialSettings,
} from '../utils/financial-settings.util';

@Injectable()
export class FinancialSettingsService {
  constructor(
    private readonly businessRepository: BusinessRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getForBusiness(businessId: string): Promise<FinancialSettingsResponseDto> {
    const business = await this.requireBusiness(businessId);
    return this.toResponse(business);
  }

  async updateForBusiness(
    businessId: string,
    dto: UpdateFinancialSettingsDto,
    actor: RequestUser,
  ): Promise<FinancialSettingsResponseDto> {
    const business = await this.requireBusiness(businessId);
    const current = extractFinancialSettings(business);

    const normalizedPatch: Partial<BusinessFinancialSettings> = {};

    if (dto.invoice) {
      const invoice = { ...current.invoice, ...dto.invoice };
      if (invoice.prefix !== undefined) {
        invoice.prefix = invoice.prefix.trim().toUpperCase().slice(0, 10) || 'INV';
      }
      if (invoice.nextNumber !== undefined) {
        invoice.nextNumber = Math.max(1, Math.floor(invoice.nextNumber));
      }
      normalizedPatch.invoice = invoice;
    }

    if (dto.estimate) {
      const estimate = { ...current.estimate, ...dto.estimate };
      if (estimate.prefix !== undefined) {
        estimate.prefix =
          estimate.prefix.trim().toUpperCase().slice(0, 10) || 'EST';
      }
      if (estimate.nextNumber !== undefined) {
        estimate.nextNumber = Math.max(1, Math.floor(estimate.nextNumber));
      }
      if (estimate.defaultExpiryDays !== undefined) {
        estimate.defaultExpiryDays = Math.max(
          1,
          Math.floor(estimate.defaultExpiryDays),
        );
      }
      normalizedPatch.estimate = estimate;
    }

    const merged = mergeFinancialSettings(current, normalizedPatch);

    const updated = await this.businessRepository.update(businessId, {
      settings: wrapFinancialSettings(business.settings, merged),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'business.financial_settings_updated',
      entityType: 'Business',
      entityId: businessId,
    });

    return this.toResponse(updated);
  }

  async getSettingsForBusiness(
    businessId: string,
  ): Promise<BusinessFinancialSettings> {
    const business = await this.requireBusiness(businessId);
    return extractFinancialSettings(business);
  }

  getSettings(business: Business): BusinessFinancialSettings {
    return extractFinancialSettings(business);
  }

  async allocateInvoiceNumber(businessId: string): Promise<string> {
    const business = await this.requireBusiness(businessId);
    const settings = extractFinancialSettings(business);
    const maxExisting = await this.findMaxInvoiceSequence(
      businessId,
      settings.invoice.prefix,
    );
    const sequence = Math.max(settings.invoice.nextNumber, maxExisting + 1);
    const invoiceNumber = formatDocumentNumber(
      settings.invoice.prefix,
      sequence,
    );

    settings.invoice.nextNumber = sequence + 1;
    await this.businessRepository.update(businessId, {
      settings: wrapFinancialSettings(business.settings, settings),
    });

    return invoiceNumber;
  }

  async allocateEstimateNumber(businessId: string): Promise<string> {
    const business = await this.requireBusiness(businessId);
    const settings = extractFinancialSettings(business);
    const maxExisting = await this.findMaxEstimateSequence(
      businessId,
      settings.estimate.prefix,
    );
    const sequence = Math.max(settings.estimate.nextNumber, maxExisting + 1);
    const estimateNumber = formatDocumentNumber(
      settings.estimate.prefix,
      sequence,
    );

    settings.estimate.nextNumber = sequence + 1;
    await this.businessRepository.update(businessId, {
      settings: wrapFinancialSettings(business.settings, settings),
    });

    return estimateNumber;
  }

  private async requireBusiness(businessId: string): Promise<Business> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return business;
  }

  private toResponse(business: Business): FinancialSettingsResponseDto {
    const settings = extractFinancialSettings(business);
    return {
      invoice: {
        ...settings.invoice,
        nextInvoiceNumberPreview: formatDocumentNumber(
          settings.invoice.prefix,
          settings.invoice.nextNumber,
        ),
      },
      estimate: {
        ...settings.estimate,
        nextEstimateNumberPreview: formatDocumentNumber(
          settings.estimate.prefix,
          settings.estimate.nextNumber,
        ),
      },
      taxesAndCurrency: settings.taxesAndCurrency,
    };
  }

  private async findMaxInvoiceSequence(
    businessId: string,
    prefix: string,
  ): Promise<number> {
    const invoices = await this.prisma.invoice.findMany({
      where: { businessId },
      select: { invoiceNumber: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return invoices.reduce(
      (max, row) =>
        Math.max(max, parseDocumentSequence(row.invoiceNumber, prefix)),
      0,
    );
  }

  private async findMaxEstimateSequence(
    businessId: string,
    prefix: string,
  ): Promise<number> {
    const estimates = await this.prisma.estimate.findMany({
      where: { businessId },
      select: { estimateNumber: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return estimates.reduce(
      (max, row) =>
        Math.max(max, parseDocumentSequence(row.estimateNumber, prefix)),
      0,
    );
  }
}
