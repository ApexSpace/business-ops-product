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
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { AssignLeadDto } from '../dto/assign-lead.dto';
import { CreateLeadFromContactDto } from '../dto/create-lead-from-contact.dto';
import { ListLeadsQueryDto } from '../dto/list-leads-query.dto';
import { MoveLeadStageDto } from '../dto/move-lead-stage.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { LeadsService } from '@app/modules/crm/leads/services/leads.service';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(BusinessRolesGuard)
@StaffPermission('pipelines.access')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser, @Query() query: ListLeadsQueryDto) {
    return this.leadsService.list(user.businessId!, query);
  }

  @Post('from-contact/:contactId')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('pipelines.manage')
  createFromContact(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: CreateLeadFromContactDto,
  ) {
    return this.leadsService.createFromContact(
      user.businessId!,
      contactId,
      dto,
      user,
    );
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
    return this.leadsService.getById(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('pipelines.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(user.businessId!, id, dto, user);
  }

  @Patch(':id/stage')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('pipelines.manage')
  moveStage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveLeadStageDto,
  ) {
    return this.leadsService.moveStage(user.businessId!, id, dto, user);
  }

  @Patch(':id/assign')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @StaffPermission('pipelines.manage')
  assign(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leadsService.assign(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  @StaffPermission('pipelines.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.leadsService.remove(user.businessId!, id, user);
  }
}
