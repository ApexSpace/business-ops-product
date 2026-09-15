import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessCheckoutAdvancedSettings,
  InvoiceLineType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { UpdateCheckoutAdvancedSettingsDto } from '../dto/checkout-advanced-settings.dto';
import { CheckoutAdvancedSettingsResponseDto } from '../dto/checkout-advanced-settings.dto';
import { toCheckoutAdvancedSettingsResponse } from '../mappers/checkout-advanced-settings.mapper';
import { CheckoutAdvancedSettingsRepository } from '../repositories/checkout-advanced-settings.repository';
import type { CheckoutWithRelations } from '@app/modules/finance/invoices/repositories/checkout.repository';

function normalizePaymentMethodNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed.slice(0, 40));
  }
  return result.slice(0, 20);
}

function normalizeTipPercents(values: number[]): number[] {
  const unique = [...new Set(values.map((v) => Math.round(v)))].filter(
    (v) => v >= 1 && v <= 100,
  );
  if (unique.length === 0) {
    throw new Error('At least one tip percentage is required');
  }
  return unique.sort((a, b) => a - b).slice(0, 5);
}

@Injectable()
export class CheckoutAdvancedSettingsService {
  constructor(
    private readonly repository: CheckoutAdvancedSettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  async get(businessId: string): Promise<CheckoutAdvancedSettingsResponseDto> {
    const row = await this.repository.ensureSettings(businessId);
    return toCheckoutAdvancedSettingsResponse(row);
  }

  async getForCheckout(
    businessId: string,
  ): Promise<CheckoutAdvancedSettingsResponseDto> {
    return this.get(businessId);
  }

  async update(
    businessId: string,
    dto: UpdateCheckoutAdvancedSettingsDto,
    actor: RequestUser,
  ): Promise<CheckoutAdvancedSettingsResponseDto> {
    await this.repository.ensureSettings(businessId);
    const data: Prisma.BusinessCheckoutAdvancedSettingsUpdateInput = {};

    if (dto.customPaymentMethodNames !== undefined) {
      data.customPaymentMethodNames = normalizePaymentMethodNames(
        dto.customPaymentMethodNames,
      );
    }
    if (dto.tipButtonPercents !== undefined) {
      try {
        data.tipButtonPercents = normalizeTipPercents(dto.tipButtonPercents);
      } catch (error) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          error instanceof Error ? error.message : 'Invalid tip percentages',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (dto.hideTipButtons !== undefined) {
      data.hideTipButtons = dto.hideTipButtons;
    }
    if (dto.askClientsForTip !== undefined) {
      data.askClientsForTip = dto.askClientsForTip;
    }
    if (dto.askForTipProductsOnly !== undefined) {
      data.askForTipProductsOnly = dto.askForTipProductsOnly;
    }
    if (dto.askClientsForSignature !== undefined) {
      data.askClientsForSignature = dto.askClientsForSignature;
    }
    if (dto.enableCheckPayments !== undefined) {
      data.enableCheckPayments = dto.enableCheckPayments;
    }
    if (dto.showChangeCalculator !== undefined) {
      data.showChangeCalculator = dto.showChangeCalculator;
    }
    if (dto.showReceiptPreview !== undefined) {
      data.showReceiptPreview = dto.showReceiptPreview;
    }
    if (dto.requireStaffForServices !== undefined) {
      data.requireStaffForServices = dto.requireStaffForServices;
    }
    if (dto.requireStaffForProducts !== undefined) {
      data.requireStaffForProducts = dto.requireStaffForProducts;
    }
    if (dto.requireStaffForGiftCards !== undefined) {
      data.requireStaffForGiftCards = dto.requireStaffForGiftCards;
    }
    if (dto.requireStaffForPackages !== undefined) {
      data.requireStaffForPackages = dto.requireStaffForPackages;
    }
    if (dto.showServiceProviderOnReceipt !== undefined) {
      data.showServiceProviderOnReceipt = dto.showServiceProviderOnReceipt;
    }
    if (dto.receiptCustomFooterText !== undefined) {
      data.receiptCustomFooterText =
        dto.receiptCustomFooterText?.trim() || null;
    }

    const row = await this.repository.update(businessId, data);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'checkout_advanced_settings.updated',
      entityType: 'BusinessCheckoutAdvancedSettings',
      entityId: row.id,
    });

    return toCheckoutAdvancedSettingsResponse(row);
  }

  assertStaffRequirements(
    settings: BusinessCheckoutAdvancedSettings,
    checkout: CheckoutWithRelations,
    productAssignStaffByProductId: Record<string, boolean> = {},
  ): void {
    for (const item of checkout.items) {
      if (item.staffUserId) continue;

      const productAssignStaff = item.productId
        ? Boolean(productAssignStaffByProductId[item.productId])
        : false;
      const requiresStaff = this.lineRequiresStaff(
        settings,
        item.lineType,
        productAssignStaff,
      );
      if (requiresStaff) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `Staff assignment is required for line: ${item.title}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  lineRequiresStaff(
    settings: BusinessCheckoutAdvancedSettings,
    lineType: InvoiceLineType,
    productAssignStaff = false,
  ): boolean {
    switch (lineType) {
      case InvoiceLineType.SERVICE:
        return settings.requireStaffForServices;
      case InvoiceLineType.PRODUCT:
        return settings.requireStaffForProducts || productAssignStaff;
      case InvoiceLineType.GIFT_CARD:
        return settings.requireStaffForGiftCards;
      case InvoiceLineType.PACKAGE:
        return settings.requireStaffForPackages;
      default:
        return false;
    }
  }

  async ensureRow(businessId: string) {
    return this.repository.ensureSettings(businessId);
  }

  assertPaymentMethodAllowed(
    settings: BusinessCheckoutAdvancedSettings,
    method: string,
    reference?: string | null,
  ): void {
    if (method === 'CHECK' && !settings.enableCheckPayments) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Check payments are not enabled for this business',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (method === 'OTHER' && reference?.trim()) {
      const allowed = settings.customPaymentMethodNames.map((n) =>
        n.toLowerCase(),
      );
      if (
        allowed.length > 0 &&
        !allowed.includes(reference.trim().toLowerCase())
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Custom payment method is not configured',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
}
