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
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CreateContactDto } from '../dto/create-contact.dto';
import { ListContactsQueryDto } from '../dto/list-contacts-query.dto';
import { MergeContactsDto } from '../dto/merge-contacts.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { ContactsService } from '@app/modules/crm/contacts/services/contacts.service';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('contacts')
@StaffPermission('contacts.access', 'contacts.view_last_names')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('contacts.manage')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user.businessId!, dto, user);
  }

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('contacts.view_last_names')
  list(@CurrentUser() user: RequestUser, @Query() query: ListContactsQueryDto) {
    return this.contactsService.list(user.businessId!, query, user);
  }

  @Get(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('contacts.access')
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contactsService.getById(user.businessId!, id, user);
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('contacts.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user.businessId!, id, dto, user);
  }

  @Post(':id/merge')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('contacts.delete_merge')
  merge(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeContactsDto,
  ) {
    return this.contactsService.merge(
      user.businessId!,
      id,
      dto.mergeContactId,
      user,
    );
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
  @StaffPermission('contacts.delete_merge')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConfirmDeleteQueryDto,
  ) {
    return this.contactsService.remove(user.businessId!, id, user);
  }
}
