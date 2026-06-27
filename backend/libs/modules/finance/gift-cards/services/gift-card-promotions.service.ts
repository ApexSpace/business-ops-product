import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  CreateGiftCardPromotionDto,
  GiftCardPromotionResponseDto,
  ReorderGiftCardPromotionsDto,
  UpdateGiftCardPromotionDto,
} from '../dto/gift-card.dto';
import { toGiftCardPromotion } from '../mappers/gift-card.mapper';
import { GiftCardPromotionRepository } from '../repositories/gift-card-promotion.repository';
import { GiftCardRepository } from '../repositories/gift-card.repository';

@Injectable()
export class GiftCardPromotionsService {
  constructor(
    private readonly promotionRepository: GiftCardPromotionRepository,
    private readonly giftCardRepository: GiftCardRepository,
  ) {}

  async create(
    businessId: string,
    dto: CreateGiftCardPromotionDto,
  ): Promise<GiftCardPromotionResponseDto> {
    this.assertPricing(dto.salePrice, dto.cardValue);
    const sortOrder =
      (await this.promotionRepository.maxSortOrder(businessId)) + 1;
    const row = await this.promotionRepository.create({
      business: { connect: { id: businessId } },
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      cardValue: new Prisma.Decimal(dto.cardValue),
      salePrice: new Prisma.Decimal(dto.salePrice),
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      sortOrder,
    });
    return toGiftCardPromotion(row);
  }

  async findAll(businessId: string): Promise<GiftCardPromotionResponseDto[]> {
    const rows = await this.promotionRepository.findAll(businessId);
    return rows.map(toGiftCardPromotion);
  }

  async findActive(businessId: string): Promise<GiftCardPromotionResponseDto[]> {
    const rows = await this.promotionRepository.findActive(businessId);
    return rows.map(toGiftCardPromotion);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateGiftCardPromotionDto,
  ): Promise<GiftCardPromotionResponseDto> {
    const existing = await this.promotionRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.GIFT_CARD_PROMOTION_NOT_FOUND,
        'Promotion not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const cardValue =
      dto.cardValue !== undefined
        ? dto.cardValue
        : Number(existing.cardValue.toString());
    const salePrice =
      dto.salePrice !== undefined
        ? dto.salePrice
        : Number(existing.salePrice.toString());
    this.assertPricing(salePrice, cardValue);

    const row = await this.promotionRepository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.cardValue !== undefined
        ? { cardValue: new Prisma.Decimal(dto.cardValue) }
        : {}),
      ...(dto.salePrice !== undefined
        ? { salePrice: new Prisma.Decimal(dto.salePrice) }
        : {}),
      ...(dto.startDate !== undefined
        ? { startDate: new Date(dto.startDate) }
        : {}),
      ...(dto.endDate !== undefined
        ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    if (!row) {
      throw new AppException(
        ErrorCode.GIFT_CARD_PROMOTION_NOT_FOUND,
        'Promotion not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toGiftCardPromotion(row);
  }

  async delete(businessId: string, id: string): Promise<void> {
    const existing = await this.promotionRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.GIFT_CARD_PROMOTION_NOT_FOUND,
        'Promotion not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const refCount = await this.giftCardRepository.countByPromotion(
      businessId,
      id,
    );
    if (refCount > 0) {
      await this.promotionRepository.update(businessId, id, {
        isActive: false,
        endDate: new Date(0),
        startDate: new Date(0),
      });
      return;
    }
    await this.promotionRepository.delete(businessId, id);
  }

  async reorder(
    businessId: string,
    dto: ReorderGiftCardPromotionsDto,
  ): Promise<GiftCardPromotionResponseDto[]> {
    await this.promotionRepository.reorder(businessId, dto.orderedIds);
    return this.findAll(businessId);
  }

  async reactivate(
    businessId: string,
    id: string,
    startDate?: string,
    endDate?: string | null,
  ): Promise<GiftCardPromotionResponseDto> {
    const row = await this.promotionRepository.update(businessId, id, {
      isActive: true,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
    });
    if (!row) {
      throw new AppException(
        ErrorCode.GIFT_CARD_PROMOTION_NOT_FOUND,
        'Promotion not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toGiftCardPromotion(row);
  }

  private assertPricing(salePrice: number, cardValue: number): void {
    if (salePrice > cardValue) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Sale price cannot exceed gift card value',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
