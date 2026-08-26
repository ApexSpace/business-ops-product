import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RootConfig } from '@app/core/config/configuration';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { assertStripeReadyForPayments } from '@app/modules/integrations/integrations/stripe/utils/stripe-readiness.util';
import { UpdatePackageSettingsDto } from '../dto/package.dto';
import { PackageSettingsRepository } from '../repositories/package-settings.repository';
import {
  isValidPackageSlug,
  slugifyPackageName,
} from '../utils/package-slug.util';

@Injectable()
export class PackageSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsRepository: PackageSettingsRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async getOrCreateSettings(businessId: string) {
    let settings = await this.settingsRepository.findByBusinessId(businessId);
    if (!settings) {
      settings = await this.settingsRepository.upsert(businessId, {});
    }
    return this.toResponse(businessId, settings);
  }

  async updateSettings(businessId: string, dto: UpdatePackageSettingsDto) {
    const settings = await this.settingsRepository.upsert(businessId, {
      onlineSalesEnabled: dto.onlineSalesEnabled,
    });

    if (dto.onlineSalesEnabled) {
      await this.ensurePublicSlug(businessId);
    }

    return this.toResponse(businessId, settings);
  }

  async ensurePublicSlug(businessId: string): Promise<string> {
    const settings = await this.settingsRepository.findByBusinessId(businessId);
    if (settings?.publicSlug) return settings.publicSlug;

    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { name: true, displayName: true },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const base = slugifyPackageName(business.displayName ?? business.name);
    let candidate = base || 'packages';
    let suffix = 0;

    while (await this.settingsRepository.isSlugTaken(candidate, businessId)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    if (!isValidPackageSlug(candidate)) {
      candidate = `biz-${businessId.slice(0, 8)}`;
    }

    await this.settingsRepository.upsert(businessId, {
      publicSlug: candidate,
    });
    return candidate;
  }

  private async toResponse(
    businessId: string,
    settings: { onlineSalesEnabled: boolean; publicSlug: string | null },
  ) {
    const frontendUrl = this.configService.get('app', {
      infer: true,
    }).frontendUrl;
    const appDomain = new URL(frontendUrl).host;
    const slug =
      settings.onlineSalesEnabled && settings.publicSlug
        ? settings.publicSlug
        : settings.publicSlug;

    const shareableLink = slug ? `${frontendUrl}/packages/${slug}` : null;
    const overlayLink = shareableLink;
    const embedScript = slug
      ? `<script>window.PandaCue = window.PandaCue || window.CodeSol || {}; window.CodeSol = window.PandaCue; window.PandaCue.CompanyId = "${businessId}";</script><script src="https://booking.${appDomain}/app.js" async></script>`
      : null;
    const stripeReady = await this.isStripeReady(businessId);

    return {
      onlineSalesEnabled: settings.onlineSalesEnabled,
      publicSlug: slug,
      shareableLink,
      embedScript,
      overlayLink,
      stripeReady,
    };
  }

  async isStripeReady(businessId: string): Promise<boolean> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'stripe',
      );
    try {
      assertStripeReadyForPayments(integration);
      return true;
    } catch {
      return false;
    }
  }
}
