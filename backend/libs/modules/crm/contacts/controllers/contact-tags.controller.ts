import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CreateTagDto } from '../dto/create-tag.dto';
import { ContactTagsService } from '@app/modules/crm/contacts/services/contact-tags.service';

@ApiTags('contact-tags')
@ApiBearerAuth()
@Controller('contact-tags')
@UseGuards(BusinessRolesGuard)
@StaffPermission('contacts.access', 'contacts.view_last_names')
export class ContactTagsController {
  constructor(private readonly contactTagsService: ContactTagsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser) {
    return this.contactTagsService.list(user.businessId!);
  }

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('contacts.manage')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTagDto) {
    return this.contactTagsService.create(user.businessId!, dto, user);
  }
}
