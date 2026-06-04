import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { buildJobOnlyAcceptedResponse } from '@app/common/utils/async-job-response.util';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  IntegrationResourceResponseDto,
  IntegrationResourcesListResponseDto,
  UpdateIntegrationResourceDto,
} from './dto/integration-resource.dto';
import { IntegrationResourcesService } from './services/integration-resources.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/business/:providerKey/resources')
@UseGuards(BusinessRolesGuard)
export class BusinessIntegrationResourcesController {
  constructor(
    private readonly integrationResourcesService: IntegrationResourcesService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
  ): Promise<IntegrationResourcesListResponseDto> {
    return this.integrationResourcesService.listResources(
      user.businessId!,
      providerKey,
    );
  }

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  async sync(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const { asyncJob } =
      await this.integrationResourcesService.enqueueSyncResources(
        user.businessId!,
        providerKey,
        user.id,
        idempotencyKey,
      );
    return buildJobOnlyAcceptedResponse(asyncJob, user.businessId!);
  }

  @Patch(':resourceId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateIntegrationResourceDto,
  ): Promise<IntegrationResourceResponseDto> {
    return this.integrationResourcesService.updateResource(
      user.businessId!,
      providerKey,
      resourceId,
      dto,
    );
  }

  @Post(':resourceId/select')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  select(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    return this.integrationResourcesService.selectResource(
      user.businessId!,
      providerKey,
      resourceId,
    );
  }

  @Post(':resourceId/unselect')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  unselect(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    return this.integrationResourcesService.unselectResource(
      user.businessId!,
      providerKey,
      resourceId,
    );
  }

  @Post(':resourceId/make-default')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  makeDefault(
    @CurrentUser() user: RequestUser,
    @Param('providerKey') providerKey: string,
    @Param('resourceId') resourceId: string,
  ): Promise<IntegrationResourceResponseDto> {
    return this.integrationResourcesService.makeDefaultResource(
      user.businessId!,
      providerKey,
      resourceId,
    );
  }
}
