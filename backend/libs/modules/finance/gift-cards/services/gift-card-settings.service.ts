import { HttpStatus, Injectable } from '@nestjs/common';
import { GiftCardSettings } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { R2StorageProvider } from '@app/modules/storage/providers/r2-storage.provider';
import { GIFT_CARD_ARTWORK_PRESETS } from '../constants/artwork-presets';
import {
  GiftCardSettingsResponseDto,
  UpdateGiftCardSettingsArtworkDto,
  UpdateGiftCardSettingsOnlineSalesDto,
  UpdateGiftCardSettingsPreferencesDto,
} from '../dto/gift-card.dto';
import { toGiftCardSettings } from '../mappers/gift-card.mapper';
import { GiftCardSettingsRepository } from '../repositories/gift-card-settings.repository';
import {
  isValidBookingSlug,
  slugifyGiftCardPublicSlug,
} from '../utils/gift-card-slug.util';

@Injectable()
export class GiftCardSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsRepository: GiftCardSettingsRepository,
    private readonly r2StorageProvider: R2StorageProvider,
  ) {}

  async getOrCreateSettings(
    businessId: string,
  ): Promise<GiftCardSettingsResponseDto> {
    let row = await this.ensureSettings(businessId);
    if (row.onlineSalesEnabled && !row.publicSlug) {
      await this.ensurePublicSlug(businessId);
      row = (await this.settingsRepository.findByBusinessId(businessId)) ?? row;
    }
    return toGiftCardSettings(row);
  }

  async updateOnlineSales(
    businessId: string,
    dto: UpdateGiftCardSettingsOnlineSalesDto,
  ): Promise<GiftCardSettingsResponseDto> {
    const publicSlug = dto.enabled
      ? await this.ensurePublicSlug(businessId)
      : undefined;

    const row = await this.settingsRepository.upsert(businessId, {
      onlineSalesEnabled: dto.enabled,
      ...(publicSlug ? { publicSlug } : {}),
      ...(dto.purchaseDisclaimer !== undefined
        ? { purchaseDisclaimer: dto.purchaseDisclaimer?.trim() || null }
        : {}),
      ...(dto.internalNotifyEmail !== undefined
        ? { internalNotifyEmail: dto.internalNotifyEmail?.trim() || null }
        : {}),
    });
    return toGiftCardSettings(row);
  }

  async updateArtwork(
    businessId: string,
    dto: UpdateGiftCardSettingsArtworkDto,
  ): Promise<GiftCardSettingsResponseDto> {
    const key = dto.artworkKey.trim();
    const isPreset = GIFT_CARD_ARTWORK_PRESETS.some((p) => p.key === key);
    if (
      !isPreset &&
      !key.startsWith(`businesses/${businessId}/gift-card-artwork/`)
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid artwork key',
        HttpStatus.BAD_REQUEST,
      );
    }
    const row = await this.settingsRepository.upsert(businessId, {
      selectedArtworkKey: key,
    });
    return toGiftCardSettings(row);
  }

  async updatePreferences(
    businessId: string,
    dto: UpdateGiftCardSettingsPreferencesDto,
  ): Promise<GiftCardSettingsResponseDto> {
    const row = await this.settingsRepository.upsert(businessId, {
      autoGenerateNumber: dto.autoGenerateNumber,
    });
    return toGiftCardSettings(row);
  }

  async generateArtworkUploadUrl(
    businessId: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; objectKey: string }> {
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const objectKey = `businesses/${businessId}/gift-card-artwork/${crypto.randomUUID()}.${ext}`;
    const { uploadUrl } = await this.r2StorageProvider.createSignedUploadUrl({
      objectKey,
      mimeType: contentType,
      size: 5 * 1024 * 1024,
    });
    return { uploadUrl, objectKey };
  }

  async ensurePublicSlug(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true, displayName: true },
    });
    const canonicalBase = slugifyGiftCardPublicSlug(
      business.displayName ?? business.name ?? 'gift-cards',
    );
    const existing = await this.settingsRepository.findByBusinessId(businessId);

    if (
      existing?.publicSlug &&
      this.slugMatchesBusiness(existing.publicSlug, canonicalBase)
    ) {
      return existing.publicSlug;
    }

    const slug = await this.allocateUniqueSlug(canonicalBase, businessId);
    const row = await this.settingsRepository.upsert(businessId, {
      publicSlug: slug,
    });
    return row.publicSlug!;
  }

  private slugMatchesBusiness(slug: string, base: string): boolean {
    return slug === base || slug.startsWith(`${base}-`);
  }

  resolveArtworkUrl(settings: GiftCardSettings | null): string | null {
    const key = settings?.selectedArtworkKey;
    if (!key) return null;
    if (GIFT_CARD_ARTWORK_PRESETS.some((p) => p.key === key)) {
      return `/gift-cards/artwork/${key}.jpg`;
    }
    return key;
  }

  private async ensureSettings(businessId: string): Promise<GiftCardSettings> {
    const existing = await this.settingsRepository.findByBusinessId(businessId);
    if (existing) return existing;
    return this.settingsRepository.upsert(businessId, {});
  }

  private async allocateUniqueSlug(
    base: string,
    businessId: string,
  ): Promise<string> {
    const candidate = isValidBookingSlug(base) ? base : 'gift-cards';

    for (let i = 0; i < 100; i++) {
      const suffix = i === 0 ? '' : `-${i}`;
      const slug = `${candidate}${suffix}`.slice(0, 80);
      if (!isValidBookingSlug(slug)) continue;

      const taken = await this.settingsRepository.findByPublicSlug(slug);
      if (!taken || taken.businessId === businessId) return slug;
    }

    return `gc-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
}
