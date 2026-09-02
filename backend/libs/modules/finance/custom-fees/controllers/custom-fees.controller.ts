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
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateCustomFeeDto,
  ListCustomFeesQueryDto,
  UpdateCustomFeeDto,
} from '../dto/custom-fee.dto';
import { CustomFeesService } from '../services/custom-fees.service';

const READ_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

const WRITE_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
] as const;

@ApiTags('custom-fees')
@ApiBearerAuth()
@Controller('custom-fees')
@UseGuards(BusinessRolesGuard)
export class CustomFeesController {
  constructor(private readonly customFeesService: CustomFeesService) {}

  @Get()
  @BusinessRoles(...READ_ROLES)
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListCustomFeesQueryDto,
  ) {
    return this.customFeesService.list(user.businessId!, query);
  }

  @Get(':id')
  @BusinessRoles(...READ_ROLES)
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customFeesService.get(user.businessId!, id);
  }

  @Post()
  @BusinessRoles(...WRITE_ROLES)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCustomFeeDto) {
    return this.customFeesService.create(user.businessId!, dto, user);
  }

  @Patch(':id')
  @BusinessRoles(...WRITE_ROLES)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFeeDto,
  ) {
    return this.customFeesService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(...WRITE_ROLES)
  delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConfirmDeleteQueryDto,
  ) {
    return this.customFeesService.delete(user.businessId!, id, user);
  }
}
