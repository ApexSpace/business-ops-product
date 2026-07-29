import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { ListContactsQueryDto } from '../dto/list-contacts-query.dto';
import { ContactsService } from '../services/contacts.service';

const PLATFORM_CONTACTS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-contacts')
@ApiBearerAuth()
@Controller('platform/contacts')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_CONTACTS_ROLES)
export class PlatformContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateContactDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.contactsService.create(businessId, dto, user);
  }

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListContactsQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.contactsService.list(businessId, query, user);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.contactsService.getById(businessId, id, user);
  }
}
