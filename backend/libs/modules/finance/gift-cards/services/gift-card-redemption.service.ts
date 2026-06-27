import { HttpStatus, Injectable } from '@nestjs/common';
import {
  GiftCardStatus,
  GiftCardTransactionType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { GiftCardRepository } from '../repositories/gift-card.repository';

export interface GiftCardRedemptionResult {
  amountApplied: string;
  remainingCardBalance: string;
  giftCardId: string;
}

@Injectable()
export class GiftCardRedemptionService {
  constructor(private readonly giftCardRepository: GiftCardRepository) {}

  async redeem(
    businessId: string,
    giftCardId: string,
    amountRequested: number,
    invoiceId: string,
  ): Promise<GiftCardRedemptionResult> {
    const card = await this.giftCardRepository.findById(businessId, giftCardId);
    if (!card) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NOT_FOUND,
        'Gift card not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (card.status === GiftCardStatus.VOIDED) {
      throw new AppException(
        ErrorCode.GIFT_CARD_INVALID,
        'Gift card has been voided',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      card.status === GiftCardStatus.DEPLETED ||
      card.currentBalance.lessThanOrEqualTo(0)
    ) {
      throw new AppException(
        ErrorCode.GIFT_CARD_INVALID,
        'Gift card has no remaining balance',
        HttpStatus.BAD_REQUEST,
      );
    }

    const requested = new Prisma.Decimal(amountRequested.toFixed(2));
    if (requested.greaterThan(card.currentBalance)) {
      throw new AppException(
        ErrorCode.GIFT_CARD_INVALID,
        `Gift card balance is ${card.currentBalance.toFixed(2)}; cannot apply ${requested.toFixed(2)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const amountToApply = requested;
    const newBalance = card.currentBalance.sub(amountToApply);
    const nextStatus =
      newBalance.lessThanOrEqualTo(0)
        ? GiftCardStatus.DEPLETED
        : GiftCardStatus.ACTIVE;

    await this.giftCardRepository.applyTransaction(
      businessId,
      giftCardId,
      {
        type: GiftCardTransactionType.REDEMPTION,
        amount: amountToApply.negated(),
        invoiceId,
      },
      newBalance,
      nextStatus,
    );

    return {
      giftCardId,
      amountApplied: amountToApply.toFixed(2),
      remainingCardBalance: newBalance.toFixed(2),
    };
  }
}
