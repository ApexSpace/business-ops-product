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
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
} from '../dto/canned-response.dto';
import { CannedResponsesService } from '../services/canned-responses.service';

@ApiTags('canned-responses')
@ApiBearerAuth()
@Controller('canned-responses')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('conversations')
export class CannedResponsesController {
  constructor(
    private readonly cannedResponsesService: CannedResponsesService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser) {
    return this.cannedResponsesService.list(user.businessId!);
  }

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCannedResponseDto,
  ) {
    return this.cannedResponsesService.create(user.businessId!, dto, user);
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCannedResponseDto,
  ) {
    return this.cannedResponsesService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.cannedResponsesService.remove(user.businessId!, id, user);
  }
}
