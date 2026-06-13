import { HttpStatus, Injectable } from '@nestjs/common';
import {
  IntegrationResourceType,
  IntegrationStatus,
  WhatsAppTemplateCategory,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessIntegrationRepository } from '../../integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../integrations/repositories/integration-resource.repository';
import { MetaTokenService } from '../../integrations/meta/services/meta-token.service';
import { isWhatsAppPhoneResource } from '../../integrations/utils/whatsapp-number.util';

const WHATSAPP_PROVIDER_KEY = 'whatsapp';

export interface WhatsAppBusinessContext {
  wabaId: string;
  accessToken: string;
}

@Injectable()
export class WhatsAppBusinessContextService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly resourceRepository: IntegrationResourceRepository,
    private readonly metaTokenService: MetaTokenService,
  ) {}

  async requireConnectedContext(
    businessId: string,
  ): Promise<WhatsAppBusinessContext> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        WHATSAPP_PROVIDER_KEY,
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'WhatsApp is not connected for this business.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const wabaId = await this.resolveWabaId(businessId);
    const accessToken = await this.metaTokenService.getAccessToken(
      businessId,
      WHATSAPP_PROVIDER_KEY,
    );

    return { wabaId, accessToken };
  }

  private async resolveWabaId(businessId: string): Promise<string> {
    const defaultResource = await this.resourceRepository.findDefault(
      businessId,
      WHATSAPP_PROVIDER_KEY,
      IntegrationResourceType.PHONE_NUMBER,
    );
    const primary =
      defaultResource ??
      (await this.resourceRepository.findSelected(
        businessId,
        WHATSAPP_PROVIDER_KEY,
        IntegrationResourceType.PHONE_NUMBER,
      ))[0] ??
      (
        await this.resourceRepository.findManyByBusinessAndProvider(
          businessId,
          WHATSAPP_PROVIDER_KEY,
        )
      ).find(isWhatsAppPhoneResource);

    const metadata = primary?.metadata;
    const wabaId = readMetadataString(metadata, 'wabaId');
    if (!wabaId) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'No WhatsApp Business Account is synced for this business.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return wabaId;
  }
}

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function parseTemplateCategory(
  value: string,
): WhatsAppTemplateCategory {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === 'MARKETING' ||
    normalized === 'UTILITY' ||
    normalized === 'AUTHENTICATION'
  ) {
    return normalized;
  }
  throw new AppException(
    ErrorCode.VALIDATION_ERROR,
    'Invalid template category.',
    HttpStatus.BAD_REQUEST,
  );
}
