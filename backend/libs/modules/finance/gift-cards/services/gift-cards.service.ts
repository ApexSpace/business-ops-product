import { HttpStatus, Injectable } from '@nestjs/common';
import {
  GiftCardSource,
  GiftCardStatus,
  GiftCardTransactionType,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  AdjustGiftCardBalanceDto,
  CreateFromPosSaleDto,
  CreateGiftCardManualDto,
  GiftCardDetailResponseDto,
  GiftCardListItemResponseDto,
  ListGiftCardsQueryDto,
  OnlinePurchaseMetadata,
  UpdateGiftCardDto,
} from '../dto/gift-card.dto';
import {
  toGiftCardDetail,
  toGiftCardListItem,
} from '../mappers/gift-card.mapper';
import { GiftCardRepository } from '../repositories/gift-card.repository';
import { GiftCardEmailService } from './gift-card-email.service';
import { GiftCardNumberService } from './gift-card-number.service';
import { GiftCardSettingsService } from './gift-card-settings.service';
import { GiftCardPromotionRepository } from '../repositories/gift-card-promotion.repository';
import { GiftCardSettingsRepository } from '../repositories/gift-card-settings.repository';

@Injectable()
export class GiftCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly giftCardRepository: GiftCardRepository,
    private readonly contactRepository: ContactRepository,
    private readonly numberService: GiftCardNumberService,
    private readonly settingsService: GiftCardSettingsService,
    private readonly settingsRepository: GiftCardSettingsRepository,
    private readonly promotionRepository: GiftCardPromotionRepository,
    private readonly emailService: GiftCardEmailService,
    private readonly auditService: AuditService,
  ) {}

  async createManual(
    businessId: string,
    dto: CreateGiftCardManualDto,
    actor: RequestUser,
  ): Promise<GiftCardDetailResponseDto> {
    await this.assertContact(businessId, dto.ownerContactId);
    if (dto.purchasingContactId) {
      await this.assertContact(businessId, dto.purchasingContactId);
    }

    const number = await this.numberService.resolveNumber(
      businessId,
      dto.number,
    );
    const initialValue = new Prisma.Decimal(dto.initialValue.toFixed(2));
    const settings = await this.settingsRepository.findByBusinessId(businessId);

    const row = await this.giftCardRepository.createWithTransaction(
      {
        business: { connect: { id: businessId } },
        number,
        initialValue,
        currentBalance: initialValue,
        source: GiftCardSource.MANUAL,
        notes: dto.notes?.trim() || null,
        ownerContact: { connect: { id: dto.ownerContactId } },
        ...(dto.purchasingContactId
          ? { purchasingContact: { connect: { id: dto.purchasingContactId } } }
          : {}),
        artworkUrl: this.settingsService.resolveArtworkUrl(settings),
      },
      {
        businessId,
        type: GiftCardTransactionType.INITIAL_VALUE,
        amount: initialValue,
      },
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'gift_card.created',
      entityType: 'GiftCard',
      entityId: row.id,
    });

    return toGiftCardDetail(row);
  }

  async createFromPosSale(
    businessId: string,
    invoiceId: string,
    dto: CreateFromPosSaleDto,
  ): Promise<GiftCardDetailResponseDto> {
    await this.assertContact(businessId, dto.ownerContactId);
    if (dto.purchasingContactId) {
      await this.assertContact(businessId, dto.purchasingContactId);
    }

    const number = await this.numberService.resolveNumber(
      businessId,
      dto.number,
    );
    const initialValue = new Prisma.Decimal(dto.initialValue.toFixed(2));
    const settings = await this.settingsRepository.findByBusinessId(businessId);

    const row = await this.giftCardRepository.createWithTransaction(
      {
        business: { connect: { id: businessId } },
        number,
        initialValue,
        currentBalance: initialValue,
        source: GiftCardSource.POS_SALE,
        ownerContact: { connect: { id: dto.ownerContactId } },
        ...(dto.purchasingContactId
          ? { purchasingContact: { connect: { id: dto.purchasingContactId } } }
          : {}),
        invoice: { connect: { id: invoiceId } },
        artworkUrl: this.settingsService.resolveArtworkUrl(settings),
      },
      {
        businessId,
        type: GiftCardTransactionType.INITIAL_VALUE,
        amount: initialValue,
        invoiceId,
      },
    );

    if (dto.sendDigital) {
      const business = await this.prisma.business.findUniqueOrThrow({
        where: { id: businessId },
      });
      await this.emailService.sendGiftCardEmail(row, business, settings);
    }

    return toGiftCardDetail(row);
  }

  async createFromOnlinePurchase(
    businessId: string,
    metadata: OnlinePurchaseMetadata,
  ): Promise<GiftCardDetailResponseDto> {
    const ownerContact = await this.findOrCreateContactByEmail(
      businessId,
      metadata.recipientEmail,
      metadata.recipientName,
    );
    const purchaserContact = await this.findOrCreateContactByEmail(
      businessId,
      metadata.purchaserEmail,
      metadata.purchaserName,
    );

    const number = await this.numberService.generate(businessId);
    const initialValue = new Prisma.Decimal(metadata.cardValue.toFixed(2));
    const settings = await this.settingsRepository.findByBusinessId(businessId);

    let promotionId: string | undefined;
    if (metadata.promotionId) {
      const promotion = await this.promotionRepository.findById(
        businessId,
        metadata.promotionId,
      );
      if (!promotion) {
        throw new AppException(
          ErrorCode.GIFT_CARD_PROMOTION_NOT_FOUND,
          'Promotion not found',
          HttpStatus.NOT_FOUND,
        );
      }
      promotionId = promotion.id;
    }

    const row = await this.giftCardRepository.createWithTransaction(
      {
        business: { connect: { id: businessId } },
        number,
        initialValue,
        currentBalance: initialValue,
        source: GiftCardSource.ONLINE_PURCHASE,
        ownerContact: { connect: { id: ownerContact.id } },
        purchasingContact: { connect: { id: purchaserContact.id } },
        ...(promotionId ? { promotion: { connect: { id: promotionId } } } : {}),
        artworkUrl: this.settingsService.resolveArtworkUrl(settings),
        notes: this.buildOnlinePurchaseNotes(metadata),
      },
      {
        businessId,
        type: GiftCardTransactionType.INITIAL_VALUE,
        amount: initialValue,
      },
    );

    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });

    const salePrice = metadata.promotionId
      ? ((
          await this.promotionRepository.findById(
            businessId,
            metadata.promotionId,
          )
        )?.salePrice.toFixed(2) ?? initialValue.toFixed(2))
      : initialValue.toFixed(2);

    await this.emailService.sendGiftCardEmail(row, business, settings);
    await this.emailService.sendPurchaseConfirmation(
      row,
      business,
      metadata.purchaserEmail,
      metadata.purchaserName,
      salePrice,
      metadata.recipientEmail,
    );
    if (settings?.internalNotifyEmail) {
      await this.emailService.sendInternalNotification(
        row,
        business,
        settings.internalNotifyEmail,
        metadata.purchaserName,
        metadata.recipientName,
      );
    }

    return toGiftCardDetail(row);
  }

  async findAll(
    businessId: string,
    query: ListGiftCardsQueryDto,
  ): Promise<{
    items: GiftCardListItemResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { skip, take, page, limit } = getPaginationParams(query);
    const { items, total } = await this.giftCardRepository.findMany(
      businessId,
      {
        skip,
        take,
        search: query.search,
        redeemableOnly: query.redeemableOnly,
      },
    );
    return {
      items: items.map(toGiftCardListItem),
      meta: { total, page, limit },
    };
  }

  async findOne(
    businessId: string,
    id: string,
  ): Promise<GiftCardDetailResponseDto> {
    const row = await this.giftCardRepository.findById(businessId, id);
    if (!row) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NOT_FOUND,
        'Gift card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toGiftCardDetail(row);
  }

  async findByContact(
    businessId: string,
    contactId: string,
  ): Promise<GiftCardListItemResponseDto[]> {
    await this.assertContact(businessId, contactId);
    const rows = await this.giftCardRepository.findByOwnerContact(
      businessId,
      contactId,
    );
    return rows.map(toGiftCardListItem);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateGiftCardDto,
    actor: RequestUser,
  ): Promise<GiftCardDetailResponseDto> {
    const existing = await this.giftCardRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NOT_FOUND,
        'Gift card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (dto.ownerContactId) {
      await this.assertContact(businessId, dto.ownerContactId);
    }

    const row = await this.giftCardRepository.update(businessId, id, {
      ...(dto.ownerContactId ? { ownerContactId: dto.ownerContactId } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
    });
    if (!row) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NOT_FOUND,
        'Gift card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'gift_card.updated',
      entityType: 'GiftCard',
      entityId: id,
    });

    return toGiftCardDetail(row);
  }

  async adjustBalance(
    businessId: string,
    id: string,
    dto: AdjustGiftCardBalanceDto,
    actor: RequestUser,
  ): Promise<GiftCardDetailResponseDto> {
    const existing = await this.giftCardRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NOT_FOUND,
        'Gift card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (existing.status === GiftCardStatus.VOIDED) {
      throw new AppException(
        ErrorCode.GIFT_CARD_INVALID,
        'Cannot adjust a voided gift card',
        HttpStatus.BAD_REQUEST,
      );
    }

    const delta = new Prisma.Decimal(dto.amount.toFixed(2));
    const newBalance = existing.currentBalance.add(delta);
    if (newBalance.lessThan(0)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Adjustment would result in negative balance',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nextStatus = newBalance.lessThanOrEqualTo(0)
      ? GiftCardStatus.DEPLETED
      : GiftCardStatus.ACTIVE;

    const row = await this.giftCardRepository.applyTransaction(
      businessId,
      id,
      {
        type: GiftCardTransactionType.ADJUSTMENT,
        amount: delta,
        note: dto.note.trim(),
      },
      newBalance,
      nextStatus,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'gift_card.balance_adjusted',
      entityType: 'GiftCard',
      entityId: id,
    });

    return toGiftCardDetail(row);
  }

  async voidGiftCard(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<GiftCardDetailResponseDto> {
    const existing = await this.giftCardRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NOT_FOUND,
        'Gift card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (existing.status === GiftCardStatus.VOIDED) {
      return toGiftCardDetail(existing);
    }

    const row = await this.giftCardRepository.applyTransaction(
      businessId,
      id,
      {
        type: GiftCardTransactionType.VOID,
        amount: existing.currentBalance.negated(),
        note: 'Gift card voided',
      },
      new Prisma.Decimal(0),
      GiftCardStatus.VOIDED,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'gift_card.voided',
      entityType: 'GiftCard',
      entityId: id,
    });

    return toGiftCardDetail(row);
  }

  async sendDigital(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<{ sent: boolean }> {
    const row = await this.giftCardRepository.findById(businessId, id);
    if (!row) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NOT_FOUND,
        'Gift card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (!row.ownerContact.email?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Owner contact has no email address',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    const settings = await this.settingsRepository.findByBusinessId(businessId);
    await this.emailService.sendGiftCardEmail(row, business, settings, {
      allowResend: true,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'gift_card.digital_sent',
      entityType: 'GiftCard',
      entityId: id,
    });

    return { sent: true };
  }

  async handleSaleRefund(
    businessId: string,
    giftCardId: string,
    refundAmount: number,
    invoiceId: string,
  ): Promise<void> {
    const existing = await this.giftCardRepository.findById(
      businessId,
      giftCardId,
    );
    if (!existing) return;

    const credit = new Prisma.Decimal(refundAmount.toFixed(2));
    const newBalance = existing.currentBalance.add(credit);
    const nextStatus = newBalance.greaterThan(0)
      ? GiftCardStatus.ACTIVE
      : existing.status;

    await this.giftCardRepository.applyTransaction(
      businessId,
      giftCardId,
      {
        type: GiftCardTransactionType.REFUND,
        amount: credit,
        invoiceId,
      },
      newBalance,
      nextStatus,
    );
  }

  async previewNumber(businessId: string): Promise<{ number: string | null }> {
    const settings = await this.settingsRepository.findByBusinessId(businessId);
    if (!settings?.autoGenerateNumber) return { number: null };
    const number = await this.numberService.generate(businessId);
    return { number };
  }

  private async assertContact(
    businessId: string,
    contactId: string,
  ): Promise<void> {
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

  private async findOrCreateContactByEmail(
    businessId: string,
    email: string,
    name: string,
  ) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.contactRepository.findByEmail(
      businessId,
      normalized,
    );
    if (existing) return existing;

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] ?? name;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;

    return this.prisma.contact.create({
      data: {
        businessId,
        email: normalized,
        firstName,
        lastName,
        displayName: name.trim(),
        source: 'gift_card_online',
      },
    });
  }

  private buildOnlinePurchaseNotes(
    metadata: OnlinePurchaseMetadata,
  ): string | null {
    const parts: string[] = [];
    if (metadata.stripePaymentIntentId) {
      parts.push(metadata.stripePaymentIntentId);
    } else if (metadata.stripeSessionId) {
      parts.push(metadata.stripeSessionId);
    }
    if (metadata.giftMessage?.trim()) {
      parts.push(`Message: ${metadata.giftMessage.trim()}`);
    }
    return parts.length > 0 ? parts.join('\n') : null;
  }
}
