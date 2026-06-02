import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '../../common/dto/confirm-delete-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { BusinessRoles } from '../../common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '../../common/guards/business-roles.guard';
import {
  BusinessIntegrationResponseDto,
  ConnectIntegrationDto,
  UpdateIntegrationDto,
} from './dto/integration.dto';
import { IntegrationsService } from './integrations.service';
import { WhatsAppEmbeddedSignupCompleteDto } from './meta/dto/whatsapp-embedded-signup.dto';
import { MetaEmbeddedSignupService } from './meta/services/meta-embedded-signup.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/business')
@UseGuards(BusinessRolesGuard)
export class BusinessIntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly metaEmbeddedSignupService: MetaEmbeddedSignupService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
  ): Promise<BusinessIntegrationResponseDto[]> {
    return this.integrationsService.listBusinessIntegrations(user.businessId!);
  }

  @Get(':providerKey')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
  ): Promise<BusinessIntegrationResponseDto> {
    return this.integrationsService.getBusinessIntegration(
      user.businessId!,
      providerKey,
    );
  }

  @Post('whatsapp/embedded-signup/complete')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  async whatsappEmbeddedSignupComplete(
    @CurrentUser() user: RequestUser,
    @Body() dto: WhatsAppEmbeddedSignupCompleteDto,
  ): Promise<{ success: true }> {
    await this.metaEmbeddedSignupService.completeEmbeddedSignup(
      user.businessId!,
      user.id,
      dto,
    );
    return { success: true };
  }

  @Post(':providerKey/connect')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  connect(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Body() dto: ConnectIntegrationDto,
  ): Promise<BusinessIntegrationResponseDto> {
    return this.integrationsService.connectBusinessIntegration(
      user.businessId!,
      providerKey,
      dto,
      user,
    );
  }

  @Patch(':providerKey')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Body() dto: UpdateIntegrationDto,
  ): Promise<BusinessIntegrationResponseDto> {
    return this.integrationsService.updateBusinessIntegration(
      user.businessId!,
      providerKey,
      dto,
      user,
    );
  }

  @Delete(':providerKey')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ): Promise<void> {
    return this.integrationsService.deleteBusinessIntegration(
      user.businessId!,
      providerKey,
      user,
    );
  }
}
