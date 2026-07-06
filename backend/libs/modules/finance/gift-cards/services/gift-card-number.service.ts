import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { GiftCardSettingsRepository } from '../repositories/gift-card-settings.repository';
import { GiftCardRepository } from '../repositories/gift-card.repository';

@Injectable()
export class GiftCardNumberService {
  constructor(
    private readonly giftCardRepository: GiftCardRepository,
    private readonly settingsRepository: GiftCardSettingsRepository,
  ) {}

  async generate(businessId: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const number = String(Math.floor(100000 + Math.random() * 900000));
      const existing = await this.giftCardRepository.findByNumber(
        businessId,
        number,
      );
      if (!existing) return number;
    }
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Unable to generate a unique gift card number',
      HttpStatus.BAD_REQUEST,
    );
  }

  async validate(businessId: string, number: string): Promise<void> {
    const trimmed = number.trim();
    if (!trimmed) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Gift card number is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const existing = await this.giftCardRepository.findByNumber(
      businessId,
      trimmed,
    );
    if (existing) {
      throw new AppException(
        ErrorCode.GIFT_CARD_NUMBER_EXISTS,
        'A gift card with this number already exists',
        HttpStatus.CONFLICT,
      );
    }
  }

  async resolveNumber(
    businessId: string,
    provided?: string | null,
    forceGenerate = false,
  ): Promise<string> {
    if (provided?.trim()) {
      const number = provided.trim();
      await this.validate(businessId, number);
      return number;
    }
    if (forceGenerate) {
      return this.generate(businessId);
    }
    const settings = await this.settingsRepository.findByBusinessId(businessId);
    if (settings?.autoGenerateNumber) {
      return this.generate(businessId);
    }
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Gift card number is required',
      HttpStatus.BAD_REQUEST,
    );
  }
}
