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
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CreateEstimateDto } from '../dto/create-estimate.dto';
import { ListEstimatesQueryDto } from '../dto/list-estimates-query.dto';
import { UpdateEstimateDto } from '../dto/update-estimate.dto';
import { UpdateEstimateStatusDto } from '../dto/update-estimate-status.dto';
import { EstimatesService } from '@app/modules/finance/estimates/services/estimates.service';

@ApiTags('estimates')
@ApiBearerAuth()
@Controller('estimates')
@UseGuards(BusinessRolesGuard)
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateEstimateDto) {
    return this.estimatesService.create(user.businessId!, dto, user);
  }

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser, @Query() query: ListEstimatesQueryDto) {
    return this.estimatesService.list(user.businessId!, query);
  }

  @Get(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.estimatesService.getById(user.businessId!, id);
  }

  @Patch(':id/status')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstimateStatusDto,
  ) {
    return this.estimatesService.updateStatus(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Post(':id/duplicate')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  duplicate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.estimatesService.duplicate(user.businessId!, id, user);
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
    @Body() dto: UpdateEstimateDto,
  ) {
    return this.estimatesService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.estimatesService.remove(user.businessId!, id, user);
  }
}
