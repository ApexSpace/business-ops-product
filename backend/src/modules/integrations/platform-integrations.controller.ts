import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '../../common/dto/confirm-delete-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { PlatformRoles } from '../../common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '../../common/guards/platform-roles.guard';
import {
  ConnectIntegrationDto,
  CreateIntegrationProviderDto,
  IntegrationProviderResponseDto,
  PlatformIntegrationProviderWithStatusDto,
  PlatformIntegrationResponseDto,
  UpdateIntegrationDto,
  UpdateIntegrationProviderDto,
} from './dto/integration.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/integrations')
@UseGuards(PlatformRolesGuard)
export class PlatformIntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('providers')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  listProviders(): Promise<PlatformIntegrationProviderWithStatusDto[]> {
    return this.integrationsService.listPlatformProviders();
  }

  @Post('providers')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  createProvider(
    @Body() dto: CreateIntegrationProviderDto,
    @CurrentUser() user: RequestUser,
  ): Promise<IntegrationProviderResponseDto> {
    return this.integrationsService.createProvider(dto, user);
  }

  @Patch('providers/:id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  updateProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntegrationProviderDto,
    @CurrentUser() user: RequestUser,
  ): Promise<IntegrationProviderResponseDto> {
    return this.integrationsService.updateProvider(id, dto, user);
  }

  @Get()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  list(): Promise<PlatformIntegrationResponseDto[]> {
    return this.integrationsService.listPlatformIntegrations();
  }

  @Get(':providerKey')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  get(
    @Param('providerKey') providerKey: string,
  ): Promise<PlatformIntegrationResponseDto> {
    return this.integrationsService.getPlatformIntegration(providerKey);
  }

  @Post(':providerKey/connect')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  connect(
    @Param('providerKey') providerKey: string,
    @Body() dto: ConnectIntegrationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlatformIntegrationResponseDto> {
    return this.integrationsService.connectPlatformIntegration(
      providerKey,
      dto,
      user,
    );
  }

  @Patch(':providerKey')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  update(
    @Param('providerKey') providerKey: string,
    @Body() dto: UpdateIntegrationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlatformIntegrationResponseDto> {
    return this.integrationsService.updatePlatformIntegration(
      providerKey,
      dto,
      user,
    );
  }

  @Delete(':providerKey')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  remove(
    @Param('providerKey') providerKey: string,
    @Query() _query: ConfirmDeleteQueryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.integrationsService.deletePlatformIntegration(providerKey, user);
  }
}
