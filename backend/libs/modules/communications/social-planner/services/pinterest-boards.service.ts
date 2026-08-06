import { HttpStatus, Injectable } from '@nestjs/common';
import { IntegrationResourceType, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import { PinterestTokenService } from '@app/modules/integrations/integrations/services/pinterest-token.service';
import { pinterestCreateBoard } from '../adapters/pinterest/pinterest-api.client';

@Injectable()
export class PinterestBoardsService {
  constructor(
    private readonly pinterestTokenService: PinterestTokenService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
  ) {}

  async createBoard(
    businessId: string,
    input: { name: string; description?: string },
  ): Promise<{
    id: string;
    externalId: string;
    name: string;
    providerKey: string;
    type: string;
  }> {
    const name = input.name.trim();
    if (!name) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Board name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'pinterest',
      );
    if (!integration) {
      throw new AppException(
        ErrorCode.SOCIAL_INTEGRATION_TOKEN_UNAVAILABLE,
        'Pinterest integration is not connected',
        HttpStatus.BAD_REQUEST,
      );
    }

    const accessToken =
      await this.pinterestTokenService.getAccessToken(businessId);

    const created = await pinterestCreateBoard({
      accessToken,
      name,
      description: input.description?.trim() || undefined,
      privacy: 'PUBLIC',
    });

    const now = new Date();
    const existing =
      await this.integrationResourceRepository.findManyByBusinessAndProvider(
        businessId,
        'pinterest',
      );
    const hasSelected = existing.some((r) => r.isSelected);

    await this.integrationResourceRepository.upsertMany(
      integration.id,
      businessId,
      'pinterest',
      [
        {
          externalId: created.id,
          name: created.name,
          type: IntegrationResourceType.PINTEREST_BOARD,
          metadata: {
            description: created.description ?? input.description ?? null,
            privacy: created.privacy ?? 'PUBLIC',
            source: 'create_board',
          } as Prisma.InputJsonValue,
          lastSyncedAt: now,
          isSelected: true,
          isDefault: !hasSelected,
        },
      ],
    );

    const resources =
      await this.integrationResourceRepository.findManyByBusinessAndProvider(
        businessId,
        'pinterest',
      );
    const resource = resources.find((r) => r.externalId === created.id);
    if (!resource) {
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Board was created on Pinterest but failed to save locally',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      id: resource.id,
      externalId: resource.externalId,
      name: resource.name,
      providerKey: resource.providerKey,
      type: resource.type,
    };
  }
}
