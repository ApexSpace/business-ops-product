import { Injectable } from '@nestjs/common';
import {
  IntegrationResource,
  IntegrationResourceType,
  IntegrationStatus,
} from '@prisma/client';
import {
  WhatsAppNumberResponseDto,
  WhatsAppOverviewResponseDto,
} from '../dto/whatsapp-numbers.dto';
import { BusinessIntegrationRepository } from '../repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../repositories/integration-resource.repository';
import {
  buildWhatsAppOverview,
  isWhatsAppPhoneResource,
  mapWhatsAppNumberResponse,
} from '../utils/whatsapp-number.util';

const WHATSAPP_PROVIDER_KEY = 'whatsapp';

@Injectable()
export class WhatsAppNumbersService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly resourceRepository: IntegrationResourceRepository,
  ) {}

  async getOverview(businessId: string): Promise<WhatsAppOverviewResponseDto> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        WHATSAPP_PROVIDER_KEY,
      );

    const connected = integration?.status === IntegrationStatus.CONNECTED;
    if (!connected || !integration) {
      return { connected: false };
    }

    const primary = await this.resolvePrimaryNumber(businessId);
    return buildWhatsAppOverview(true, integration, primary);
  }

  async listNumbers(businessId: string): Promise<WhatsAppNumberResponseDto[]> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        WHATSAPP_PROVIDER_KEY,
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      return [];
    }

    const primary = await this.resolvePrimaryNumber(businessId);
    if (!primary) {
      return [];
    }

    return [mapWhatsAppNumberResponse(primary)];
  }

  private async resolvePrimaryNumber(
    businessId: string,
  ): Promise<IntegrationResource | null> {
    const defaultResource = await this.resourceRepository.findDefault(
      businessId,
      WHATSAPP_PROVIDER_KEY,
      IntegrationResourceType.PHONE_NUMBER,
    );
    if (defaultResource) {
      return defaultResource;
    }

    const selected = await this.resourceRepository.findSelected(
      businessId,
      WHATSAPP_PROVIDER_KEY,
      IntegrationResourceType.PHONE_NUMBER,
    );
    if (selected.length > 0) {
      return selected[0] ?? null;
    }

    const resources = await this.resourceRepository.findManyByBusinessAndProvider(
      businessId,
      WHATSAPP_PROVIDER_KEY,
    );

    return resources.find(isWhatsAppPhoneResource) ?? null;
  }
}
