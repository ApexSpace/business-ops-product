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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import {
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
} from '../dto/canned-response.dto';
import { CannedResponsesService } from '../services/canned-responses.service';

const PLATFORM_CONVERSATIONS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-canned-responses')
@ApiBearerAuth()
@Controller('platform/canned-responses')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_CONVERSATIONS_ROLES)
export class PlatformCannedResponsesController {
  constructor(
    private readonly cannedResponsesService: CannedResponsesService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Get()
  async list() {
    const businessId = await this.internalBusiness.getId();
    return this.cannedResponsesService.list(businessId);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCannedResponseDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.cannedResponsesService.create(businessId, dto, user);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCannedResponseDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.cannedResponsesService.update(businessId, id, dto, user);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.cannedResponsesService.remove(businessId, id, user);
  }
}
