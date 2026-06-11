import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationResourceStatus,
  IntegrationResourceType,
  IntegrationStatus,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import {
  EMAIL_PROVIDER_KEY,
  PLATFORM_EMAIL_METADATA_TYPE,
  PLATFORM_EMAIL_RESOURCE_EXTERNAL_ID,
} from '@app/modules/communications/email/constants/email-platform.constants';
import {
  buildPlatformFromAddress,
  slugifyBusinessName,
} from '@app/modules/communications/email/utils/email-slug.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../repositories/integration-resource.repository';

export interface PlatformEmailProvisioningResult {
  integrationId: string;
  resourceId: string;
  fromName: string;
  fromAddress: string;
  slug: string;
  sendingDomain: string;
}

@Injectable()
export class PlatformEmailProvisioningService {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly businessRepository: BusinessRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
  ) {}

  /** Idempotent — provisions platform shared email or returns the existing mailbox. */
  async ensurePlatformDefaultEmail(
    businessId: string,
  ): Promise<PlatformEmailProvisioningResult | null> {
    const emailConfig = this.configService.get('email', { infer: true });
    if (!emailConfig.enabled || !emailConfig.resend.apiKey) {
      return null;
    }

    return this.connectPlatformDefaultEmail(businessId);
  }

  async connectPlatformDefaultEmail(
    businessId: string,
  ): Promise<PlatformEmailProvisioningResult> {
    const emailConfig = this.configService.get('email', { infer: true });
    if (!emailConfig.enabled || !emailConfig.resend.apiKey) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Platform email is not configured. Enable EMAIL_ENABLED and set RESEND_API_KEY.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingResource =
      await this.integrationResourceRepository.findDefault(
        businessId,
        EMAIL_PROVIDER_KEY,
        IntegrationResourceType.EMAIL_ACCOUNT,
      );
    if (existingResource) {
      const metadata = (existingResource.metadata ?? {}) as Record<string, unknown>;
      if (metadata.type === PLATFORM_EMAIL_METADATA_TYPE) {
        return {
          integrationId: existingResource.businessIntegrationId,
          resourceId: existingResource.id,
          fromName:
            typeof metadata.fromName === 'string'
              ? metadata.fromName
              : business.name,
          fromAddress:
            typeof metadata.fromAddress === 'string'
              ? metadata.fromAddress
              : '',
          slug: typeof metadata.slug === 'string' ? metadata.slug : '',
          sendingDomain:
            typeof metadata.sendingDomain === 'string'
              ? metadata.sendingDomain
              : emailConfig.platform.sendingDomain,
        };
      }
    }

    const sendingDomain = emailConfig.platform.sendingDomain;
    const slug = await this.generateUniqueSlug(business.name, businessId);
    const fromAddress = buildPlatformFromAddress(slug, sendingDomain);
    const fromName = business.name;

    const integration = await this.businessIntegrationRepository.upsert(
      businessId,
      EMAIL_PROVIDER_KEY,
      {
        status: IntegrationStatus.CONNECTED,
        config: {
          mode: PLATFORM_EMAIL_METADATA_TYPE,
          sendingDomain,
          inboundDomain: emailConfig.platform.inboundDomain,
        } as Prisma.InputJsonValue,
        credentials: Prisma.DbNull,
        connectedAccountName: fromName,
        connectedAccountEmail: fromAddress,
        connectedAt: new Date(),
        errorMessage: null,
      },
    );

    const metadata = {
      type: PLATFORM_EMAIL_METADATA_TYPE,
      slug,
      fromName,
      fromAddress,
      sendingDomain,
      inboundDomain: emailConfig.platform.inboundDomain,
    } satisfies Record<string, string>;

    const [resource] = await this.integrationResourceRepository.upsertMany(
      integration.id,
      businessId,
      EMAIL_PROVIDER_KEY,
      [
        {
          externalId: PLATFORM_EMAIL_RESOURCE_EXTERNAL_ID,
          name: `${fromName} (CodeSol Email)`,
          type: IntegrationResourceType.EMAIL_ACCOUNT,
          metadata,
          status: IntegrationResourceStatus.ACTIVE,
          isSelected: true,
          isDefault: true,
          lastSyncedAt: new Date(),
        },
      ],
    );

    return {
      integrationId: integration.id,
      resourceId: resource.id,
      fromName,
      fromAddress,
      slug,
      sendingDomain,
    };
  }

  private async generateUniqueSlug(
    businessName: string,
    businessId: string,
  ): Promise<string> {
    const base = slugifyBusinessName(businessName);
    let slug = base;
    let counter = 1;

    while (
      await this.integrationResourceRepository.findBySlugForProvider(
        EMAIL_PROVIDER_KEY,
        slug,
        businessId,
      )
    ) {
      const suffix = String(counter);
      slug = `${base.slice(0, Math.max(1, 30 - suffix.length))}${suffix}`;
      counter += 1;
    }

    return slug;
  }
}
